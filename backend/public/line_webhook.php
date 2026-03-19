<?php
declare(strict_types=1);

// ==============================
// DEBUG LOG (safe location)
// ==============================
function line_debug_log(string $label, array $data = []): void
{
    // บนบางเครื่อง sys_get_temp_dir() อาจชี้ไปที่โฟลเดอร์ที่ Apache เขียนไม่ได้
    $candidates = [
        // โฟลเดอร์นี้อยู่ใน web root แต่ใช้สำหรับเก็บไฟล์ฝั่งเซิร์ฟเวอร์ (ควรมี .htaccess กันอ่าน)
        __DIR__ . '/uploads/_logs',
        __DIR__ . '/uploads',
        '/tmp',
        sys_get_temp_dir(),
        __DIR__,
    ];

    $dir = null;
    foreach ($candidates as $d) {
        if (is_string($d) && $d !== '' && is_dir($d) && is_writable($d)) {
            $dir = $d;
            break;
        }
    }

    if ($dir === null) {
        return;
    }

    $file = rtrim($dir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'ict8_line_webhook_' . date('Ymd') . '.log';
    @file_put_contents(
        $file,
        date('c') . "\t" . $label . "\t" . json_encode($data, JSON_UNESCAPED_UNICODE) . "\n",
        FILE_APPEND
    );
}

// ==============================
// 0) READ RAW BODY (ONCE)
// ==============================
$rawBody = file_get_contents('php://input');   // อ่านครั้งเดียวเท่านั้น
$signature = $_SERVER['HTTP_X_LINE_SIGNATURE'] ?? '';

if (!$signature) {
    $headers = getallheaders();
    $signature = $headers['X-Line-Signature'] ?? $headers['x-line-signature'] ?? '';
}

// ==============================
// 1) LOAD SECRET (NO OUTPUT!)
// ==============================
require_once __DIR__ . '/../config/env.php';

env_load(__DIR__ . '/../.env');

$channelSecret = getenv('LINE_CHANNEL_SECRET') ?: '';
if ($channelSecret === '') {
    http_response_code(500);
    line_debug_log('missing_channel_secret');
    exit('Missing secret');
}

// ==============================
// 2) VERIFY FROM RAW BODY
// ==============================
$computed = base64_encode(
    hash_hmac('sha256', $rawBody, $channelSecret, true)
);

if (!hash_equals($computed, $signature)) {
    // DEBUG: ดูเฉพาะตอนทดสอบ แล้วลบทิ้งภายหลัง
    line_debug_log('invalid_signature', [
        'len' => strlen($rawBody),
        'sig' => $signature,
        'cmp' => $computed,
        'ua' => $_SERVER['HTTP_USER_AGENT'] ?? null,
    ]);
    http_response_code(401);
    exit('Invalid signature');
}

// ==============================
// 3) PARSE & PROCESS FIRST (ก่อน ACK)
// ==============================
// ให้โค้ดหลังบ้านทำงานได้เต็มที่
@ignore_user_abort(true);
@set_time_limit(0);

// ==============================
// 4) PROCESS AFTER VERIFY
// ==============================
$data = json_decode($rawBody, true);
if (!isset($data['events'])) {
    exit;
}

// include หลัง verify เท่านั้น
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../models/UserModel.php';
require_once __DIR__ . '/../models/UserRoleModel.php';
require_once __DIR__ . '/../models/PersonModel.php';
require_once __DIR__ . '/../models/RequestTypeModel.php';
require_once __DIR__ . '/../services/LineService.php';

$accessToken = getenv('LINE_CHANNEL_ACCESS_TOKEN') ?: '';
$rmBefore = getenv('LINE_RICHMENU_BEFORE') ?: '';
$rmInternal = getenv('LINE_RICHMENU_INTERNAL') ?: '';
$rmExternal = getenv('LINE_RICHMENU_EXTERNAL') ?: '';

$line = new LineService($accessToken);

// DB อาจล่ม/สิทธิ์ไม่ถูก ต้องไม่ทำให้ webhook เงียบ
$pdo = null;
$userModel = null;
$userRoleModel = null;
$personModel = null;
$requestTypeModel = null;

try {
    $pdo = db();
    $userModel = new UserModel($pdo);
    $userRoleModel = new UserRoleModel($pdo);
    $personModel = new PersonModel($pdo);
    $requestTypeModel = new RequestTypeModel($pdo);
} catch (Throwable $e) {
    line_debug_log('db_connect_failed', [
        'error' => $e->getMessage(),
    ]);
}

// ==============================
// 5) LOOP EVENTS
// ==============================
foreach ($data['events'] as $event) {

    $type = $event['type'] ?? '';
    $userId = $event['source']['userId'] ?? null;
    if (!$userId)
        continue;

    // ----- user + role + approval -----
    // แนวคิดเดียวกับ AuthController:
    // - ถ้า person.is_active != 1 => ถือว่ายังไม่อนุมัติ => ต้องอยู่เมนู before_login
    // - ถ้าอนุมัติแล้วค่อย map role -> internal/external
    $roleCode = 'GUEST';
    $isApproved = false;

    $user = null;
    if ($userModel && $userRoleModel && $personModel) {
        $user = $userModel->findByLineUserId($userId);

        if ($user) {
            // approved?
            try {
                $person = $personModel->findByUserId((int)($user['user_id'] ?? 0));
                $isApproved = ((int)($person['is_active'] ?? 0) === 1);
            } catch (Throwable $e) {
                $isApproved = false;
            }

            // role
            if (!empty($user['user_role_id'])) {
                try {
                    $roleRow = $userRoleModel->getById((int) $user['user_role_id']);
                    $roleCode = strtoupper((string) ($roleRow['code'] ?? 'EXTERNAL'));
                } catch (Throwable $e) {
                    $roleCode = 'EXTERNAL';
                }
            }
        }
    }

    // ----- richmenu switch -----
    // NOTE:
    // - ใน DB role code ปัจจุบันใช้ชุดเช่น ADMIN/STAFF/USER
    // - แต่โค้ดเดิมเช็ค INTERNAL/EXTERNAL ทำให้ role=USER ไม่เข้าเงื่อนไข => ตกไป rmBefore
    //   ผลคือกด postback (เช่น ext:support) แล้ว rich menu เด้งกลับ before_login
    $target = $rmBefore;
    $internalRoleCodes = ['INTERNAL', 'ADMIN', 'STAFF'];
    $externalRoleCodes = ['EXTERNAL', 'USER'];

    if ($isApproved) {
        if (in_array($roleCode, $internalRoleCodes, true)) {
            $target = $rmInternal;
        } elseif (in_array($roleCode, $externalRoleCodes, true)) {
            $target = $rmExternal;
        }
    }
    if ($target !== '') {
        // ใช้ setUserRichMenu เพื่อให้ได้ผลลัพธ์ที่แน่นอนและจัดการ edge case
        $linkResp = $line->setUserRichMenu($userId, $target);
        
        // Log ผลลัพธ์
        line_debug_log('richmenu_link', [
            'userId' => $userId,
            'target' => $target,
            'ok' => $linkResp['ok'] ?? false,
            'step' => $linkResp['step'] ?? null,
            'http' => $linkResp['http'] ?? null,
            'response' => $linkResp,
        ]);
        
        // ถ้า link ไม่สำเร็จ ยัง pass ต่อ (ไม่ block webhook) แต่ log ไว้เพื่อการ debug
        if (!($linkResp['ok'] ?? false)) {
            line_debug_log('richmenu_link_failed', [
                'userId' => $userId,
                'target' => $target,
                'fullResponse' => $linkResp,
            ]);
        }
    }

    // debug: เห็นว่ามี event เข้ามาจริงไหม
    $eventLog = [
        'type' => $type,
        'role' => $roleCode,
        'approved' => $isApproved,
        'hasReplyToken' => isset($event['replyToken']),
        'msgType' => $event['message']['type'] ?? null,
    ];
    if ($type === 'message') {
        $eventLog['text'] = $event['message']['text'] ?? null;
    }
    if ($type === 'postback') {
        $eventLog['postback'] = $event['postback']['data'] ?? null;
    }
    line_debug_log('event', $eventLog);

    // ----- follow -----
    if ($type === 'follow' && isset($event['replyToken'])) {
        $line->replyMessage($event['replyToken'], [
            [
                'type' => 'text',
                'text' => "สวัสดีค่ะ 😊\nยินดีต้อนรับสู่ ICT8\nกรุณาแตะเมนู “เข้าสู่ระบบ”"
            ]
        ]);
    }

    // ===== Handler กลาง: external menu actions =====
    $handleExternal = function ($action) use ($line, $event, $requestTypeModel) {

        if (!isset($event['replyToken'])) {
            return;
        }

        // log เฉพาะกรณี reply ไป LINE ไม่สำเร็จ (กันอาการเงียบ)
        $reply = function (array $messages) use ($line, $event): void {
            // Log message ที่จะส่ง
            line_debug_log('sending_reply', [
                'replyToken' => mb_strimwidth((string) ($event['replyToken'] ?? ''), 0, 20, '...'),
                'messageCount' => count($messages),
                'messageTypes' => array_map(fn($m) => $m['type'] ?? 'unknown', $messages),
            ]);
            
            $resp = $line->replyMessage($event['replyToken'], $messages);
            
            line_debug_log('reply_response', [
                'ok' => $resp['ok'] ?? false,
                'http' => $resp['http'] ?? null,
                'data' => $resp['data'] ?? null,
                'raw' => mb_strimwidth((string) ($resp['raw'] ?? ''), 0, 500, '...'),
            ]);
            
            if (!($resp['ok'] ?? false)) {
                line_debug_log('reply_failed', [
                    'http' => $resp['http'] ?? null,
                    'url' => $resp['url'] ?? null,
                    'method' => $resp['method'] ?? null,
                    'raw' => $resp['raw'] ?? null,
                    'data' => $resp['data'] ?? null,
                    'error' => $resp['error'] ?? null,
                ]);
            }
        };

        // =============================
        // ขอสนับสนุน (Dynamic จาก DB)
        // =============================
        if ($action === 'ext:support') {

            $ICT8_PURPLE = '#532274';
            $TEXT_MUTED = '#6B7280';

            // 👉 ดึงจาก DB (ถ้า DB ใช้งานได้)
            $items = [];
            if ($requestTypeModel) {
                try {
                    $items = $requestTypeModel->list('', 1, 200);
                } catch (Throwable $e) {
                    line_debug_log('request_type_list_failed', [
                        'error' => $e->getMessage(),
                    ]);
                    $items = [];
                }
            }

            $buttons = [];

            foreach ($items as $it) {

                $label = trim((string) ($it['type_name'] ?? ''));
                $url = trim((string) ($it['url_link'] ?? ''));

                if ($label === '')
                    continue;

                // ใช้ URI ไป LIFF / ฟอร์ม
                if ($url !== '') {
                    $buttons[] = [
                        'type' => 'button',
                        'style' => 'secondary',
                        'height' => 'md',
                        'margin' => empty($buttons) ? 'lg' : 'md',
                        'action' => [
                            'type' => 'uri',
                            'label' => mb_strimwidth($label, 0, 20, '...'),
                            'uri' => $url,
                        ]
                    ];
                }
            }

            // Fallback: ถ้า DB ดึงไม่ได้/ว่าง ให้แสดง 3 ปุ่มหลักแบบคงที่
            if (!$buttons) {
                $basePath = getenv('BASE_PATH') ?: '/ict8';
                $host = $_SERVER['HTTP_HOST'] ?? '';
                $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
                $scheme = $https ? 'https' : 'http';
                $publicBase = $host !== '' ? ($scheme . '://' . $host . $basePath) : $basePath;

                $fallback = [
                    ['label' => 'ขอสนับสนุนห้องประชุม', 'path' => '/gcms/request-conference.html'],
                    ['label' => 'แจ้งเสีย/ซ่อมอุปกรณ์', 'path' => '/gcms/request-repair.html'],
                    ['label' => 'ขอใช้บริการอื่น ๆ', 'path' => '/gcms/request-other.html'],
                ];

                foreach ($fallback as $fb) {
                    $buttons[] = [
                        'type' => 'button',
                        'style' => 'secondary',
                        'height' => 'md',
                        'margin' => empty($buttons) ? 'lg' : 'md',
                        'action' => [
                            'type' => 'uri',
                            'label' => mb_strimwidth((string) $fb['label'], 0, 20, '...'),
                            'uri' => $publicBase . $fb['path'],
                        ]
                    ];
                }
            }

            // ถ้ายังไม่มีจริง ๆ (ทั้ง DB และ fallback สร้างไม่ได้)
            if (!$buttons) {
                $buttons[] = [
                    'type' => 'text',
                    'text' => 'ไม่สามารถแสดงเมนูคำขอได้ในขณะนี้',
                    'wrap' => true,
                    'margin' => 'lg',
                    'color' => $TEXT_MUTED,
                ];
            }

            // 👉 Flex Bubble
            $flex = [
                'type' => 'flex',
                'altText' => 'เมนูการขอสนับสนุน',
                'contents' => [
                    'type' => 'bubble',
                    'size' => 'mega',
                    'body' => [
                        'type' => 'box',
                        'layout' => 'vertical',
                        'spacing' => 'md',
                        'paddingAll' => '20px',
                        'backgroundColor' => '#FFFFFF',
                        'contents' => array_merge(
                            [
                                [
                                    'type' => 'text',
                                    'text' => 'การขอสนับสนุน',
                                    'weight' => 'bold',
                                    'size' => 'xl',
                                    'color' => $ICT8_PURPLE,
                                ],
                                [
                                    'type' => 'separator',
                                    'margin' => 'lg',
                                    'color' => '#E5E7EB',
                                ],
                            ],
                            $buttons
                        ),
                    ],
                ],
            ];

            // Log Flex structure ก่อนส่ง
            line_debug_log('flex_message_structure', [
                'action' => $action,
                'buttonCount' => count($buttons),
                'flexJSON' => json_encode($flex, JSON_UNESCAPED_UNICODE),
            ]);

            $reply([$flex]);
            return;
        }

        // =============================
        // ติดตามสถานะ (เดิม)
        // =============================
        if ($action === 'ext:track') {
            $ICT8_PURPLE = '#532274';
            $TEXT_MUTED = '#6B7280';

            // สร้าง public base (รองรับ reverse proxy/ngrok)
            $basePath = getenv('BASE_PATH') ?: '/ict8';
            $basePath = '/' . ltrim((string) $basePath, '/');
            $basePath = rtrim($basePath, '/');

            $host = $_SERVER['HTTP_X_FORWARDED_HOST'] ?? ($_SERVER['HTTP_HOST'] ?? '');
            $proto = $_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '';
            $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || strtolower((string) $proto) === 'https';
            $scheme = $https ? 'https' : 'http';
            $publicBase = $host !== '' ? ($scheme . '://' . $host . $basePath) : $basePath;

            $links = [
                [
                    'label' => 'ติดตามสถานะคำขอ',
                    'uri' => $publicBase . '/tracking_status/tracking_request.html',
                ],
                [
                    'label' => 'ติดตามสถานะงาน',
                    'uri' => $publicBase . '/tracking_status/tracking_event.html',
                ],
            ];

            $buttons = [];
            foreach ($links as $lnk) {
                $buttons[] = [
                    'type' => 'button',
                    'style' => 'secondary',
                    'height' => 'md',
                    'margin' => empty($buttons) ? 'lg' : 'md',
                    'action' => [
                        'type' => 'uri',
                        'label' => mb_strimwidth((string) $lnk['label'], 0, 20, '...'),
                        'uri' => (string) $lnk['uri'],
                    ]
                ];
            }

            $flex = [
                'type' => 'flex',
                'altText' => 'เมนูติดตามสถานะ',
                'contents' => [
                    'type' => 'bubble',
                    'size' => 'mega',
                    'body' => [
                        'type' => 'box',
                        'layout' => 'vertical',
                        'spacing' => 'md',
                        'paddingAll' => '20px',
                        'backgroundColor' => '#FFFFFF',
                        'contents' => array_merge(
                            [
                                [
                                    'type' => 'text',
                                    'text' => 'ติดตามสถานะ',
                                    'weight' => 'bold',
                                    'size' => 'xl',
                                    'color' => $ICT8_PURPLE,
                                ],
                                [
                                    'type' => 'text',
                                    'text' => 'กรุณาเลือกเมนูที่ต้องการติดตาม',
                                    'wrap' => true,
                                    'margin' => 'sm',
                                    'color' => $TEXT_MUTED,
                                    'size' => 'sm',
                                ],
                                [
                                    'type' => 'separator',
                                    'margin' => 'lg',
                                    'color' => '#E5E7EB',
                                ],
                            ],
                            $buttons
                        ),
                    ],
                ],
            ];

            // Log Flex structure ก่อนส่ง
            line_debug_log('flex_message_structure', [
                'action' => $action,
                'buttonCount' => count($buttons),
                'flexJSON' => json_encode($flex, JSON_UNESCAPED_UNICODE),
            ]);

            $reply([$flex]);
            return;
        }
    };


    // ===== 6) Postback =====
    if ($type === 'postback') {
        $postback = $event['postback']['data'] ?? '';

        // external actions
        if (in_array($postback, ['ext:support', 'ext:track'], true)) {
            $handleExternal($postback);
            continue;
        }

        // ประเภทคำขอเดิม
        if (in_array($postback, ['req_meeting', 'req_repair', 'req_other'], true) && isset($event['replyToken'])) {
            $map = [
                'req_meeting' => 'คุณเลือก: ขอสนับสนุนห้องประชุม',
                'req_repair' => 'คุณเลือก: แจ้งเสีย/แจ้งซ่อม',
                'req_other' => 'คุณเลือก: อื่นๆ'
            ];
            $line->replyMessage($event['replyToken'], [
                [
                    'type' => 'text',
                    'text' => ($map[$postback] ?? 'รับเรื่องแล้วค่ะ') . "\n(ขั้นถัดไป: จะพาไปกรอกข้อมูล/สร้างคำขอในระบบ)"
                ]
            ]);
            continue;
        }
    }

    // ===== 7) Message text =====
    if ($type === 'message' && isset($event['replyToken'])) {
        $msg = trim((string) ($event['message']['text'] ?? ''));
        // normalize ช่องว่าง (กันผู้ใช้พิมพ์มีเว้นวรรคแปลก ๆ)
        $msg = preg_replace('/\s+/u', ' ', $msg);

        // =============================
        // INTERNAL shortcut: "หน้าหลัก" -> ปุ่มไปหน้า index.html
        // =============================
        if (preg_match('/^หน้าหลัก$/u', $msg)) {
            if ($roleCode === 'INTERNAL' || $roleCode === 'ADMIN') {
                $ICT8_PURPLE = '#532274';
                $TEXT_MUTED = '#6B7280';

                // สร้าง public base (รองรับ reverse proxy/ngrok)
                $basePath = getenv('BASE_PATH') ?: '/ict8';
                $basePath = '/' . ltrim((string) $basePath, '/');
                $basePath = rtrim($basePath, '/');

                $host = $_SERVER['HTTP_X_FORWARDED_HOST'] ?? ($_SERVER['HTTP_HOST'] ?? '');
                $proto = $_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '';
                $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || strtolower((string) $proto) === 'https';
                $scheme = $https ? 'https' : 'http';
                $publicBase = $host !== '' ? ($scheme . '://' . $host . $basePath) : $basePath;

                $flex = [
                    'type' => 'flex',
                    'altText' => 'เข้าสู่หน้าหลัก',
                    'contents' => [
                        'type' => 'bubble',
                        'size' => 'mega',
                        'body' => [
                            'type' => 'box',
                            'layout' => 'vertical',
                            'spacing' => 'md',
                            'paddingAll' => '20px',
                            'backgroundColor' => '#FFFFFF',
                            'contents' => [
                                [
                                    'type' => 'text',
                                    'text' => 'หน้าหลัก',
                                    'weight' => 'bold',
                                    'size' => 'xl',
                                    'color' => $ICT8_PURPLE,
                                ],
                                [
                                    'type' => 'text',
                                    'text' => 'กดปุ่มด้านล่างเพื่อเข้าสู่หน้าหลัก',
                                    'wrap' => true,
                                    'margin' => 'sm',
                                    'color' => $TEXT_MUTED,
                                    'size' => 'sm',
                                ],
                                [
                                    'type' => 'separator',
                                    'margin' => 'lg',
                                    'color' => '#E5E7EB',
                                ],
                                [
                                    'type' => 'button',
                                    'style' => 'secondary',
                                    'height' => 'md',
                                    'margin' => 'lg',
                                    'action' => [
                                        'type' => 'uri',
                                        'label' => 'เข้าสู่หน้าหลัก',
                                        'uri' => $publicBase . '/index.html',
                                    ]
                                ],
                            ],
                        ],
                    ],
                ];

                $line->replyMessage($event['replyToken'], [$flex]);
            } else {
                // เงียบหรือแจ้งเตือนก็ได้ — เลือกแจ้งแบบสุภาพ
                $line->replyMessage($event['replyToken'], [
                    [
                        'type' => 'text',
                        'text' => 'คำสั่งนี้สำหรับเจ้าหน้าที่ภายในเท่านั้นค่ะ',
                    ]
                ]);
            }
            continue;
        }

        $textToExternal = [
            'ขอสนับสนุน' => 'ext:support',
            'ขอรับการสนับสนุน' => 'ext:support',
            'การขอสนับสนุน' => 'ext:support',
            'ติดตามสถานะ' => 'ext:track',
        ];

        // ให้พิมพ์เรียกเมนูได้ทุก role (รวมถึง GUEST)
        if (isset($textToExternal[$msg])) {
            $handleExternal($textToExternal[$msg]);
            continue;
        }

        // จับแบบไม่ต้องตรงเป๊ะ (เช่น "ขอสนับสนุนครับ" / "ขอรับการสนับสนุนหน่อย")
        if (preg_match('/ขอ\s*(?:รับ\s*)?การ?\s*สนับสนุน/iu', $msg)) {
            $handleExternal('ext:support');
            continue;
        }
        if (preg_match('/ติดตาม\s*สถานะ/iu', $msg)) {
            $handleExternal('ext:track');
            continue;
        }

        if ($msg === 'เมนู' || $msg === 'menu') {
            $line->replyMessage($event['replyToken'], [
                [
                    'type' => 'text',
                    'text' => 'แสดงเมนูด้านล่างได้เลยค่ะ 👇'
                ]
            ]);
            continue;
        }
    }
}

// ==============================
// 8) ACK LAST (หลังประมวลผลเสร็จ)
// ==============================
http_response_code(200);
echo 'OK';


<?php
declare(strict_types=1);

// ==============================
// 0) READ RAW BODY (ONCE)
// ==============================
$rawBody = file_get_contents('php://input');   // อ่านครั้งเดียวเท่านั้น
$signature = $_SERVER['HTTP_X_LINE_SIGNATURE'] ?? '';

// ==============================
// 1) LOAD SECRET (NO OUTPUT!)
// ==============================
require_once __DIR__ . '/../config/env.php';

env_load(__DIR__ . '/../.env');

$channelSecret = getenv('LINE_CHANNEL_SECRET') ?: '';
if ($channelSecret === '') {
    http_response_code(500);
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
    file_put_contents(
        __DIR__ . '/debug_line.txt',
        "LEN=" . strlen($rawBody) . "\n" .
        "SIG=" . $signature . "\n" .
        "CMP=" . $computed . "\n\n",
        FILE_APPEND
    );
    http_response_code(401);
    exit('Invalid signature');
}

// ==============================
// 3) ACK FIRST (VERY IMPORTANT)
// ==============================
http_response_code(200);
echo 'OK';

// ให้ LINE ได้ 200 ก่อน แล้วค่อยทำงานต่อ
if (function_exists('fastcgi_finish_request')) {
    fastcgi_finish_request();
}

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
require_once __DIR__ . '/../models/RequestTypeModel.php';
require_once __DIR__ . '/../services/LineService.php';

$accessToken = getenv('LINE_CHANNEL_ACCESS_TOKEN') ?: '';
$rmBefore = getenv('LINE_RICHMENU_BEFORE') ?: '';
$rmInternal = getenv('LINE_RICHMENU_INTERNAL') ?: '';
$rmExternal = getenv('LINE_RICHMENU_EXTERNAL') ?: '';

$line = new LineService($accessToken);

try {
    $pdo = db();
} catch (Throwable $e) {
    exit;
}

$userModel = new UserModel($pdo);
$userRoleModel = new UserRoleModel($pdo);
$requestTypeModel = new RequestTypeModel($pdo);

// ==============================
// 5) LOOP EVENTS
// ==============================
foreach ($data['events'] as $event) {

    $type = $event['type'] ?? '';
    $userId = $event['source']['userId'] ?? null;
    if (!$userId)
        continue;

    // ----- role -----
    $user = $userModel->findByLineUserId($userId);
    $roleCode = 'GUEST';

    if ($user && !empty($user['user_role_id'])) {
        try {
            $roleRow = $userRoleModel->getById((int) $user['user_role_id']);
            $roleCode = strtoupper((string) ($roleRow['code'] ?? 'EXTERNAL'));
        } catch (Throwable $e) {
            $roleCode = 'EXTERNAL';
        }
    }

    // ----- richmenu switch -----
    $target = $rmBefore;
    if ($roleCode === 'INTERNAL' || $roleCode === 'ADMIN') {
        $target = $rmInternal;
    } elseif ($roleCode === 'EXTERNAL') {
        $target = $rmExternal;
    }
    if ($target !== '') {
        $line->linkRichMenuToUser($userId, $target);
    }

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

        if (!isset($event['replyToken']))
            return;

        // =============================
        // ขอสนับสนุน (Dynamic จาก DB)
        // =============================
        if ($action === 'ext:support') {

            $ICT8_PURPLE = '#532274';
            $TEXT_MUTED = '#6B7280';

            // 👉 ดึงจาก DB
            $items = $requestTypeModel->list('', 1, 200);

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

            // ถ้าไม่มีใน DB
            if (!$buttons) {
                $buttons[] = [
                    'type' => 'text',
                    'text' => 'ยังไม่มีประเภทคำขอในระบบ',
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

            $line->replyMessage($event['replyToken'], [$flex]);
            return;
        }

        // =============================
        // ติดตามสถานะ (เดิม)
        // =============================
        if ($action === 'ext:track') {
            $line->replyMessage($event['replyToken'], [
                [
                    'type' => 'text',
                    'text' => "🔎 ติดตามสถานะ\nกรุณาพิมพ์ “เลขคำขอ” หรือ “รหัสติดตาม” ที่ได้รับค่ะ"
                ]
            ]);
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

        $textToExternal = [
            'ขอสนับสนุน' => 'ext:support',
            'ติดตามสถานะ' => 'ext:track',
        ];

        if (($roleCode === 'INTERNAL' || $roleCode === 'ADMIN' || $roleCode === 'EXTERNAL') && isset($textToExternal[$msg])) {
            $handleExternal($textToExternal[$msg]);
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

http_response_code(200);
echo "OK";

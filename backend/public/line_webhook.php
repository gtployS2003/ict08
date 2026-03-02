<?php
// 🚨 STEP 1: อ่าน RAW BODY ก่อน
$body = file_get_contents('php://input');

if ($body === '' || $body === false) {
    $body = file_get_contents('php://stdin');
}

$signature = $_SERVER['HTTP_X_LINE_SIGNATURE'] ?? '';

// 🚨 STEP 2: โหลด SECRET อย่างเดียว (ยังไม่ include อะไร)
require_once __DIR__ . '/../config/env.php';
env_load(__DIR__ . '/../.env');

$CHANNEL_SECRET = getenv('LINE_CHANNEL_SECRET') ?: '';

if ($CHANNEL_SECRET === '') {
    http_response_code(500);
    exit('Missing secret');
}

// 🚨 STEP 3: VERIFY
$hash = base64_encode(hash_hmac('sha256', $body, $CHANNEL_SECRET, true));

if (!hash_equals($hash, $signature)) {
    file_put_contents(
        __DIR__ . '/debug_line.txt',
        "BODY_LEN=" . strlen($body) . "\n" .
        "BODY=" . $body . "\n\n" .
        "HASH: $hash\nINVALID\n\n",
        FILE_APPEND

    );
    http_response_code(401);
    exit('Invalid signature');
}

// 🚨 STEP 4: ตอบ LINE ก่อนทันที
http_response_code(200);
echo "OK";
fastcgi_finish_request();


// ---------------------------
// จากนี้ค่อย process จริง
// ---------------------------

// parse json
$data = json_decode($body, true);
if (!isset($data['events'])) {
    exit;
}

// include หลัง verify เท่านั้น ✅
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../models/UserModel.php';
require_once __DIR__ . '/../models/UserRoleModel.php';
require_once __DIR__ . '/../models/RequestTypeModel.php';
require_once __DIR__ . '/../services/LineService.php';

$ACCESS_TOKEN = getenv('LINE_CHANNEL_ACCESS_TOKEN') ?: '';

$RM_BEFORE = getenv('LINE_RICHMENU_BEFORE') ?: '';
$RM_INTERNAL = getenv('LINE_RICHMENU_INTERNAL') ?: '';
$RM_EXTERNAL = getenv('LINE_RICHMENU_EXTERNAL') ?: '';

$line = new LineService($ACCESS_TOKEN);

try {
    $pdo = db();
} catch (Throwable $e) {
    exit;
}

$userModel = new UserModel($pdo);
$userRoleModel = new UserRoleModel($pdo);
$requestTypeModel = new RequestTypeModel($pdo);

// loop event
foreach ($data['events'] as $event) {

    $type = $event['type'] ?? '';
    $userId = $event['source']['userId'] ?? null;

    if (!$userId)
        continue;

    // ===== ROLE =====
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

    // ===== SWITCH MENU =====
    $targetRichMenu = $RM_BEFORE;
    if ($roleCode === 'INTERNAL' || $roleCode === 'ADMIN') {
        $targetRichMenu = $RM_INTERNAL;
    } elseif ($roleCode === 'EXTERNAL') {
        $targetRichMenu = $RM_EXTERNAL;
    }

    if ($targetRichMenu !== '') {
        $line->linkRichMenuToUser($userId, $targetRichMenu);
    }

    // ===== FOLLOW =====
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

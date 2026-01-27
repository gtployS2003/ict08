<?php
// backend/public/line_webhook.php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/../models/UserModel.php';
require_once __DIR__ . '/../services/LineService.php';

// 1) โหลดค่า env
$CHANNEL_SECRET = getenv('LINE_CHANNEL_SECRET') ?: '';
$ACCESS_TOKEN = getenv('LINE_CHANNEL_ACCESS_TOKEN') ?: '';

$RM_BEFORE = getenv('LINE_RICHMENU_BEFORE') ?: '';
$RM_INTERNAL = getenv('LINE_RICHMENU_INTERNAL') ?: '';
$RM_EXTERNAL = getenv('LINE_RICHMENU_EXTERNAL') ?: '';

if ($CHANNEL_SECRET === '' || $ACCESS_TOKEN === '') {
    http_response_code(500);
    echo "Missing LINE env";
    exit;
}

// 2) Verify signature
$body = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_LINE_SIGNATURE'] ?? '';

$hash = base64_encode(hash_hmac('sha256', $body, $CHANNEL_SECRET, true));
if (!hash_equals($hash, $signature)) {
    http_response_code(401);
    echo "Invalid signature";
    exit;
}

// 3) Parse JSON
$data = json_decode($body, true);
if (!isset($data['events'])) {
    http_response_code(200);
    echo "No events";
    exit;
}

$line = new LineService($ACCESS_TOKEN);

try {
    $pdo = db();
} catch (Throwable $e) {
    http_response_code(500);
    echo 'Database connection failed';
    exit;
}

$userModel = new UserModel($pdo);


foreach ($data['events'] as $event) {
    $type = $event['type'] ?? '';
    $source = $event['source'] ?? [];
    $userId = $source['userId'] ?? null;

    // เราต้องมี userId ถึงจะผูก rich menu ได้
    if (!$userId)
        continue;

    // 4) สลับ rich menu ทุกครั้งที่มี event (ให้เมนูถูก role เสมอ)
    //    - ถ้า user ยังไม่ลงทะเบียน => BEFORE
    //    - ถ้า role = internal => INTERNAL
    //    - else => EXTERNAL
    $user = $userModel->findByLineUserId($userId);

    if (!$user && method_exists($userModel, 'findByLineUserId')) {
        $user = $userModel->findByLineUserId($userId);
    }

    $targetRichMenu = $RM_BEFORE;

    if ($user && isset($user['role'])) {
        if ($user['role'] === 'internal')
            $targetRichMenu = $RM_INTERNAL;
        else
            $targetRichMenu = $RM_EXTERNAL;
    }

    if ($targetRichMenu !== '') {
        $line->linkRichMenuToUser($userId, $targetRichMenu);
    }

    // 5) Handle event types
    if ($type === 'follow') {
        // เพิ่มเพื่อนครั้งแรก → ส่งข้อความต้อนรับ + แนะนำเข้าสู่ระบบ
        if (isset($event['replyToken'])) {
            $line->replyMessage($event['replyToken'], [
                [
                    'type' => 'text',
                    'text' => "สวัสดีค่ะ 😊\nยินดีต้อนรับสู่ ศูนย์เทคโนโลยสารสนเทศและการสื่อสารเขต 8 (พิษณุโลก)\nกรุณาแตะเมนู “เข้าสู่ระบบ” เพื่อสมัคร/เข้าสู่ระบบก่อนใช้งานค่ะ"
                ]
            ]);
        }
        continue;
    }

    // 6) Postback: ขอสนับสนุน -> ส่ง 3 ปุ่ม
    if ($type === 'postback') {
        $postback = $event['postback']['data'] ?? '';

        if ($postback === 'support_request' && isset($event['replyToken'])) {
            // ส่ง Buttons Template 3 ปุ่ม
            $line->replyMessage($event['replyToken'], [
                [
                    'type' => 'template',
                    'altText' => 'เมนูการขอสนับสนุน',
                    'template' => [
                        'type' => 'buttons',
                        'title' => 'การขอสนับสนุน',
                        'text' => 'โปรดเลือกรายการที่ต้องการ',
                        'actions' => [
                            [
                                'type' => 'postback',
                                'label' => 'ขอสนับสนุนห้องประชุม',
                                'data' => 'req_meeting',
                                'displayText' => 'ขอสนับสนุนห้องประชุม'
                            ],
                            [
                                'type' => 'postback',
                                'label' => 'แจ้งเสีย/แจ้งซ่อม',
                                'data' => 'req_repair',
                                'displayText' => 'แจ้งเสีย/แจ้งซ่อม'
                            ],
                            [
                                'type' => 'postback',
                                'label' => 'อื่นๆ',
                                'data' => 'req_other',
                                'displayText' => 'อื่นๆ'
                            ]
                        ]
                    ]
                ]
            ]);
            continue;
        }

        // ตัวอย่างตอบกลับเมื่อเลือกประเภทคำขอ (คุณจะต่อเข้าระบบจริงทีหลังได้)
        if (in_array($postback, ['req_meeting', 'req_repair', 'req_other'], true) && isset($event['replyToken'])) {
            $map = [
                'req_meeting' => 'คุณเลือก: ขอสนับสนุนห้องประชุม',
                'req_repair' => 'คุณเลือก: แจ้งเสีย/แจ้งซ่อม',
                'req_other' => 'คุณเลือก: อื่นๆ'
            ];
            $line->replyMessage($event['replyToken'], [
                ['type' => 'text', 'text' => ($map[$postback] ?? 'รับเรื่องแล้วค่ะ') . "\n(ขั้นถัดไป: จะพาไปกรอกข้อมูล/สร้างคำขอในระบบ)"]
            ]);
            continue;
        }
    }

    // 7) (ทางเลือก) message event ทดสอบ
    if ($type === 'message' && isset($event['replyToken'])) {
        $msg = $event['message']['text'] ?? '';
        if ($msg === 'เมนู' || $msg === 'menu') {
            $line->replyMessage($event['replyToken'], [
                ['type' => 'text', 'text' => 'แสดงเมนูด้านล่างได้เลยค่ะ 👇']
            ]);
        }
    }
}

http_response_code(200);
echo "OK";

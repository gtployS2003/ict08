<?php
// backend/public/line_webhook.php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/../models/UserModel.php';
require_once __DIR__ . '/../models/UserRoleModel.php';
require_once __DIR__ . '/../services/LineService.php';

// 1) โหลดค่า env
$CHANNEL_SECRET = getenv('LINE_CHANNEL_SECRET') ?: '';
$ACCESS_TOKEN   = getenv('LINE_CHANNEL_ACCESS_TOKEN') ?: '';

$RM_BEFORE   = getenv('LINE_RICHMENU_BEFORE') ?: '';
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

$userModel     = new UserModel($pdo);
$userRoleModel = new UserRoleModel($pdo);

foreach ($data['events'] as $event) {
    $type   = $event['type'] ?? '';
    $source = $event['source'] ?? [];
    $userId = $source['userId'] ?? null;

    if (!$userId) continue;

    // ===== 4) หา user + roleCode (INTERNAL/EXTERNAL/ADMIN/GUEST) =====
    $user = $userModel->findByLineUserId($userId);

    $roleCode = 'GUEST';
    if ($user && !empty($user['user_role_id'])) {
        try {
            $roleRow = $userRoleModel->getById((int)$user['user_role_id']); // getById อาจ throw
            $roleCode = strtoupper((string)($roleRow['code'] ?? 'EXTERNAL'));
        } catch (Throwable $e) {
            $roleCode = 'EXTERNAL';
        }
    }

    // ===== 4.1) สลับ richmenu ตาม role =====
    $targetRichMenu = $RM_BEFORE;
    if ($roleCode === 'INTERNAL' || $roleCode === 'ADMIN') {
        $targetRichMenu = $RM_INTERNAL;
    } elseif ($roleCode === 'EXTERNAL') {
        $targetRichMenu = $RM_EXTERNAL;
    }

    if ($targetRichMenu !== '') {
        $line->linkRichMenuToUser($userId, $targetRichMenu);
    }

    // ===== 5) follow =====
    if ($type === 'follow') {
        if (isset($event['replyToken'])) {
            $line->replyMessage($event['replyToken'], [[
                'type' => 'text',
                'text' => "สวัสดีค่ะ 😊\nยินดีต้อนรับสู่ ศูนย์เทคโนโลยสารสนเทศและการสื่อสารเขต 8 (พิษณุโลก)\nกรุณาแตะเมนู “เข้าสู่ระบบ” เพื่อสมัคร/เข้าสู่ระบบก่อนใช้งานค่ะ"
            ]]);
        }
        continue;
    }

    // ===== Handler กลาง: external menu actions =====
    $handleExternal = function(string $action) use ($line, $event) : void {
        if (!isset($event['replyToken'])) return;

        // ขอสนับสนุน
        if ($action === 'ext:support') {
            $line->replyMessage($event['replyToken'], [[
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
            ]]);
            return;
        }

        // ติดตามสถานะ
        if ($action === 'ext:track') {
            $line->replyMessage($event['replyToken'], [[
                'type' => 'text',
                'text' => "🔎 ติดตามสถานะ\nกรุณาพิมพ์ “เลขคำขอ” หรือ “รหัสติดตาม” ที่ได้รับค่ะ"
            ]]);
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
                'req_repair'  => 'คุณเลือก: แจ้งเสีย/แจ้งซ่อม',
                'req_other'   => 'คุณเลือก: อื่นๆ'
            ];
            $line->replyMessage($event['replyToken'], [[
                'type' => 'text',
                'text' => ($map[$postback] ?? 'รับเรื่องแล้วค่ะ') . "\n(ขั้นถัดไป: จะพาไปกรอกข้อมูล/สร้างคำขอในระบบ)"
            ]]);
            continue;
        }
    }

    // ===== 7) Message text =====
    if ($type === 'message' && isset($event['replyToken'])) {
        $msg = trim((string)($event['message']['text'] ?? ''));

        $textToExternal = [
            'ขอสนับสนุน'   => 'ext:support',
            'ติดตามสถานะ' => 'ext:track',
        ];

         if (($roleCode === 'INTERNAL' || $roleCode === 'ADMIN' || $roleCode === 'EXTERNAL') && isset($textToExternal[$msg])) {
        $handleExternal($textToExternal[$msg]);
        continue;
    }

        if ($msg === 'เมนู' || $msg === 'menu') {
            $line->replyMessage($event['replyToken'], [[
                'type' => 'text',
                'text' => 'แสดงเมนูด้านล่างได้เลยค่ะ 👇'
            ]]);
            continue;
        }
    }
}

http_response_code(200);
echo "OK";

<?php
// test-webhook.php - ทดสอบ webhook ด้วย testable events

require_once __DIR__ . '/backend/config/env.php';
env_load(__DIR__ . '/backend/.env');

$channelSecret = getenv('LINE_CHANNEL_SECRET') ?: '';
$richMenuBefore = getenv('LINE_RICHMENU_BEFORE') ?: '';

// สร้าง test event (ทั่วไป: postback ext:support)
$testEvent = [
    'events' => [
        [
            'type' => 'postback',
            'replyToken' => 'test_reply_token_' . time(),
            'source' => [
                'userId' => 'Utest_user_id_12345',
            ],
            'postback' => [
                'data' => 'ext:support',
            ],
        ],
    ],
];

$payload = json_encode($testEvent, JSON_UNESCAPED_UNICODE);
$signature = base64_encode(hash_hmac('sha256', $payload, $channelSecret, true));

echo "=== TEST WEBHOOK ===\n";
echo "Payload:\n" . json_encode($testEvent, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n\n";
echo "Signature: " . $signature . "\n\n";
echo "Rich Menu Before ID: " . $richMenuBefore . "\n\n";

// ส่ง request ทดสอบ
$url = 'http://localhost/ict8/backend/public/line_webhook.php';
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'X-Line-Signature: ' . $signature,
    'Content-Type: application/json',
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$resp = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Response HTTP Code: " . $httpCode . "\n";
echo "Response Body: " . $resp . "\n\n";

echo "=== ตรวจสอบ log ===\n";
$logFile = '/tmp/ict8_line_webhook_' . date('Ymd') . '.log';
if (file_exists($logFile)) {
    echo "Log file exists: " . $logFile . "\n";
    echo "Last 20 lines:\n";
    $lines = array_slice(file($logFile), -20);
    echo implode('', $lines);
} else {
    echo "Log file: " . $logFile . " (not created yet)\n";
    echo "Check if /tmp is writable...\n";
}

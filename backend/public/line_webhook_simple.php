<?php
declare(strict_types=1);

/**
 * Simplified LINE Webhook - สำหรับ DEBUG
 * Test ว่า basic ACK 200 ทำงานได้หรือไม่
 */

// ==============================
// IMMEDIATE ACK (ต้องไม่มี error ก่อนนี้)
// ==============================
http_response_code(200);
echo 'OK';

// ให้ PHP ส่จบ output ไป client
if (function_exists('fastcgi_finish_request')) {
    fastcgi_finish_request();
}

// ==============================
// LOG (ทำงานหลังจาก ACK)
// ==============================
$rawBody = file_get_contents('php://input');
$logDir = __DIR__ . '/uploads/_logs';
if (!is_dir($logDir)) {
    @mkdir($logDir, 0755, true);
}

$logFile = $logDir . '/ict8_line_webhook_simple_' . date('Ymd') . '.log';
$logEntry = [
    'timestamp' => date('c'),
    'method' => $_SERVER['REQUEST_METHOD'],
    'bodyLen' => strlen($rawBody),
    'headers' => [
        'content-type' => $_SERVER['CONTENT_TYPE'] ?? '',
        'x-line-signature' => substr($_SERVER['HTTP_X_LINE_SIGNATURE'] ?? '', 0, 10) . '...',
    ],
];

@file_put_contents(
    $logFile,
    date('c') . "\t" . json_encode($logEntry, JSON_UNESCAPED_UNICODE) . "\n",
    FILE_APPEND
);

exit;

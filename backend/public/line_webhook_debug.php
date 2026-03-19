<?php
/** 
 * LINE Webhook - DIAGNOSIS version
 * Sends 200 ACK then logs errors in detail
 */

// Disable all error suppression for debugging
ini_set('display_errors', '1');
error_reporting(E_ALL);

// ACK immediately
http_response_code(200);
header('Content-Type: text/plain; charset=utf-8');
echo "OK\n";

// Background processing
if (function_exists('fastcgi_finish_request')) {
    fastcgi_finish_request();
}

// Now debug
$debug = [];

try {
    $debug['step'] = 'env_loading';
    require_once __DIR__ . '/../config/env.php';
    $debug['env_php'] = 'ok';
    
    env_load(__DIR__ . '/../.env');
    $debug['env_load'] = 'ok';
    
    $secret = getenv('LINE_CHANNEL_SECRET');
    $debug['channel_secret'] = $secret ? 'loaded' : 'missing';
    
    $debug['step'] = 'db_connecting';
    require_once __DIR__ . '/../config/db.php';
    $db = db();
    $debug['db'] = 'ok';
    
    $debug['step'] = 'services_loading';
    require_once __DIR__ . '/../services/LineService.php';
    $debug['line_service'] = 'ok';
    
} catch (Throwable $e) {
    $debug['error'] = $e->getMessage();
    $debug['file'] = $e->getFile();
    $debug['line'] = $e->getLine();
}

// Log to file
$log_dir = __DIR__;
$log_file = $log_dir . '/line_webhook_debug_' . date('Ymd') . '.log';

$log_line = date('Y-m-d H:i:s') . ' | ' . json_encode($debug, JSON_UNESCAPED_UNICODE) . "\n";
@file_put_contents($log_file, $log_line, FILE_APPEND);

// Also try /tmp
@file_put_contents('/tmp/ict8_webhook_debug_' . date('Ymd') . '.log', $log_line, FILE_APPEND);

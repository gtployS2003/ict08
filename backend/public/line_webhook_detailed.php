<?php
/**
 * LINE Webhook - DETAILED DIAGNOSIS
 * Tests each section to identify root cause
 */

ini_set('display_errors', '0');
error_reporting(E_ALL);

// ACK immediately (must work)
http_response_code(200);
header('Content-Type: application/json; charset=utf-8');
$result = [];
$result['status'] = 'ok';
$result['steps'] = [];

echo json_encode(['ok' => true, 'message' => 'ACK sent']);

// Background processing
if (function_exists('fastcgi_finish_request')) {
    fastcgi_finish_request();
}

// Log to file
$log_file = '/tmp/ict8_webhook_detailed_' . date('Ymd') . '.log';

// Step 1: Check variables exist
$result['steps'][] = ['step' => 'php_version', 'value' => phpversion()];
$result['steps'][] = ['step' => 'declare_strict', 'success' => true];

// Step 2: env.php
try {
    $env_file = __DIR__ . '/../config/env.php';
    $result['steps'][] = ['step' => 'env_php', 'exists' => file_exists($env_file)];
    
    if (!file_exists($env_file)) {
        $result['error'] = 'env.php not found at: ' . $env_file;
        file_put_contents($log_file, date('Y-m-d H:i:s') . ' | ' . json_encode($result) . "\n", FILE_APPEND);
        exit;
    }
    
    require_once $env_file;
    $result['steps'][] = ['step' => 'env_php_require', 'success' => true];
} catch (Throwable $e) {
    $result['error'] = 'env.php' . $e->getMessage();
    file_put_contents($log_file, date('Y-m-d H:i:s') . ' | ERROR: ' . json_encode($result) . "\n", FILE_APPEND);
    exit;
}

// Step 3: env_load function
try {
    $env_file = __DIR__ . '/../.env';
    $result['steps'][] = ['step' => '.env', 'exists' => file_exists($env_file)];
    
    if (function_exists('env_load')) {
        env_load($env_file);
        $result['steps'][] = ['step' => 'env_load', 'success' => true];
    } else {
        $result['steps'][] = ['step' => 'env_load', 'exists' => false];
    }
} catch (Throwable $e) {
    $result['error'] = 'env_load: ' . $e->getMessage();
    file_put_contents($log_file, date('Y-m-d H:i:s') . ' | ERROR: ' . json_encode($result) . "\n", FILE_APPEND);
    exit;
}

// Step 4: Check LINE secret
try {
    $secret = getenv('LINE_CHANNEL_SECRET');
    $result['steps'][] = ['step' => 'LINE_CHANNEL_SECRET', 'loaded' => !empty($secret)];
} catch (Throwable $e) {
    $result['error'] = 'getenv: ' . $e->getMessage();
}

// Step 5: Load db.php
try {
    $db_file = __DIR__ . '/../config/db.php';
    $result['steps'][] = ['step' => 'db.php', 'exists' => file_exists($db_file)];
    
    if (file_exists($db_file)) {
        require_once $db_file;
        $result['steps'][] = ['step' => 'db.php_require', 'success' => true];
    }
} catch (Throwable $e) {
    $result['error'] = 'db.php: ' . $e->getMessage();
    file_put_contents($log_file, date('Y-m-d H:i:s') . ' | ERROR: ' . json_encode($result) . "\n", FILE_APPEND);
    exit;
}

// Step 6: Load Models
$models = ['UserModel', 'UserRoleModel', 'PersonModel', 'RequestTypeModel'];
foreach ($models as $model) {
    try {
        $file = __DIR__ . '/../models/' . $model . '.php';
        if (file_exists($file)) {
            require_once $file;
            $result['steps'][] = ['step' => $model, 'success' => class_exists($model)];
        } else {
            $result['steps'][] = ['step' => $model, 'file_exists' => false];
        }
    } catch (Throwable $e) {
        $result['error'] = $model . ': ' . $e->getMessage();
        break;
    }
}

// Step 7: Load LineService
try {
    $file = __DIR__ . '/../services/LineService.php';
    $result['steps'][] = ['step' => 'LineService.php', 'exists' => file_exists($file)];
    
    if (file_exists($file)) {
        require_once $file;
        $result['steps'][] = ['step' => 'LineService', 'class_exists' => class_exists('LineService')];
    }
} catch (Throwable $e) {
    $result['error'] = 'LineService: ' . $e->getMessage();
}

// Step 8: Try DB connection
try {
    if (function_exists('db')) {
        $pdo = db();
        $result['steps'][] = ['step' => 'db_connect', 'success' => $pdo !== null];
    } else {
        $result['steps'][] = ['step' => 'db_function', 'exists' => false];
    }
} catch (Throwable $e) {
    $result['steps'][] = ['step' => 'db_connect', 'error' => $e->getMessage()];
}

// Log final result
file_put_contents($log_file, date('Y-m-d H:i:s') . ' | ' . json_encode($result, JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND);

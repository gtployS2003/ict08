<?php
/**
 * API: Debug - Test webhook configuration
 */

header('Content-Type: application/json; charset=utf-8');

$result = [
    'timestamp' => date('Y-m-d H:i:s'),
    'checks' => []
];

// Check 1: Database connection
try {
    require_once __DIR__ . '/../config/env.php';
    env_load(__DIR__ . '/../.env');
    require_once __DIR__ . '/../config/db.php';
    
    $pdo = db();
    $result['checks']['database'] = ['ok' => true, 'message' => 'Connected'];
} catch (Throwable $e) {
    $result['checks']['database'] = ['ok' => false, 'message' => $e->getMessage()];
}

// Check 2: RequestTypeModel
try {
    if (isset($pdo)) {
        require_once __DIR__ . '/../models/RequestTypeModel.php';
        $model = new RequestTypeModel($pdo);
        $items = $model->list('', 1, 10);
        
        $result['checks']['request_types'] = [
            'ok' => true,
            'count' => count($items),
            'sample' => array_slice($items, 0, 1)
        ];
    }
} catch (Throwable $e) {
    $result['checks']['request_types'] = ['ok' => false, 'message' => $e->getMessage()];
}

// Check 3: LINE credentials
try {
    $secret = getenv('LINE_CHANNEL_SECRET');
    $token = getenv('LINE_CHANNEL_ACCESS_TOKEN');
    
    $result['checks']['line_credentials'] = [
        'ok' => !empty($secret) && !empty($token),
        'secret_present' => !empty($secret),
        'token_present' => !empty($token)
    ];
} catch (Throwable $e) {
    $result['checks']['line_credentials'] = ['ok' => false, 'message' => $e->getMessage()];
}

// Check 4: Environment
$result['environment'] = [
    'base_path' => getenv('BASE_PATH'),
    'app_env' => getenv('APP_ENV'),
    'db_host' => getenv('DB_HOST'),
];

http_response_code(200);
echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

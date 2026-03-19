<?php
/**
 * API: Get support request types
 * 
 * Returns JSON array of request types with URLs
 * Used by Cloudflare Worker to build dynamic buttons
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    // Load config
    require_once __DIR__ . '/../config/env.php';
    env_load(__DIR__ . '/../.env');
    
    // Connect to DB
    require_once __DIR__ . '/../config/db.php';
    $pdo = db();
    
    // Load model
    require_once __DIR__ . '/../models/RequestTypeModel.php';
    $model = new RequestTypeModel($pdo);
    
    // Get active request types
    $items = $model->list('', 1, 200);
    
    // Build response
    $result = [];
    foreach ($items as $item) {
        $label = trim((string) ($item['type_name'] ?? ''));
        $url = trim((string) ($item['url_link'] ?? ''));
        
        if ($label && $url) {
            $result[] = [
                'id' => (int) ($item['type_id'] ?? 0),
                'label' => $label,
                'url' => $url,
            ];
        }
    }
    
    // Return response
    if (empty($result)) {
        // Fallback if no items in DB
        $result = [
            ['id' => 1, 'label' => 'ขอสนับสนุนห้องประชุม', 'url' => '#fallback'],
            ['id' => 2, 'label' => 'แจ้งเสีย/ซ่อมอุปกรณ์', 'url' => '#fallback'],
            ['id' => 3, 'label' => 'ขอใช้บริการอื่น ๆ', 'url' => '#fallback'],
        ];
    }
    
    http_response_code(200);
    echo json_encode([
        'ok' => true,
        'items' => $result,
        'count' => count($result),
    ]);
    
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => $e->getMessage(),
    ]);
}

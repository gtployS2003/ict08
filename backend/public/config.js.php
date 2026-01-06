<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/env.php';
env_load(__DIR__ . '/../.env');

header('Content-Type: application/javascript; charset=utf-8');

$appEnv   = env('APP_ENV', 'dev');
$devKey   = env('DEV_API_KEY', '');
$apiBase  = env('API_BASE', 'http://127.0.0.1/ict/backend/public');
$basePath = env('BASE_PATH', '/ict');

// ✅ output เป็น JSON ทั้งก้อน (กัน syntax error ทุกกรณี)
$config = [
  "APP_ENV" => $appEnv,
  "DEV_API_KEY" => $devKey,
  "API_BASE" => $apiBase,
  "BASE_PATH" => $basePath,
];

echo "window.__APP_CONFIG__ = " . json_encode($config, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . ";";

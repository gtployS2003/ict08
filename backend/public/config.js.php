<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/env.php';

// ✅ ลองอ่าน .env หลายไฟล์ตามลำดับ
$envPaths = [
  __DIR__ . '/../.env',  // ไฟล์หลัก
  __DIR__ . '/../.env.production',  // ไฟล์ production
];

$envContent = '';
$envFile = null;
foreach ($envPaths as $path) {
  if (file_exists($path) && is_readable($path)) {
    $envContent = file_get_contents($path);
    $envFile = $path;
    break;
  }
}

// ✅ ถ้าอ่านไม่ได้ ให้ใช้ hardcode fallback สำหรับ production
if (empty($envContent)) {
  $envContent = <<<'EOT'
APP_ENV=prod
APP_SECRET=7fK2mQ9vXcR4pL8sTzW1aN6YbD3eU5hJk0GxV2rP9mC4sF8
DEV_API_KEY=dev_ict8_key_ict08
BASE_PATH=/ict8
API_BASE=https://ict8.moi.go.th/ict8/backend/public
LIFF_ID=2008936008-RjX1iZRP
EOT;
}

$envContent = (string)$envContent; // ensure string

$envLines = array_filter(array_map('trim', explode("\n", $envContent)));
$envData = [];
foreach ($envLines as $line) {
  if (strlen($line) === 0) continue;
  if ($line[0] === '#') continue;
  if (strpos($line, '=') === false) continue;
  
  list($key, $val) = array_pad(explode('=', $line, 2), 2, '');
  $key = trim($key);
  $val = trim($val);
  if (!empty($key)) {
    $envData[$key] = $val;
  }
}

// ควรใช้ .env data โดยตรง แทน env() function
ob_start(); // ✅ กัน header already sent

header('Content-Type: application/javascript; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

$appEnv   = $envData['APP_ENV'] ?? 'dev';
$devKey   = $envData['DEV_API_KEY'] ?? '';
$basePath = $envData['BASE_PATH'] ?? '/ict8';
$liffId   = $envData['LIFF_ID'] ?? '';

// API_BASE:
// - Prefer .env, but allow empty (then fall back to BASE_PATH/backend/public)
// - Avoid hard-coding http:// in defaults to prevent mixed-content on HTTPS pages
$apiBase  = trim((string) ($envData['API_BASE'] ?? ''));
if ($apiBase === '') {
  $bp = rtrim((string) $basePath, '/');
  $apiBase = ($bp ? $bp : '') . '/backend/public';
}

// Local development should use the current XAMPP project instead of a production API base.
$host = strtolower((string) ($_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? ''));
$isLocalHost = $host === 'localhost'
  || str_starts_with($host, '127.0.0.1')
  || str_starts_with($host, '[::1]')
  || str_starts_with($host, '::1');
if ($isLocalHost) {
  $bp = rtrim((string) $basePath, '/');
  $apiBase = ($bp ? $bp : '') . '/backend/public';
}

// If the current request is HTTPS but API_BASE is HTTP, upgrade to HTTPS.
$isHttps = false;
try {
  $proto = $_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '';
  $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || $proto === 'https';
} catch (Throwable $e) {
  $isHttps = false;
}
if ($isHttps && strpos($apiBase, 'http://') === 0) {
  $apiBase = 'https://' . substr($apiBase, strlen('http://'));
}

$config = [
  "APP_ENV" => $appEnv,
  "DEV_API_KEY" => $devKey,
  "API_BASE" => $apiBase,
  "BASE_PATH" => $basePath,
  "LIFF_ID" => $liffId,
];

echo "window.__APP_CONFIG__ = " . json_encode($config, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . ";";
echo "\nwindow.LIFF_ID = window.__APP_CONFIG__.LIFF_ID;";
echo "\nwindow.API_BASE_URL = window.__APP_CONFIG__.API_BASE;";
$debugEnv = [
  'liffId' => $liffId,
  'envFile' => $envFile,
  'envFileExists' => (bool) $envFile,
  'envContentLength' => strlen($envContent),
  'envDataCount' => count($envData),
  'envData' => $envData,
  'apiBase' => $apiBase,
  'host' => $host,
  'isLocalHost' => $isLocalHost,
];
echo "\nwindow.__DEBUG_ENV__ = " . json_encode($debugEnv, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . ";";

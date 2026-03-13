<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/env.php';
env_load(__DIR__ . '/../.env');

ob_start(); // ✅ กัน header already sent

header('Content-Type: application/javascript; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');


$appEnv   = env('APP_ENV', 'dev');
$devKey   = env('DEV_API_KEY', '');
$basePath = env('BASE_PATH', '/ict8');
$liffId   = env('LIFF_ID', '');

// API_BASE:
// - Prefer .env, but allow empty (then fall back to BASE_PATH/backend/public)
// - Avoid hard-coding http:// in defaults to prevent mixed-content on HTTPS pages
$apiBase  = trim((string) env('API_BASE', ''));
if ($apiBase === '') {
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
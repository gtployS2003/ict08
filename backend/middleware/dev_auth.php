<?php
// backend/middleware/dev_auth.php
declare(strict_types=1);

require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/../helpers/response.php';

env_load(__DIR__ . '/../.env');

function require_dev_staff(): void {
    $env = env('APP_ENV', 'dev');

    // ถ้าไม่ใช่ dev ห้ามใช้ทางลัดนี้
    if ($env !== 'dev') {
        fail("Dev auth disabled", 403);
    }

    $expected = env('DEV_API_KEY');
    if (!$expected) {
        fail("Server missing DEV_API_KEY", 500);
    }

    // รับจาก header: X-Dev-Api-Key
    $key = $_SERVER['HTTP_X_DEV_API_KEY'] ?? '';
    if ($key === '' || !hash_equals($expected, $key)) {
        fail("Unauthorized (dev)", 401);
    }
}

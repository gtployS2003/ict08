<?php
// backend/public/ping.php
declare(strict_types=1);

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/response.php';

cors_apply();
cors_handle_preflight();

try {
    $pdo = db();
    $row = $pdo->query("SELECT NOW() AS server_time, DATABASE() AS dbname")->fetch();
    ok($row, "Database connected");
} catch (Throwable $e) {
    fail("Database connection failed", 500, $e->getMessage());
}

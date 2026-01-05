<?php
// api/public/ping.php

declare(strict_types=1);

header("Content-Type: application/json; charset=utf-8");
// ถ้าจะให้หน้าเว็บเรียกได้ (ช่วง dev) เปิด CORS ไว้ก่อน
header("Access-Control-Allow-Origin: *");

require_once __DIR__ . "/../config/db.php";

try {
    $pdo = db();
    $stmt = $pdo->query("SELECT NOW() AS server_time, DATABASE() AS dbname");
    $row = $stmt->fetch();

    echo json_encode([
        "ok" => true,
        "message" => "Database connected",
        "data" => $row
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "ok" => false,
        "message" => "Database connection failed",
        "error" => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}

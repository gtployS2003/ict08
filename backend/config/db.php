<?php
// api/config/db.php

declare(strict_types=1);

function db(): PDO {
    // ✅ แก้ค่าตาม MySQL/phpMyAdmin ของคุณ
    $host = "127.0.0.1";
    $dbname = "ITC8_db";      // <-- ชื่อฐานข้อมูลใน phpMyAdmin
    $user = "root";          // ปกติ XAMPP ใช้ root
    $pass = "";              // ปกติ XAMPP รหัสว่าง (ถ้าคุณตั้งไว้ให้ใส่)
    $charset = "utf8mb4";

    $dsn = "mysql:host={$host};dbname={$dbname};charset={$charset}";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    return new PDO($dsn, $user, $pass, $options);
}

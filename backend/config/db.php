<?php
// backend/config/db.php
declare(strict_types=1);

require_once __DIR__ . '/env.php';

env_load(__DIR__ . '/../.env');

function db(): PDO {
    $host = env('DB_HOST', '127.0.0.1');
    $dbname = env('DB_NAME', 'ITC8_db');
    $user = env('DB_USER', 'root');
    $pass = env('DB_PASS', '');
    $charset = env('DB_CHARSET', 'utf8mb4');

    $dsn = "mysql:host={$host};dbname={$dbname};charset={$charset}";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    try {
        return new PDO($dsn, $user, $pass, $options);
    } catch (PDOException $e) {
        // Local-only fallback สำหรับ XAMPP (กันกรณี .env ตั้ง user/pass ไม่ตรงกับเครื่อง dev)
        $httpHost = $_SERVER['HTTP_HOST'] ?? '';
        $isLocalHttp = in_array($httpHost, ['localhost', '127.0.0.1'], true) || str_starts_with($httpHost, 'localhost:');
        $isLocalDbHost = in_array($host, ['localhost', '127.0.0.1'], true);

        if ($isLocalHttp && $isLocalDbHost) {
            $fallbackDb = 'ITC8_db';
            $fallbackUser = 'root';
            $fallbackPass = '';
            $fallbackDsn = "mysql:host={$host};dbname={$fallbackDb};charset={$charset}";
            try {
                return new PDO($fallbackDsn, $fallbackUser, $fallbackPass, $options);
            } catch (PDOException $e2) {
                // ถ้า fallback ยัง fail ให้ throw error เดิมเพื่อให้เห็นสาเหตุที่แท้จริง
                throw $e;
            }
        }

        throw $e;
    }
}

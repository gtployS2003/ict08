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

    return new PDO($dsn, $user, $pass, $options);
}

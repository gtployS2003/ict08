<?php
// backend/middleware/auth.php
declare(strict_types=1);

require_once __DIR__ . '/../config/env.php';
env_load(__DIR__ . '/../.env');

function auth_sign(string $userId): string {
    $secret = env('APP_SECRET', 'dev_secret');
    return hash_hmac('sha256', $userId, $secret);
}

function auth_verify(string $token, string $userId): bool {
    $expected = auth_sign($userId);
    return hash_equals($expected, $token);
}

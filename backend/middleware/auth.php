<?php
// backend/middleware/auth.php
declare(strict_types=1);

require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/../helpers/response.php';

env_load(__DIR__ . '/../.env');

/**
 * สร้าง token จาก user_id
 */
function auth_sign(string $userId): string
{
    $secret = env('APP_SECRET', 'dev_secret');
    return hash_hmac('sha256', $userId, $secret);
}

/**
 * ตรวจ token กับ user_id
 */
function auth_verify(string $token, string $userId): bool
{
    $expected = auth_sign($userId);
    return hash_equals($expected, $token);
}

/**
 * 🔑 ดึง Authorization header
 */
function get_bearer_token(): ?string
{
    // 1) ดึงจาก $_SERVER ก่อน (ชัวร์กว่าในหลาย env)
    $auth = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? null;

    // 2) fallback จาก getallheaders() แต่ต้อง case-insensitive
    if (!$auth && function_exists('getallheaders')) {
        $headers = getallheaders();
        foreach ($headers as $k => $v) {
            if (strtolower($k) === 'authorization') {
                $auth = $v;
                break;
            }
        }
    }

    if (!$auth) return null;

    if (preg_match('/Bearer\s+(\S+)/i', $auth, $m)) {
        return $m[1];
    }
    return null;
}


/**
 * 🔑 ดึง user จาก token
 * return array user (user_id, user_role_id, ...)
 */
function get_auth_user(PDO $pdo): ?array
{
    $token = get_bearer_token();
    if (!$token) return null;

    /**
     * token format ของคุณ = HMAC(user_id)
     * → เราต้องลอง verify กับ user ทุกคน (หรือ optimize ภายหลัง)
     */
    $sql = "SELECT user_id, line_user_id, line_user_name, user_role_id
            FROM `user`";
    $stmt = $pdo->query($sql);

    while ($user = $stmt->fetch(PDO::FETCH_ASSOC)) {
        if (auth_verify($token, (string)$user['user_id'])) {
            return $user;
        }
    }

    return null;
}

/**
 * ✅ ใช้ใน Controller ทุกตัวที่ต้อง login
 * ถ้าไม่ผ่าน → fail และ exit
 */
function require_auth(PDO $pdo): array
{
    $user = get_auth_user($pdo);

    if (!$user) {
        fail('UNAUTHORIZED', 401, 'Unauthorized');
        exit;
    }

    return $user;
}

/**
 * (optional) บังคับเฉพาะ admin
 */
function require_admin(PDO $pdo): array
{
    $user = require_auth($pdo);
    if ((int)$user['user_role_id'] !== 3) {
        fail('FORBIDDEN', 403, 'admin only');
        exit;
    }
    return $user;
}

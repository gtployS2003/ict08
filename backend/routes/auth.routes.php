<?php
// backend/routes/auth.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/auth.controller.php';

/**
 * Routes: auth
 *
 * รองรับ:
 *  - POST /auth/login
 *  - POST /auth/line-login
 *  - POST /auth/register
 */
function auth_routes(string $method, array $segments, PDO $pdo): bool
{
    if (($segments[0] ?? '') !== 'auth') {
        return false;
    }

    $controller = new AuthController($pdo);
    $action = $segments[1] ?? '';

    // POST /auth/login
    if ($method === 'POST' && $action === 'login') {
        $controller->login();
        return true;
    }

    // POST /auth/line-login
    if ($method === 'POST' && $action === 'line-login') {
        $controller->lineLogin();
        return true;
    }

    // POST /auth/register
    if ($method === 'POST' && $action === 'register') {
        $controller->register();
        return true;
    }

    return false;
}

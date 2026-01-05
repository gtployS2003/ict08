<?php
// backend/routes/auth.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/auth.controller.php';

function auth_routes(string $method, array $segments, PDO $pdo): bool {
    // POST /auth/login
    if ($method === 'POST' && ($segments[0] ?? '') === 'auth' && ($segments[1] ?? '') === 'login') {
        (new AuthController($pdo))->login();
        return true;
    }
    return false;
}

<?php
// backend/routes/news.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/news.controller.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';

function require_auth(): string {
    $token = bearer_token();
    $userId = $_SERVER['HTTP_X_USER_ID'] ?? null; // ส่ง user_id มาด้วยแบบง่าย ๆ
    if (!$token || !$userId) fail("Unauthorized", 401);

    if (!auth_verify($token, (string)$userId)) fail("Unauthorized", 401);
    return (string)$userId;
}

function news_routes(string $method, array $segments, PDO $pdo): bool {
    $ctrl = new NewsController($pdo);

    // GET /news
    if ($method === 'GET' && ($segments[0] ?? '') === 'news' && !isset($segments[1])) {
        $ctrl->list(); return true;
    }

    // GET /news/{id}
    if ($method === 'GET' && ($segments[0] ?? '') === 'news' && isset($segments[1])) {
        $ctrl->get((int)$segments[1]); return true;
    }

    // POST /news  (auth)
    if ($method === 'POST' && ($segments[0] ?? '') === 'news') {
        require_auth();
        $ctrl->create(); return true;
    }

    // PUT /news/{id} (auth)
    if ($method === 'PUT' && ($segments[0] ?? '') === 'news' && isset($segments[1])) {
        require_auth();
        $ctrl->update((int)$segments[1]); return true;
    }

    // DELETE /news/{id} (auth)
    if ($method === 'DELETE' && ($segments[0] ?? '') === 'news' && isset($segments[1])) {
        require_auth();
        $ctrl->delete((int)$segments[1]); return true;
    }

    return false;
}

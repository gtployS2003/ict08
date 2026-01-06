<?php
// backend/routes/news.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/news.controller.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/dev_auth.php';

function news_routes(string $method, array $segments, PDO $pdo): bool
{
    $ctrl = new NewsController($pdo);

    // GET /news
    if ($method === 'GET' && ($segments[0] ?? '') === 'news' && !isset($segments[1])) {
        $ctrl->list();
        return true;
    }

    // GET /news/{id}
    if ($method === 'GET' && ($segments[0] ?? '') === 'news' && isset($segments[1])) {
        $ctrl->get((int) $segments[1]);
        return true;
    }

    // POST /news  (auth)
    if ($method === 'POST' && ($segments[0] ?? '') === 'news') {
        require_dev_staff();
        $ctrl->create();
        return true;
    }

    // PUT /news/{id}
    if ($method === 'PUT' && ($segments[0] ?? '') === 'news' && isset($segments[1])) {
        require_dev_staff();
        $ctrl->update((int) $segments[1]);
        return true;
    }

    // DELETE /news/{id}
    if ($method === 'DELETE' && ($segments[0] ?? '') === 'news' && isset($segments[1])) {
        require_dev_staff();
        $ctrl->delete((int) $segments[1]);
        return true;
    }

    return false;
}

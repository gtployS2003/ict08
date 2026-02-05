<?php
// backend/routes/request_sub_types.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/request_sub_types.controller.php';

function request_sub_types_routes(string $method, array $segments, PDO $pdo): bool
{
    // path: /request-sub-types/...
    if (($segments[0] ?? '') !== 'request-sub-types') {
        return false;
    }

    $controller = new RequestSubTypesController($pdo);

    // GET /request-sub-types
    if ($method === 'GET' && count($segments) === 1) {
        $controller->index();
        return true;
    }

    // GET /request-sub-types/{id}
    if ($method === 'GET' && isset($segments[1]) && is_numeric($segments[1])) {
        $controller->show((int)$segments[1]);
        return true;
    }

    // POST /request-sub-types
    if ($method === 'POST' && count($segments) === 1) {
        $controller->create();
        return true;
    }

    // PUT /request-sub-types/{id}
    if ($method === 'PUT' && isset($segments[1]) && is_numeric($segments[1])) {
        $controller->update((int)$segments[1]);
        return true;
    }

    // DELETE /request-sub-types/{id}
    if ($method === 'DELETE' && isset($segments[1]) && is_numeric($segments[1])) {
        $controller->delete((int)$segments[1]);
        return true;
    }

    return false;
}

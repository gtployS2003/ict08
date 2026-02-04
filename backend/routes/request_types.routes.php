<?php
// backend/routes/request_types.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/request_types.controller.php';

/**
 * Routes: request-types
 */
function request_types_routes(string $method, array $segments, PDO $pdo): bool
{
    if (($segments[0] ?? '') !== 'request-types') {
        return false;
    }

    $controller = new RequestTypesController($pdo);

    // /request-types
    if (($segments[1] ?? '') === '') {

        // GET /request-types?q=&page=&limit=
        if ($method === 'GET') {
            $controller->index();
            return true;
        }

        // POST /request-types
        if ($method === 'POST') {
            $controller->create();
            return true;
        }

        return false;
    }

    // /request-types/{id}
    $idRaw = $segments[1] ?? '';
    if (!ctype_digit((string)$idRaw)) {
        // ถ้า segment ไม่ใช่ตัวเลข ให้ return false (หรือจะตอบ 404 ก็ได้)
        return false;
    }
    $id = (int)$idRaw;

    // GET /request-types/{id}
    if ($method === 'GET') {
        $controller->show($id);
        return true;
    }

    // PUT /request-types/{id}
    if ($method === 'PUT') {
        $controller->update($id);
        return true;
    }

    // DELETE /request-types/{id}
    if ($method === 'DELETE') {
        $controller->delete($id);
        return true;
    }

    return false;
}

<?php
// backend/routes/notification_types.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/notification_types.controller.php';

/**
 * Routes: notification-types
 */
function notification_types_routes(string $method, array $segments, PDO $pdo): bool
{
    if (($segments[0] ?? '') !== 'notification-types') {
        return false;
    }

    $controller = new NotificationTypesController($pdo);

    // /notification-types
    if (($segments[1] ?? '') === '') {

        // GET /notification-types?q=&page=&limit=
        if ($method === 'GET') {
            $controller->index();
            return true;
        }

        // POST /notification-types
        if ($method === 'POST') {
            $controller->create();
            return true;
        }

        return false;
    }

    // /notification-types/{id}
    $idRaw = $segments[1] ?? '';
    if (!ctype_digit((string)$idRaw)) {
        return false;
    }
    $id = (int)$idRaw;

    // GET /notification-types/{id}
    if ($method === 'GET') {
        $controller->show($id);
        return true;
    }

    // PUT/PATCH /notification-types/{id}
    if ($method === 'PUT' || $method === 'PATCH') {
        $controller->update($id);
        return true;
    }

    // DELETE /notification-types/{id}
    if ($method === 'DELETE') {
        $controller->delete($id);
        return true;
    }

    return false;
}

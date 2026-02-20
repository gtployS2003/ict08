<?php
// backend/routes/users.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/users.controller.php';

/**
 * Routes: users
 *
 * ตัวอย่าง path:
 *  - /users
 *  - /users/1
 */
function users_routes(string $method, array $segments, PDO $pdo): bool
{
    // segments[0] ต้องเป็น "users"
    if (($segments[0] ?? '') !== 'users') {
        return false;
    }

    $controller = new UsersController($pdo);

    // /users/options
    if (count($segments) === 2 && ($segments[1] ?? '') === 'options') {
        if ($method === 'GET') {
            $controller->options();
            return true;
        }
        return false;
    }

    // /users/participants
    if (count($segments) === 2 && ($segments[1] ?? '') === 'participants') {
        if ($method === 'GET') {
            $controller->participants();
            return true;
        }
        return false;
    }

    // /users
    if (count($segments) === 1) {
        if ($method === 'GET') {
            $controller->list();
            return true;
        }
        if ($method === 'POST') {
            $controller->create();
            return true;
        }
        // ไม่รองรับ PUT/DELETE ที่ /users ตรง ๆ
        return false;
    }

    // /users/participants
    if (count($segments) === 2 && ($segments[1] ?? '') === 'participants') {
        if ($method === 'GET') {
            $controller->participants();
            return true;
        }
        return false;
    }

    // /users/{id}
    $idSeg = $segments[1] ?? '';
    if (!ctype_digit((string)$idSeg)) {
        return false;
    }
    $personId = (int)$idSeg;

    if ($method === 'POST') {
        $override = $_POST['_method'] ?? ($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'] ?? '');
        if (strtoupper((string)$override) === 'PUT') {
            $controller->update($personId);
            return true;
        }
    }

    if ($method === 'GET') {
        $controller->get($personId);
        return true;
    }
    if ($method === 'PUT') {
        $controller->update($personId);
        return true;
    }
    if ($method === 'DELETE') {
        $controller->delete($personId);
        return true;
    }

    return false;
}

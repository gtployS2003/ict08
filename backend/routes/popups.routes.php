<?php
// backend/routes/popups.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/popups.controller.php';

function popups_routes(string $method, array $segments, PDO $pdo): bool
{
    if (($segments[0] ?? '') !== 'popups') {
        return false;
    }

    $controller = new PopupsController($pdo);

    if (count($segments) === 1) {
        if ($method === 'GET') {
            $controller->index();
            return true;
        }
        if ($method === 'POST') {
            $controller->create();
            return true;
        }
        return true;
    }

    if (count($segments) === 2 && ctype_digit((string)$segments[1])) {
        $id = (int)$segments[1];

        if ($method === 'GET') {
            $controller->show($id);
            return true;
        }
        if ($method === 'PUT') {
            $controller->update($id);
            return true;
        }
        if ($method === 'DELETE') {
            $controller->delete($id);
            return true;
        }
        return true;
    }

    return false;
}

<?php
// backend/routes/requests.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/requests.controller.php';

/**
 * Routes: requests
 */
function requests_routes(string $method, array $segments, PDO $pdo): bool
{
    if (($segments[0] ?? '') !== 'requests') {
        return false;
    }

    $controller = new RequestsController($pdo);

    // /requests
    if (($segments[1] ?? '') === '') {

        // POST /requests
        if ($method === 'POST') {
            $controller->create();
            return true;
        }

        // (เผื่ออนาคต)
        // if ($method === 'GET') {
        //     $controller->index();
        //     return true;
        // }

        return false;
    }

    // /requests/{id}
    $idRaw = $segments[1] ?? '';
    if (!ctype_digit((string)$idRaw)) {
        return false;
    }

    // (เผื่ออนาคต)
    // if ($method === 'GET') {
    //     $controller->show((int)$idRaw);
    //     return true;
    // }

    return false;
}

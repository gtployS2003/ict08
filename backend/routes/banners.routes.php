<?php
// backend/routes/banners.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/banners.controller.php';

/**
 * Routes: banners
 *  - /banners
 *  - /banners/refs
 *  - /banners/{id}
 */
function banners_routes(string $method, array $segments, PDO $pdo): bool
{
    if (($segments[0] ?? '') !== 'banners') {
        return false;
    }

    $controller = new BannersController($pdo);

    // /banners
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

    // /banners/refs
    if (count($segments) === 2 && ($segments[1] ?? '') === 'refs') {
        if ($method === 'GET') {
            $controller->refs();
            return true;
        }
        return true;
    }

    // /banners/{id}
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

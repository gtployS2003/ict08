<?php
// backend/routes/site_structure.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/site_structure.controller.php';

/**
 * Routes: site-structures
 *  - GET    /site-structures?q=&page=&limit=&public=1
 *  - POST   /site-structures
 *  - PUT    /site-structures/{id}
 *  - DELETE /site-structures/{id}
 */
function site_structure_routes(string $method, array $segments, PDO $pdo): bool
{
    if (($segments[0] ?? '') !== 'site-structures') {
        return false;
    }

    $controller = new SiteStructureController($pdo);

    // /site-structures
    if (count($segments) === 1) {
        if ($method === 'GET') {
            $controller->index();
            return true;
        }

        if ($method === 'POST') {
            $controller->create();
            return true;
        }

        fail('Method Not Allowed', 405);
        return true;
    }

    // /site-structures/{id}
    if (count($segments) === 2 && ctype_digit((string)$segments[1])) {
        $id = (int)$segments[1];

        if ($method === 'PUT' || $method === 'PATCH') {
            $controller->update($id);
            return true;
        }

        if ($method === 'DELETE') {
            $controller->delete($id);
            return true;
        }

        fail('Method Not Allowed', 405);
        return true;
    }

    fail('Not Found', 404);
    return true;
}

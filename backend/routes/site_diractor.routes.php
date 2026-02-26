<?php
// backend/routes/site_diractor.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/site_diractor.controller.php';

/**
 * Routes: site-diractors
 *  - GET    /site-diractors?q=&page=&limit=&public=1
 *  - POST   /site-diractors
 *  - PUT    /site-diractors/{id}
 *  - DELETE /site-diractors/{id}
 */
function site_diractor_routes(string $method, array $segments, PDO $pdo): bool
{
    if (($segments[0] ?? '') !== 'site-diractors') {
        return false;
    }

    $controller = new SiteDiractorController($pdo);

    // /site-diractors
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

    // /site-diractors/{id}
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

        return true;
    }

    return false;
}

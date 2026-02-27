<?php
// backend/routes/site_mission.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/site_mission.controller.php';

/**
 * Routes: site-missions
 *  - GET    /site-missions?q=&page=&limit=&public=1
 *  - POST   /site-missions
 *  - PUT    /site-missions/{id}
 *  - DELETE /site-missions/{id}
 *  - PATCH  /site-missions/reorder
 */
function site_mission_routes(string $method, array $segments, PDO $pdo): bool
{
    if (($segments[0] ?? '') !== 'site-missions') {
        return false;
    }

    $controller = new SiteMissionController($pdo);

    // /site-missions
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

    // /site-missions/reorder
    if (count($segments) === 2 && ($segments[1] ?? '') === 'reorder') {
        if ($method === 'PATCH' || $method === 'PUT' || $method === 'POST') {
            $controller->reorder();
            return true;
        }

        fail('Method Not Allowed', 405);
        return true;
    }

    // /site-missions/{id}
    if (count($segments) === 2 && ctype_digit((string)$segments[1])) {
        $id = (int)$segments[1];

        if ($method === 'PUT' || $method === 'PATCH' || $method === 'POST') {
            // POST may come with method override
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

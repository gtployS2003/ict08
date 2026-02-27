<?php
// backend/routes/home_mission_img.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/home_mission_img.controller.php';

/**
 * Routes: home-mission-img
 *  - GET    /home-mission-img?q=&page=&limit=&public=1
 *  - POST   /home-mission-img/upload
 *  - DELETE /home-mission-img/{id}
 */
function home_mission_img_routes(string $method, array $segments, PDO $pdo): bool
{
    if (($segments[0] ?? '') !== 'home-mission-img') {
        return false;
    }

    $controller = new HomeMissionImgController($pdo);

    // /home-mission-img
    if (count($segments) === 1) {
        if ($method === 'GET') {
            $controller->index();
            return true;
        }

        return true;
    }

    // /home-mission-img/upload
    if (count($segments) === 2 && ($segments[1] ?? '') === 'upload') {
        if ($method === 'POST') {
            $controller->upload();
            return true;
        }

        return true;
    }

    // /home-mission-img/{id}
    if (count($segments) === 2 && ctype_digit((string)$segments[1])) {
        $id = (int)$segments[1];

        if ($method === 'DELETE') {
            $controller->delete($id);
            return true;
        }

        return true;
    }

    return false;
}

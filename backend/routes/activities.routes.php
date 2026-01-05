<?php
// backend/routes/activities.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/activities.controller.php';

function activities_routes(string $method, array $segments, PDO $pdo): bool {
    $ctrl = new ActivitiesController($pdo);

    // GET /activities
    if ($method === 'GET' && ($segments[0] ?? '') === 'activities' && !isset($segments[1])) {
        $ctrl->list(); return true;
    }

    // GET /activities/{id}
    if ($method === 'GET' && ($segments[0] ?? '') === 'activities' && isset($segments[1])) {
        $ctrl->get((int)$segments[1]); return true;
    }

    return false;
}

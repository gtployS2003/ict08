<?php
// backend/routes/notifications.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/notifications.controller.php';

/**
 * Routes:
 * - GET /notifications?page=&limit=
 */
function notifications_routes(string $method, array $segments, PDO $pdo): bool
{
    if (!isset($segments[0]) || $segments[0] !== 'notifications') {
        return false;
    }

    $ctl = new NotificationsController($pdo);

    // GET /notifications
    if ($method === 'GET' && count($segments) === 1) {
        $ctl->index();
        return true;
    }

    return false;
}

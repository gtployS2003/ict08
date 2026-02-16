<?php
// backend/routes/user_notification_channel.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/user_notification_channel.controller.php';

/**
 * Routes: user-notification-channels
 */
function user_notification_channel_routes(string $method, array $segments, PDO $pdo): bool
{
    if (($segments[0] ?? '') !== 'user-notification-channels') {
        return false;
    }

    $controller = new UserNotificationChannelController($pdo);

    // /user-notification-channels
    if (($segments[1] ?? '') === '') {

        // GET /user-notification-channels?user_id=&page=&limit=
        if ($method === 'GET') {
            $controller->index();
            return true;
        }

        return false;
    }

    // ✅ /user-notification-channels/users
    if (($segments[1] ?? '') === 'users') {
        // GET /user-notification-channels/users?q=&limit=
        if ($method === 'GET') {
            $controller->users();
            return true;
        }
        return false;
    }

    // /user-notification-channels/bootstrap
    if (($segments[1] ?? '') === 'bootstrap') {
        if ($method === 'POST') {
            $controller->bootstrap();
            return true;
        }
        return false;
    }

    // /user-notification-channels/{id}
    $idRaw = $segments[1] ?? '';
    if (!ctype_digit((string)$idRaw)) {
        return false;
    }
    $id = (int)$idRaw;

    // GET /user-notification-channels/{id}
    if ($method === 'GET') {
        $controller->show($id);
        return true;
    }

    // PUT /user-notification-channels/{id}
    if ($method === 'PUT') {
        $controller->update($id);
        return true;
    }

    return false;
}

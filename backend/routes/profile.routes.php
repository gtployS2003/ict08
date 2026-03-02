<?php
// backend/routes/profile.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/profile.controller.php';

/**
 * Routes:
 * - GET    /profile/me
 * - PUT    /profile/me
 * - DELETE /profile/me
 * - POST   /profile/logout
 */
function profile_routes(string $method, array $segments, PDO $pdo): bool
{
    if (($segments[0] ?? '') !== 'profile') {
        return false;
    }

    $ctl = new ProfileController($pdo);

    // /profile/me
    if (count($segments) === 2 && ($segments[1] ?? '') === 'me') {
        if ($method === 'GET') {
            $ctl->me();
            return true;
        }
        if ($method === 'PUT') {
            $ctl->updateMe();
            return true;
        }
        if ($method === 'DELETE') {
            $ctl->deleteMe();
            return true;
        }
        return false;
    }

    // /profile/logout
    if (count($segments) === 2 && ($segments[1] ?? '') === 'logout') {
        if ($method === 'POST') {
            $ctl->logout();
            return true;
        }
        return false;
    }

    return false;
}

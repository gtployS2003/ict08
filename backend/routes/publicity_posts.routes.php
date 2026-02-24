<?php
// backend/routes/publicity_posts.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/publicity_posts.controller.php';

/**
 * Routes:
 * - GET  /publicity-posts?page=&limit=&q=
 * - POST /publicity-posts
 * - GET  /publicity-posts/eligible-events
 * - GET  /publicity-posts/{eventId}
 * - PUT  /publicity-posts/{eventId}
 */
function publicity_posts_routes(string $method, array $segments, PDO $pdo): bool
{
    if (($segments[0] ?? '') !== 'publicity-posts') {
        return false;
    }

    $ctl = new PublicityPostsController($pdo);

    // GET /publicity-posts/eligible-events
    if ($method === 'GET' && count($segments) === 2 && $segments[1] === 'eligible-events') {
        $ctl->eligibleEvents();
        return true;
    }

    // /publicity-posts
    if (count($segments) === 1) {
        if ($method === 'GET') {
            $ctl->index();
            return true;
        }
        if ($method === 'POST') {
            $ctl->create();
            return true;
        }
        return false;
    }

    // /publicity-posts/{eventId}
    if (count($segments) === 2 && is_numeric($segments[1])) {
        $eventId = (int)$segments[1];

        if ($method === 'GET') {
            $ctl->show($eventId);
            return true;
        }
        if ($method === 'PUT' || $method === 'PATCH') {
            $ctl->update($eventId);
            return true;
        }
    }

    return false;
}

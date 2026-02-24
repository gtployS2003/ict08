<?php
// backend/routes/event_templates.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/event_templates.controller.php';

/**
 * Routes: event-templates
 */
function event_templates_routes(string $method, array $segments, PDO $pdo): bool
{
    if (($segments[0] ?? '') !== 'event-templates') {
        return false;
    }

    $ctl = new EventTemplatesController($pdo);

    // /event-templates/by-publicity-post/{id}
    if (($segments[1] ?? '') === 'by-publicity-post' && isset($segments[2]) && ctype_digit((string)$segments[2])) {
        $id = (int)$segments[2];
        if ($method === 'GET') {
            $ctl->showByPublicityPost($id);
            return true;
        }
        if ($method === 'PUT' || $method === 'PATCH') {
            $ctl->upsertByPublicityPost($id);
            return true;
        }
        return false;
    }

    return false;
}

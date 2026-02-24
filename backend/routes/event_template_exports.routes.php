<?php
// backend/routes/event_template_exports.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/event_template_exports.controller.php';

/**
 * Routes: event-template-exports
 */
function event_template_exports_routes(string $method, array $segments, PDO $pdo): bool
{
    if (($segments[0] ?? '') !== 'event-template-exports') {
        return false;
    }

    $ctl = new EventTemplateExportsController($pdo);

    // /event-template-exports/by-event-template/{id}
    if (($segments[1] ?? '') === 'by-event-template' && isset($segments[2]) && ctype_digit((string)$segments[2])) {
        $id = (int)$segments[2];
        if ($method === 'POST') {
            $ctl->upsertByEventTemplate($id);
            return true;
        }
        return false;
    }

    return false;
}

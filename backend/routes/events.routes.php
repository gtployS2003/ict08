<?php
// backend/routes/events.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/events.controller.php';

/**
 * Routes:
 * - GET /events/{id}
 * - PUT /events/{id}
 * - DELETE /events/{id}
 * - GET /events/by-request/{requestId}
 */
function events_routes(string $method, array $segments, PDO $pdo): bool
{
    if (!isset($segments[0]) || $segments[0] !== 'events') {
        return false;
    }

    $ctl = new EventsController($pdo);

    // GET /events?from=YYYY-MM-DD&to=YYYY-MM-DD
    if ($method === 'GET' && count($segments) === 1) {
        $ctl->index();
        return true;
    }

    // GET /events/table?page=&limit=&q=
    if ($method === 'GET' && count($segments) === 2 && $segments[1] === 'table') {
        $ctl->table();
        return true;
    }

    // POST /events/internal
    if ($method === 'POST' && count($segments) === 2 && $segments[1] === 'internal') {
        $ctl->createInternal();
        return true;
    }

    // GET /events/{id}/logs
    if ($method === 'GET' && count($segments) === 3 && is_numeric($segments[1]) && $segments[2] === 'logs') {
        $ctl->logs((int)$segments[1]);
        return true;
    }

    // GET /events/by-request/{requestId}
    if ($method === 'GET' && count($segments) === 3 && $segments[1] === 'by-request' && is_numeric($segments[2])) {
        $ctl->showByRequest((int)$segments[2]);
        return true;
    }

    // GET /events/{id}/media
    if ($method === 'GET' && count($segments) === 3 && is_numeric($segments[1]) && $segments[2] === 'media') {
        $ctl->media((int)$segments[1]);
        return true;
    }

    // /events/{id}
    if (count($segments) === 2 && is_numeric($segments[1])) {
        $id = (int)$segments[1];

        if ($method === 'GET') {
            $ctl->show($id);
            return true;
        }
        if ($method === 'PUT') {
            $ctl->update($id);
            return true;
        }
        if ($method === 'DELETE') {
            $ctl->delete($id);
            return true;
        }
    }

    // /events/{id}/report
    if (count($segments) === 3 && is_numeric($segments[1]) && $segments[2] === 'report') {
        $id = (int)$segments[1];
        if ($method === 'GET') {
            $ctl->report($id);
            return true;
        }
    }

    // /events/{id}/report/pictures
    if (count($segments) === 4 && is_numeric($segments[1]) && $segments[2] === 'report' && $segments[3] === 'pictures') {
        $id = (int)$segments[1];
        if ($method === 'POST') {
            $ctl->uploadReportPictures($id);
            return true;
        }
    }

    // /events/{id}/report/pictures/{pictureId}
    if (count($segments) === 5 && is_numeric($segments[1]) && $segments[2] === 'report' && $segments[3] === 'pictures' && is_numeric($segments[4])) {
        $id = (int)$segments[1];
        $pid = (int)$segments[4];
        if ($method === 'DELETE') {
            $ctl->deleteReportPicture($id, $pid);
            return true;
        }
    }

    return false;
}

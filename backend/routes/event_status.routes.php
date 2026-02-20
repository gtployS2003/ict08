<?php
// backend/routes/event_status.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/event_status.controller.php';

function event_status_routes(string $method, array $segments, PDO $pdo): bool
{
    if (($segments[0] ?? '') !== 'event-status') return false;

    $c = new EventStatusController($pdo);

    // /event-status
    if (($segments[1] ?? '') === '') {
        if ($method === 'GET') { $c->index(); return true; }
        if ($method === 'POST') { $c->create(); return true; }
        return false;
    }

    // /event-status/{id}
    $idRaw = $segments[1] ?? '';
    if (!ctype_digit((string)$idRaw)) return false;
    $id = (int)$idRaw;

    if ($method === 'GET') { $c->show($id); return true; }
    if ($method === 'PUT') { $c->update($id); return true; }
    if ($method === 'DELETE') { $c->delete($id); return true; }

    return false;
}

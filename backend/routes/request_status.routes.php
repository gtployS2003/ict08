<?php
// backend/routes/request_status.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/request_status.controller.php';

function request_status_routes(string $method, array $segments, PDO $pdo): bool
{
    if (($segments[0] ?? '') !== 'request-status') return false;

    $c = new RequestStatusController($pdo);

    // /request-status
    if (($segments[1] ?? '') === '') {
        if ($method === 'GET') { $c->index(); return true; }
        if ($method === 'POST') { $c->create(); return true; }
        return false;
    }

    // /request-status/{id}
    $idRaw = $segments[1] ?? '';
    if (!ctype_digit((string)$idRaw)) return false;
    $id = (int)$idRaw;

    if ($method === 'GET') { $c->show($id); return true; }
    if ($method === 'PUT') { $c->update($id); return true; }
    if ($method === 'DELETE') { $c->delete($id); return true; }

    return false;
}

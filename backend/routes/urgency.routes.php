<?php
// backend/routes/urgency.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/urgency.controller.php';

function urgency_routes(string $method, array $segments, PDO $pdo): bool
{
    if (($segments[0] ?? '') !== 'urgency') {
        return false;
    }

    $c = new UrgencyController($pdo);

    // /urgency
    if (($segments[1] ?? '') === '') {
        if ($method === 'GET') {
            $c->index();
            return true;
        }
        if ($method === 'POST') {
            $c->create();
            return true;
        }
        return false;
    }

    // /urgency/{id}
    $idRaw = $segments[1] ?? '';
    if (!ctype_digit((string)$idRaw)) {
        return false;
    }
    $id = (int)$idRaw;

    if ($method === 'GET') {
        $c->show($id);
        return true;
    }

    if ($method === 'PUT') {
        $c->update($id);
        return true;
    }

    if ($method === 'DELETE') {
        $c->delete($id);
        return true;
    }

    return false;
}

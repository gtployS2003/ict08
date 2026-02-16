<?php
// backend/routes/channels.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/channels.controller.php';

/**
 * Routes: channels
 */
function channels_routes(string $method, array $segments, PDO $pdo): bool
{
    if (($segments[0] ?? '') !== 'channels') {
        return false;
    }

    $controller = new ChannelsController($pdo);

    // /channels
    if (($segments[1] ?? '') === '') {

        // GET /channels?q=&page=&limit=
        if ($method === 'GET') {
            $controller->index();
            return true;
        }

        // POST /channels (optional)
        if ($method === 'POST') {
            $controller->create();
            return true;
        }

        return false;
    }

    // /channels/{id}
    $idRaw = $segments[1] ?? '';
    if (!ctype_digit((string)$idRaw)) {
        return false;
    }
    $id = (int)$idRaw;

    // GET /channels/{id}
    if ($method === 'GET') {
        $controller->show($id);
        return true;
    }

    // PUT /channels/{id} (optional)
    if ($method === 'PUT') {
        $controller->update($id);
        return true;
    }

    // DELETE /channels/{id} (optional)
    if ($method === 'DELETE') {
        $controller->delete($id);
        return true;
    }

    return false;
}

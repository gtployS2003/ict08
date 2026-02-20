<?php
// backend/routes/requests.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/requests.controller.php';

/**
 * Routes: requests
 */
function requests_routes(string $method, array $segments, PDO $pdo): bool
{
    if (($segments[0] ?? '') !== 'requests') {
        return false;
    }

    $controller = new RequestsController($pdo);

    // GET /requests/pending
    if (($segments[1] ?? '') === 'pending') {
        if ($method === 'GET') {
            $controller->pending();
            return true;
        }
        return false;
    }

    // /requests
    if (($segments[1] ?? '') === '') {

        // POST /requests
        if ($method === 'POST') {
            $controller->create();
            return true;
        }

        // (เผื่ออนาคต)
        // if ($method === 'GET') {
        //     $controller->index();
        //     return true;
        // }

        return false;
    }

    // /requests/{id}
    $idRaw = $segments[1] ?? '';
    if (!ctype_digit((string)$idRaw)) {
        return false;
    }

    $id = (int)$idRaw;

    // GET /requests/{id}
    if ($method === 'GET' && count($segments) === 2) {
        $controller->show($id);
        return true;
    }

    // PUT /requests/{id}
    if ($method === 'PUT' && count($segments) === 2) {
        $controller->update($id);
        return true;
    }

    // DELETE /requests/{id}
    if ($method === 'DELETE' && count($segments) === 2) {
        $controller->delete($id);
        return true;
    }

    // POST /requests/{id}/approve
    if ($method === 'POST' && ($segments[2] ?? '') === 'approve') {
        $controller->approve($id);
        return true;
    }

    // POST /requests/{id}/attachments
    if ($method === 'POST' && ($segments[2] ?? '') === 'attachments') {
        $controller->addAttachments($id);
        return true;
    }

    // POST /requests/{id}/reject
    if ($method === 'POST' && ($segments[2] ?? '') === 'reject') {
        $controller->reject($id);
        return true;
    }

    return false;
}

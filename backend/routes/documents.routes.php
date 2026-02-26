<?php
// backend/routes/documents.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/documents.controller.php';

/**
 * Routes: documents
 *  - /documents
 *  - /documents/{id}
 */
function documents_routes(string $method, array $segments, PDO $pdo): bool
{
    if (($segments[0] ?? '') !== 'documents') {
        return false;
    }

    $controller = new DocumentsController($pdo);

    // /documents/upload
    if (count($segments) === 2 && ($segments[1] ?? '') === 'upload') {
        if ($method === 'POST') {
            $controller->upload();
            return true;
        }

        return true;
    }

    // /documents
    if (count($segments) === 1) {
        if ($method === 'GET') {
            $controller->index();
            return true;
        }
        if ($method === 'POST') {
            $controller->create();
            return true;
        }

        return true;
    }

    // /documents/{id}
    if (count($segments) === 2 && ctype_digit((string)$segments[1])) {
        $id = (int)$segments[1];

        if ($method === 'GET') {
            $controller->show($id);
            return true;
        }
        if ($method === 'PUT') {
            $controller->update($id);
            return true;
        }
        if ($method === 'DELETE') {
            $controller->delete($id);
            return true;
        }

        return true;
    }

    return false;
}

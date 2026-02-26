<?php
// backend/routes/news.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/news.controller.php';
require_once __DIR__ . '/../controllers/news_documents.controller.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';

function news_routes(string $method, array $segments, PDO $pdo): bool
{
    $ctrl = new NewsController($pdo);
    $newsDocs = new NewsDocumentsController($pdo);

    // IMPORTANT: nested routes must be matched before generic /news/{id}

    // GET /news
    if ($method === 'GET' && ($segments[0] ?? '') === 'news' && !isset($segments[1])) {
        $ctrl->list();
        return true;
    }

    // GET /news/{id}/documents
    if (
        $method === 'GET'
        && ($segments[0] ?? '') === 'news'
        && isset($segments[1])
        && ctype_digit((string)$segments[1])
        && ($segments[2] ?? '') === 'documents'
    ) {
        $newsDocs->listByNewsId((int)$segments[1]);
        return true;
    }

    // GET /news/{id}
    if (
        $method === 'GET'
        && ($segments[0] ?? '') === 'news'
        && isset($segments[1])
        && ctype_digit((string)$segments[1])
        && !isset($segments[2])
    ) {
        $ctrl->get((int) $segments[1]);
        return true;
    }

    // POST /news/{id}/documents  (auth)
    if (
        $method === 'POST'
        && ($segments[0] ?? '') === 'news'
        && isset($segments[1])
        && ctype_digit((string)$segments[1])
        && ($segments[2] ?? '') === 'documents'
        && !isset($segments[3])
    ) {
        require_auth($pdo);
        $newsDocs->attach((int)$segments[1]);
        return true;
    }

    // POST /news  (auth)
    if ($method === 'POST' && ($segments[0] ?? '') === 'news' && !isset($segments[1])) {
        require_auth($pdo);
        $ctrl->create();
        return true;
    }

    // DELETE /news/{id}/documents/{document_id}  (auth)
    if (
        $method === 'DELETE'
        && ($segments[0] ?? '') === 'news'
        && isset($segments[1])
        && ctype_digit((string)$segments[1])
        && ($segments[2] ?? '') === 'documents'
        && isset($segments[3])
        && ctype_digit((string)$segments[3])
    ) {
        require_auth($pdo);
        $newsDocs->detach((int)$segments[1], (int)$segments[3]);
        return true;
    }

    // PUT /news/{id}
    if (
        $method === 'PUT'
        && ($segments[0] ?? '') === 'news'
        && isset($segments[1])
        && ctype_digit((string)$segments[1])
        && !isset($segments[2])
    ) {
        require_auth($pdo);
        $ctrl->update((int) $segments[1]);
        return true;
    }

    // DELETE /news/{id}
    if (
        $method === 'DELETE'
        && ($segments[0] ?? '') === 'news'
        && isset($segments[1])
        && ctype_digit((string)$segments[1])
        && !isset($segments[2])
    ) {
        require_auth($pdo);
        $ctrl->delete((int) $segments[1]);
        return true;
    }

    return false;
}

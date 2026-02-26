<?php
// backend/routes/link_urls.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/link_urls.controller.php';

/**
 * Routes: link-urls
 *  - /link-urls
 *  - /link-urls/{id}
 */
function link_urls_routes(string $method, array $segments, PDO $pdo): bool
{
    if (($segments[0] ?? '') !== 'link-urls') {
        return false;
    }

    $controller = new LinkUrlsController($pdo);

    // /link-urls
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

    // /link-urls/{id}
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

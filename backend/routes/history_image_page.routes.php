<?php
// backend/routes/history_image_page.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/history_image_page.controller.php';

/**
 * Routes: history-image-page
 *  - GET    /history-image-page
 *  - GET    /history-image-page/active?public=1
 *  - POST   /history-image-page/upload
 *  - PUT    /history-image-page/{id}/activate
 *  - DELETE /history-image-page/{id}
 */
function history_image_page_routes(string $method, array $segments, PDO $pdo): bool
{
    if (($segments[0] ?? '') !== 'history-image-page') {
        return false;
    }

    $controller = new HistoryImagePageController($pdo);

    // /history-image-page
    if (count($segments) === 1) {
        if ($method === 'GET') {
            $controller->index();
            return true;
        }

        return true;
    }

    // /history-image-page/active
    if (count($segments) === 2 && ($segments[1] ?? '') === 'active') {
        if ($method === 'GET') {
            $controller->active();
            return true;
        }

        return true;
    }

    // /history-image-page/upload
    if (count($segments) === 2 && ($segments[1] ?? '') === 'upload') {
        if ($method === 'POST') {
            $controller->upload();
            return true;
        }

        return true;
    }

    // /history-image-page/{id}/activate
    if (count($segments) === 3 && ctype_digit((string)$segments[1]) && ($segments[2] ?? '') === 'activate') {
        $id = (int)$segments[1];
        if ($method === 'PUT' || $method === 'PATCH') {
            $controller->activate($id);
            return true;
        }
        return true;
    }

    // /history-image-page/{id}
    if (count($segments) === 2 && ctype_digit((string)$segments[1])) {
        $id = (int)$segments[1];

        if ($method === 'DELETE') {
            $controller->delete($id);
            return true;
        }

        return true;
    }

    return false;
}

<?php
// backend/routes/template_types.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/template_types.controller.php';

/**
 * Routes: template-types
 */
function template_types_routes(string $method, array $segments, PDO $pdo): bool
{
    if (($segments[0] ?? '') !== 'template-types') {
        return false;
    }

    $controller = new TemplateTypesController($pdo);

    // /template-types/upload-bg
    if (($segments[1] ?? '') === 'upload-bg') {
        if ($method === 'POST') {
            $controller->uploadBg();
            return true;
        }
        return false;
    }

    // /template-types
    if (($segments[1] ?? '') === '') {
        if ($method === 'GET') {
            $controller->index();
            return true;
        }
        if ($method === 'POST') {
            $controller->create();
            return true;
        }
        return false;
    }

    // /template-types/{id}
    $idRaw = $segments[1] ?? '';
    if (!ctype_digit((string)$idRaw)) {
        return false;
    }
    $id = (int)$idRaw;

    if ($method === 'GET') {
        $controller->show($id);
        return true;
    }

    if ($method === 'PUT' || $method === 'PATCH') {
        $controller->update($id);
        return true;
    }

    if ($method === 'DELETE') {
        $controller->delete($id);
        return true;
    }

    return false;
}

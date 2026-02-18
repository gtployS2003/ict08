<?php
// backend/routes/type_of_device.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/type_of_device.controller.php';

/**
 * Routes: type-of-device
 */
function type_of_device_routes(string $method, array $segments, PDO $pdo): bool
{
    // ต้องเป็น /type-of-device
    if (($segments[0] ?? '') !== 'type-of-device') {
        return false;
    }

    $controller = new TypeOfDeviceController($pdo);

    // /type-of-device/upload-icon
    if (($segments[1] ?? '') === 'upload-icon') {
        if ($method === 'POST') {
            $controller->uploadIcon();
            return true;
        }
        return false;
    }

    // /type-of-device
    if (($segments[1] ?? '') === '') {

        // GET /type-of-device?q=&page=&limit=
        if ($method === 'GET') {
            $controller->index();
            return true;
        }

        // POST /type-of-device
        if ($method === 'POST') {
            $controller->create();
            return true;
        }

        return false;
    }

    // /type-of-device/{id}
    $idRaw = $segments[1] ?? '';
    if (!ctype_digit((string)$idRaw)) {
        return false;
    }
    $id = (int)$idRaw;

    // GET /type-of-device/{id}
    if ($method === 'GET') {
        $controller->show($id);
        return true;
    }

    // PUT /type-of-device/{id}
    if ($method === 'PUT' || $method === 'PATCH') {
        $controller->update($id);
        return true;
    }

    // DELETE /type-of-device/{id}
    if ($method === 'DELETE') {
        $controller->delete($id);
        return true;
    }

    return false;
}

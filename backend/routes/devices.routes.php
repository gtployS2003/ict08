<?php
// backend/routes/devices.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../controllers/devices.controller.php';

/**
 * Routes: devices
 *
 * รองรับ:
 *  - GET    /devices?q=&page=&limit=&province_id=
 *  - GET    /devices/{id}
 *  - POST   /devices
 *  - PUT    /devices/{id}    (หรือ PUT /devices?id=1)
 *  - DELETE /devices/{id}    (หรือ DELETE /devices?id=1)
 */
function devices_routes(string $method, array $segments, PDO $pdo): bool
{
    if (($segments[0] ?? '') !== 'devices') {
        return false;
    }

    $controller = new DevicesController($pdo);

    $id = 0;
    if (isset($segments[1]) && ctype_digit((string)$segments[1])) {
        $id = (int)$segments[1];
    }

    // /devices (no id)
    if (count($segments) === 1) {
        if ($method === 'GET') {
            $controller->index();
            return true;
        }
        if ($method === 'POST') {
            $controller->store();
            return true;
        }
        if ($method === 'PUT') {
            // รองรับ PUT /devices?id=1 หรือ id ใน body
            $controller->update(0);
            return true;
        }
        if ($method === 'DELETE') {
            // รองรับ DELETE /devices?id=1 หรือ id ใน body
            $controller->destroy(0);
            return true;
        }

        fail('Method Not Allowed', 405);
        return true;
    }

    // /devices/{id}
    if (count($segments) === 2 && $id > 0) {
        if ($method === 'GET') {
            $controller->show($id);
            return true;
        }
        if ($method === 'PUT') {
            $controller->update($id);
            return true;
        }
        if ($method === 'DELETE') {
            $controller->destroy($id);
            return true;
        }

        fail('Method Not Allowed', 405);
        return true;
    }

    // เส้นทางไม่ตรงรูปแบบ
    return false;
}

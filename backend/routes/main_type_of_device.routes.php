<?php
// backend/routes/main_type_of_device.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../controllers/main_type_of_device.controller.php';

function main_type_of_device_routes(PDO $pdo, string $method, array $parts): bool
{
    if (($parts[0] ?? '') !== 'api') return false;
    if (($parts[1] ?? '') !== 'main-type-of-device') return false;

    // กัน path แปลก ๆ เช่น /api/main-type-of-device/1/xxx
    if (count($parts) > 3) {
        fail("Not found", 404, ["detail" => "Invalid path"]);
    }

    $ctl = new MainTypeOfDeviceController($pdo);

    // /api/main-type-of-device
    if (count($parts) === 2) {
        if ($method === 'GET')  { $ctl->list();   return true; }
        if ($method === 'POST') { $ctl->create(); return true; }

        fail("Method not allowed", 405, ["allowed" => ["GET", "POST"]]);
        return true; // route นี้ match แล้ว
    }

    // /api/main-type-of-device/{id}
    $idRaw = (string)($parts[2] ?? '');
    if ($idRaw === '' || !ctype_digit($idRaw) || (int)$idRaw <= 0) {
        fail("Invalid id", 422, ["detail" => "id must be positive integer"]);
        return true;
    }
    $id = (int)$idRaw;

    if ($method === 'PUT' || $method === 'PATCH') { $ctl->update($id); return true; }
    if ($method === 'DELETE') { $ctl->delete($id); return true; }

    fail("Method not allowed", 405, ["allowed" => ["PUT", "PATCH", "DELETE"]]);
    return true;
}

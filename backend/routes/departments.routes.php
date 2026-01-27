<?php
// backend/routes/departments.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../controllers/departments.controller.php';

/**
 * Routes: departments
 *
 * รองรับ:
 *  - GET    /departments?q=&page=&limit=
 *  - POST   /departments
 *  - PUT    /departments/{id}   (หรือ PUT /departments?id=1)
 *  - DELETE /departments/{id}   (หรือ DELETE /departments?id=1)
 */
function departments_routes(string $method, array $segments, PDO $pdo): bool
{
    if (($segments[0] ?? '') !== 'departments') {
        return false;
    }

    $controller = new DepartmentsController($pdo);

    // ✅ /departments/dropdown
    if (($segments[1] ?? '') === 'dropdown') {
        if ($method === 'GET') {
            $controller->dropdown();
            return true;
        }
        fail('Method Not Allowed', 405);
        return true;
    }

    $id = 0;
    if (isset($segments[1]) && ctype_digit((string)$segments[1])) {
        $id = (int)$segments[1];
    }

    $controller = new DepartmentsController($pdo);

    // /departments (no id)
    if (count($segments) === 1) {
        if ($method === 'GET') {
            $controller->list();
            return true;
        }
        if ($method === 'POST') {
            $controller->create();
            return true;
        }
        if ($method === 'PUT') {
            // รองรับ PUT /departments?id=1 หรือ id ใน body
            $controller->update(0);
            return true;
        }
        if ($method === 'DELETE') {
            // รองรับ DELETE /departments?id=1 หรือ id ใน body
            $controller->delete(0);
            return true;
        }

        fail('Method Not Allowed', 405);
        return true;
    }

    // /departments/{id}
    if (count($segments) === 2 && $id > 0) {
        if ($method === 'PUT') {
            $controller->update($id);
            return true;
        }
        if ($method === 'DELETE') {
            $controller->delete($id);
            return true;
        }
        if ($method === 'GET') {
            // ยังไม่ได้ทำ GET by id (ถ้าต้องการค่อยเพิ่มใน model/controller)
            fail('GET by id not implemented', 405);
            return true;
        }

        fail('Method Not Allowed', 405);
        return true;
    }

    // เส้นทางไม่ตรงรูปแบบ
    return false;
}

<?php
// backend/routes/position_titles.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../controllers/position_titles.controller.php';

/**
 * Routes: position-titles
 *
 * รองรับ:
 *  - GET    /position-titles?q=&page=&limit=&organization_id=&department_id=
 *  - POST   /position-titles
 *  - PUT    /position-titles/{id}   (หรือ PUT /position-titles?id=1)
 *  - DELETE /position-titles/{id}   (หรือ DELETE /position-titles?id=1)
 */
function position_titles_routes(string $method, array $segments, PDO $pdo): bool
{
    if (($segments[0] ?? '') !== 'position-titles') {
        return false;
    }

    $controller = new PositionTitlesController($pdo);

    // ✅ /position-titles/dropdown
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

    $controller = new PositionTitlesController($pdo);

    // /position-titles (no id)
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
            // รองรับ PUT /position-titles?id=1 หรือ id ใน body
            $controller->update(0);
            return true;
        }
        if ($method === 'DELETE') {
            // รองรับ DELETE /position-titles?id=1 หรือ id ใน body
            $controller->delete(0);
            return true;
        }

        fail('Method Not Allowed', 405);
        return true;
    }

    // /position-titles/{id}
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

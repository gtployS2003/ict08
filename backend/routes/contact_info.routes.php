<?php
// backend/routes/contact_info.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/contact_info.controller.php';

/**
 * Routes: contact-info
 *
 * ตัวอย่าง path:
 *  - /contact-info
 *  - /contact-info/1
 */
function contact_info_routes(string $method, array $segments, PDO $pdo): bool
{
    // segments[0] ต้องเป็น "contact-info"
    if (($segments[0] ?? '') !== 'contact-info') {
        return false;
    }

    // ✅ controller นี้ต้องรับ PDO (เพราะใน controller เราสร้าง Model ด้วย PDO)
    $controller = new ContactInfoController($pdo);

    // /contact-info
    if (count($segments) === 1) {
        if ($method === 'GET') {
            $controller->index();   // list + join + search + pagination
            return true;
        }
        if ($method === 'POST') {
            $controller->store();   // create
            return true;
        }
        if ($method === 'PUT') {
            // รองรับ PUT /contact-info?id=1 หรือ id ใน body (controller จะ handle payload)
            $controller->update(0);
            return true;
        }
        if ($method === 'DELETE') {
            // รองรับ DELETE /contact-info?id=1 หรือ id ใน body
            $controller->destroy(0);
            return true;
        }

        // route นี้มีอยู่ แต่ method ไม่รองรับ
        http_response_code(405);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => false, 'message' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);
        return true;
    }

    // /contact-info/{id}
    if (count($segments) === 2 && ctype_digit((string)$segments[1])) {
        $id = (int)$segments[1];

        if ($method === 'GET') {
            $controller->show($id);     // get by id (join)
            return true;
        }
        if ($method === 'PUT') {
            $controller->update($id);   // update
            return true;
        }
        if ($method === 'DELETE') {
            $controller->destroy($id);  // delete
            return true;
        }

        http_response_code(405);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => false, 'message' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);
        return true;
    }

    // เส้นทางไม่ตรงรูปแบบ
    return false;
}

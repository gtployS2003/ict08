<?php
// backend/routes/organization.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/organizations.controller.php';

/**
 * Routes: organizations
 *
 * ตัวอย่าง path:
 *  - /organizations
 *  - /organizations/1
 */
function organization_routes(string $method, array $segments, PDO $pdo): bool
{
    // segments[0] ต้องเป็น "organizations"
    if (($segments[0] ?? '') !== 'organizations') {
        return false;
    }

    $controller = new OrganizationsController();

    // /organizations
    if (count($segments) === 1) {
        if ($method === 'GET') {
            // GET /organizations?q=&province_id=&organization_type_id=&page=&limit=
            $controller->list();
            return true;
        }
        if ($method === 'POST') {
            // POST /organizations
            $controller->create();
            return true;
        }
        if ($method === 'PUT') {
            // รองรับ PUT /organizations?id=1 หรือ id ใน body
            $controller->update(0);
            return true;
        }
        if ($method === 'DELETE') {
            // รองรับ DELETE /organizations?id=1 หรือ id ใน body
            $controller->delete(0);
            return true;
        }

        http_response_code(405);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => false, 'message' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);
        return true; // route นี้มีอยู่แต่ method ไม่รองรับ
    }

    // /organizations/{id}
    if (count($segments) === 2 && ctype_digit((string)$segments[1])) {
        $id = (int)$segments[1];

        if ($method === 'PUT') {
            $controller->update($id);
            return true;
        }
        if ($method === 'DELETE') {
            $controller->delete($id);
            return true;
        }
        if ($method === 'GET') {
            // ยังไม่ได้ทำ GET by id (ตอนนี้ใช้ list อย่างเดียว)
            http_response_code(405);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success' => false, 'message' => 'GET by id not implemented'], JSON_UNESCAPED_UNICODE);
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

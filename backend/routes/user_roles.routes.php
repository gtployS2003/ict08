<?php
// backend/routes/user_roles.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/user_roles.controller.php';

/**
 * Routes: user-roles (preferred) / user_roles (legacy)
 *
 * ตัวอย่าง path:
 *  - /user-roles
 *  - /user-roles/1
 *  - /user_roles
 *  - /user_roles/1
 */
function user_roles_routes(string $method, array $segments, PDO $pdo): bool
{
    $seg0 = (string)($segments[0] ?? '');

    // รองรับทั้ง "user-roles" และ "user_roles"
    if ($seg0 !== 'user-roles' && $seg0 !== 'user_roles') {
        return false;
    }

    // ถ้า controller ของคุณยังไม่ได้รับ pdo ก็ใช้แบบนี้ไปก่อน
    $controller = new UserRolesController($pdo);

    // /user-roles  หรือ /user_roles
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
            $controller->update(0);   // รองรับ PUT ?id=1 หรือ id ใน body
            return true;
        }
        if ($method === 'DELETE') {
            $controller->delete(0);   // รองรับ DELETE ?id=1 หรือ id ใน body
            return true;
        }

        return true;
    }

    // /user-roles/{id} หรือ /user_roles/{id}
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
            http_response_code(405);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(
                ['success' => false, 'message' => 'GET by id not implemented'],
                JSON_UNESCAPED_UNICODE
            );
            return true;
        }

        return true;
    }

    return false;
}

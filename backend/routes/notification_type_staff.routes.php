<?php
// backend/routes/notification_type_staff.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/notification_type_staff.controller.php';

/**
 * Routes: notification-type-staff
 *
 * Base:
 * - GET    /notification-type-staff?notification_type_id=&q=&page=&limit=
 * - POST   /notification-type-staff
 *
 * Item:
 * - PATCH  /notification-type-staff/{id}
 * - DELETE /notification-type-staff/{id}
 *
 * Extra:
 * - GET    /notification-type-staff/users?q=&page=&limit=
 */
function notification_type_staff_routes(string $method, array $segments, PDO $pdo): bool
{
    if (($segments[0] ?? '') !== 'notification-type-staff') {
        return false;
    }

    $controller = new NotificationTypeStaffController($pdo);

    // /notification-type-staff
    if (($segments[1] ?? '') === '') {

        // GET /notification-type-staff?notification_type_id=&q=&page=&limit=
        if ($method === 'GET') {
            $controller->index();
            return true;
        }

        // POST /notification-type-staff
        if ($method === 'POST') {
            $controller->upsert();
            return true;
        }

        return false;
    }

    // /notification-type-staff/users
    if (($segments[1] ?? '') === 'users') {

        // GET /notification-type-staff/users?q=&page=&limit=
        if ($method === 'GET') {
            $controller->searchUsers();
            return true;
        }

        return false;
    }

    // /notification-type-staff/{id}
    $idRaw = $segments[1] ?? '';
    if (!ctype_digit((string)$idRaw)) {
        return false;
    }
    $id = (int)$idRaw;

    // PATCH /notification-type-staff/{id}
    // หมายเหตุ: บาง env ส่ง method เป็น POST + _method=PATCH ก็ได้ (แต่ตอนนี้รองรับ PATCH ตรง ๆ ก่อน)
    if ($method === 'PATCH') {
        $controller->setEnabled($id);
        return true;
    }

    // DELETE /notification-type-staff/{id}
    if ($method === 'DELETE') {
        $controller->delete($id);
        return true;
    }

    return false;
}

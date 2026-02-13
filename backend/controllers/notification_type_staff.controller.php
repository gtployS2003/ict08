<?php
// backend/controllers/notification_type_staff.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../middleware/auth.php';

require_once __DIR__ . '/../models/NotificationTypeStaffModel.php';

final class NotificationTypeStaffController
{
    public function __construct(private PDO $pdo)
    {
    }

    /**
     * GET /notification-type-staff?notification_type_id=&q=&page=&limit=
     */
    public function index(): void
    {
        try {
            // ✅ ต้องเป็น internal เท่านั้น (ใช้ middleware ที่โปรเจกต์คุณมีอยู่)
            // ถ้าโปรเจกต์คุณใช้ auth_required() / dev_auth_required() ชื่อไม่ตรง ให้แก้เป็นของคุณ

            $notificationTypeId = (int)($_GET['notification_type_id'] ?? 0);
            $q = trim((string)($_GET['q'] ?? ''));
            $page = (int)($_GET['page'] ?? 1);
            $limit = (int)($_GET['limit'] ?? 50);

            // ถ้าไม่มี notification_type_id ให้ query ทั้งหมด (ไม่ filter)
            if ($notificationTypeId > 0) {
                $model = new NotificationTypeStaffModel($this->pdo);
                $items = $model->listByType($notificationTypeId, $q, $page, $limit);
                $total = $model->countByType($notificationTypeId, $q);
            } else {
                // Query ทั้งหมดถ้าไม่มี filter
                $model = new NotificationTypeStaffModel($this->pdo);
                // ใช้ listByType แต่ให้ 0 = query ทั้งหมด
                // หรือเขียน query ใหม่ให้ listAll
                $items = $model->listByType(0, $q, $page, $limit) ?: [];
                $total = $model->countByType(0, $q) ?: 0;
            }

            json_response([
                'error' => false,
                'data' => $items,
                'pagination' => [
                    'page' => max(1, $page),
                    'limit' => max(1, min(200, $limit)),
                    'total' => $total,
                    'totalPages' => (int)ceil($total / max(1, min(200, $limit))),
                ],
            ]);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to get notification type staff',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /notification-type-staff
     * body (json): { notification_type_id, user_id, is_enabled? }
     *
     * -> ใช้ upsert: ถ้ามีอยู่แล้ว update is_enabled
     */
    public function upsert(): void
    {
        try {

            $body = read_json_body(); // helper ในโปรเจกต์คุณมักมี (ถ้าไม่มีจะ fallback ด้านล่าง)
            if (!is_array($body)) {
                // fallback: รับจาก form-data / x-www-form-urlencoded
                $body = $_POST ?? [];
            }

            $notificationTypeId = (int)($body['notification_type_id'] ?? 0);
            $userId = (int)($body['user_id'] ?? 0);
            $isEnabled = (int)($body['is_enabled'] ?? 1);

            if ($notificationTypeId <= 0 || $userId <= 0) {
                json_response([
                    'error' => true,
                    'message' => 'notification_type_id and user_id are required',
                ], 400);
                return;
            }

            $model = new NotificationTypeStaffModel($this->pdo);
            $id = $model->upsert($notificationTypeId, $userId, $isEnabled);

            if ($id <= 0) {
                json_response([
                    'error' => true,
                    'message' => 'Failed to upsert notification type staff',
                ], 500);
                return;
            }

            $row = $model->getById($id);

            json_response([
                'error' => false,
                'message' => 'Saved',
                'data' => $row,
            ]);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to save notification type staff',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PATCH /notification-type-staff/{id}
     * body: { is_enabled }
     */
    public function setEnabled(int $id): void
    {
        try {

            $id = max(1, $id);

            $body = read_json_body();
            if (!is_array($body)) $body = $_POST ?? [];

            $isEnabled = (int)($body['is_enabled'] ?? -1);
            if ($isEnabled !== 0 && $isEnabled !== 1) {
                json_response([
                    'error' => true,
                    'message' => 'is_enabled must be 0 or 1',
                ], 400);
                return;
            }

            $model = new NotificationTypeStaffModel($this->pdo);

            // เช็คว่ามี row ก่อน
            $row = $model->getById($id);
            if (!$row) {
                json_response([
                    'error' => true,
                    'message' => 'Not found',
                ], 404);
                return;
            }

            $ok = $model->setEnabledById($id, $isEnabled);
            $updated = $model->getById($id);

            json_response([
                'error' => false,
                'message' => $ok ? 'Updated' : 'No change',
                'data' => $updated,
            ]);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to update notification type staff',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /notification-type-staff/{id}
     */
    public function delete(int $id): void
    {
        try {

            $id = max(1, $id);

            $model = new NotificationTypeStaffModel($this->pdo);
            $row = $model->getById($id);

            if (!$row) {
                json_response([
                    'error' => true,
                    'message' => 'Not found',
                ], 404);
                return;
            }

            $ok = $model->deleteById($id);

            json_response([
                'error' => false,
                'message' => $ok ? 'Deleted' : 'No change',
            ]);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to delete notification type staff',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * (Optional) GET /notification-type-staff/users?q=&page=&limit=
     * ใช้ค้นหา staff จากตาราง user เพื่อเอามาเพิ่มใน type นี้
     */
    public function searchUsers(): void
    {
        try {

            $q = trim((string)($_GET['q'] ?? ''));
            $page = (int)($_GET['page'] ?? 1);
            $limit = (int)($_GET['limit'] ?? 20);

            $model = new NotificationTypeStaffModel($this->pdo);
            $items = $model->searchUsers($q, $page, $limit);

            json_response([
                'error' => false,
                'data' => $items,
                'pagination' => [
                    'page' => max(1, $page),
                    'limit' => max(1, min(200, $limit)),
                    'total' => null, // ไม่จำเป็น (ถ้าต้องการค่อยทำ countUserSearch())
                ],
            ]);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to search users',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }
}

/**
 * Helper: read json body
 * - ถ้าโปรเจกต์คุณมี helper นี้อยู่แล้ว ให้ลบบล็อคนี้ทิ้งได้เลย
 */
if (!function_exists('read_json_body')) {
    function read_json_body(): ?array
    {
        $raw = file_get_contents('php://input');
        if (!is_string($raw) || trim($raw) === '') return null;

        $data = json_decode($raw, true);
        return is_array($data) ? $data : null;
    }
}

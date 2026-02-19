<?php
// backend/models/NotificationModel.php
declare(strict_types=1);

class NotificationModel
{
    public function __construct(private PDO $pdo) {}

    /**
     * สร้างแจ้งเตือน: มีคำขอใหม่เข้ามา (request)
     *
     * Requirements (ตาม DB):
     * - request_id = request.request_id
     * - event_id = null
     * - notification_type_id ต้องมี
     * - message ต้องมี
     * - create_at ให้ DB set (DEFAULT current_timestamp)
     * - schedule_at = null
     */
    public function createRequestPending(array $data): int
    {
        $requestId = isset($data['request_id']) ? (int) $data['request_id'] : 0;
        if ($requestId <= 0) {
            throw new InvalidArgumentException('request_id is required');
        }

        $notificationTypeId = isset($data['notification_type_id']) ? (int) $data['notification_type_id'] : 0;
        if ($notificationTypeId <= 0) {
            throw new InvalidArgumentException('notification_type_id is required');
        }

        $message = trim((string)($data['message'] ?? ''));
        if ($message === '') {
            throw new InvalidArgumentException('message is required');
        }

        $sql = "
            INSERT INTO notification (
                request_id,
                event_id,
                notification_type_id,
                message,
                schedule_at
            ) VALUES (
                :request_id,
                :event_id,
                :notification_type_id,
                :message,
                :schedule_at
            )
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':request_id' => $requestId,
            ':event_id' => null,
            ':notification_type_id' => $notificationTypeId,
            ':message' => $message,
            ':schedule_at' => null,
        ]);

        return (int)$this->pdo->lastInsertId();
    }

    /**
     * สร้างแจ้งเตือน: ผู้สมัครสมาชิกใหม่ (รอการอนุมัติ)
     *
     * Requirements:
     * - notification_type_id = 1 (user_registration_pending)
     * - message ต้องมี
     * - event_id = null
     * - schedule_at = null
     */
    public function createUserRegistrationPending(array $data): int
    {
        $message = trim((string)($data['message'] ?? ''));
        if ($message === '') {
            throw new InvalidArgumentException('message is required');
        }

        // ค่าเริ่มต้น (แก้ได้ตาม DB จริง)
        $notificationTypeId = 1; // ✅ fixed: user_registration_pending
        $sql = "
            INSERT INTO notification (
                request_id,
                event_id,
                notification_type_id,
                message,
                schedule_at
            ) VALUES (
                :request_id,
                :event_id,
                :notification_type_id,
                :message,
                :schedule_at
            )
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':request_id' => null,
            ':event_id' => null,
            ':notification_type_id' => $notificationTypeId,
            ':message' => $message,
            ':schedule_at' => null,
        ]);

        return (int)$this->pdo->lastInsertId();
    }

    /**
     * (Optional) ดึงรายการแจ้งเตือนตาม type (เช่น 1 = pending registration)
     * ใช้ฝั่งหลังบ้านถ้าต้องการ list รายการอนุมัติ
     */
    public function listByType(int $typeId, int $limit = 50, int $offset = 0): array
    {
        $limit = max(1, min(200, $limit));
        $offset = max(0, $offset);

        $sql = "
            SELECT
                notification_id,
                request_id,
                event_id,
                notification_type_id,
                message,
                create_at,
                schedule_at
            FROM notification
            WHERE notification_type_id = :tid
            ORDER BY notification_id DESC
            LIMIT :lim OFFSET :off
        ";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':tid', $typeId, PDO::PARAM_INT);
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':off', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * List notifications for multiple types (IN clause).
     *
     * @param array<int,int> $typeIds
     * @return array<int, array<string,mixed>>
     */
    public function listByTypeIds(array $typeIds, int $limit = 50, int $offset = 0): array
    {
        $limit = max(1, min(200, $limit));
        $offset = max(0, $offset);

        $clean = [];
        foreach ($typeIds as $id) {
            $id = (int)$id;
            if ($id > 0) $clean[] = $id;
        }
        $clean = array_values(array_unique($clean));
        if (empty($clean)) return [];

        // build placeholders safely
        $placeholders = [];
        $params = [];
        foreach ($clean as $i => $id) {
            $k = ':t' . $i;
            $placeholders[] = $k;
            $params[$k] = $id;
        }
        $in = implode(',', $placeholders);

        $sql = "
            SELECT
                n.notification_id,
                n.request_id,
                n.event_id,
                n.notification_type_id,
                nt.notification_type,
                nt.meaning,
                n.message,
                n.create_at,
                n.schedule_at
            FROM notification n
            LEFT JOIN notification_type nt
                ON nt.notification_type_id = n.notification_type_id
            WHERE n.notification_type_id IN ($in)
            ORDER BY n.notification_id DESC
            LIMIT :lim OFFSET :off
        ";

        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, (int)$v, PDO::PARAM_INT);
        }
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':off', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * Count notifications for multiple types.
     *
     * @param array<int,int> $typeIds
     */
    public function countByTypeIds(array $typeIds): int
    {
        $clean = [];
        foreach ($typeIds as $id) {
            $id = (int)$id;
            if ($id > 0) $clean[] = $id;
        }
        $clean = array_values(array_unique($clean));
        if (empty($clean)) return 0;

        $placeholders = [];
        $params = [];
        foreach ($clean as $i => $id) {
            $k = ':t' . $i;
            $placeholders[] = $k;
            $params[$k] = $id;
        }
        $in = implode(',', $placeholders);

        $sql = "SELECT COUNT(*) AS cnt FROM notification WHERE notification_type_id IN ($in)";
        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, (int)$v, PDO::PARAM_INT);
        }
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
        return (int)($row['cnt'] ?? 0);
    }
}

<?php
// backend/models/NotificationModel.php
declare(strict_types=1);

class NotificationModel
{
    public function __construct(private PDO $pdo) {}

    /**
     * สร้างแจ้งเตือน: ผู้สมัครสมาชิกใหม่ (รอการอนุมัติ)
     *
     * Requirements:
     * - notification_type_id = 1 (user_registration_pending)
     * - message ต้องมี
     * - event_id = null
     * - schedule_at = null
     * - notification_status_id = 1 (pending)  <-- ปรับได้ตาม DB จริงของคุณ
     */
    public function createUserRegistrationPending(array $data): int
    {
        $message = trim((string)($data['message'] ?? ''));
        if ($message === '') {
            throw new InvalidArgumentException('message is required');
        }

        // ค่าเริ่มต้น (แก้ได้ตาม DB จริง)
        $notificationTypeId = 1; // ✅ fixed: user_registration_pending
        $notificationStatusId = isset($data['notification_status_id'])
            ? (int)$data['notification_status_id']
            : 1; // pending

        $sql = "
            INSERT INTO notification (
                event_id,
                notification_type_id,
                message,
                schedule_at,
                notification_status_id
            ) VALUES (
                :event_id,
                :notification_type_id,
                :message,
                :schedule_at,
                :notification_status_id
            )
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':event_id' => null,
            ':notification_type_id' => $notificationTypeId,
            ':message' => $message,
            ':schedule_at' => null,
            ':notification_status_id' => $notificationStatusId,
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
                event_id,
                notification_type_id,
                message,
                create_at,
                schedule_at,
                notification_status_id
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
     * (Optional) อัปเดตสถานะแจ้งเตือน (เช่น pending -> done)
     */
    public function updateStatus(int $notificationId, int $statusId): bool
    {
        $sql = "UPDATE notification SET notification_status_id = :sid WHERE notification_id = :nid";
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute([
            ':sid' => $statusId,
            ':nid' => $notificationId
        ]);
    }
}

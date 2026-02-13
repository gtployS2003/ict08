<?php
// backend/models/NotificationTypeStaffModel.php
declare(strict_types=1);

/**
 * Table: notification_type_staff
 * Columns:
 * - id (bigint)
 * - notification_type_id (int)
 * - user_id (int)
 * - is_enabled (tinyint)
 * - created_at (timestamp)
 *
 * Notes:
 * - ควรมี UNIQUE(notification_type_id, user_id) เพื่อ upsert ได้ปลอดภัย
 */
final class NotificationTypeStaffModel
{
    public function __construct(private PDO $pdo)
    {
    }

    /**
     * List staff recipients by notification_type_id (with optional search)
     * If $notificationTypeId = 0, list all records
     * @return array<int, array<string, mixed>>
     */
    public function listByType(int $notificationTypeId, string $q = '', int $page = 1, int $limit = 50): array
    {
        // ถ้า $notificationTypeId <= 0 = query ทั้งหมด
        // ถ้า > 0 = filter ตาม type นั้น
        $page = max(1, $page);
        $limit = max(1, min(200, $limit));
        $offset = ($page - 1) * $limit;

        $q = trim($q);
        
        // Build WHERE clause
        $where = "";
        $params = [
            ':limit' => $limit,
            ':offset' => $offset,
        ];

        if ($notificationTypeId > 0) {
            $where = "WHERE nts.notification_type_id = :ntid";
            $params[':ntid'] = $notificationTypeId;
        }

        if ($q !== '') {
            // ตาราง user มี line_user_name เป็นหลัก (จาก schema ที่คุณส่ง)
            $where .= ($where ? " AND " : "WHERE ");
            $where .= "(u.line_user_name LIKE :q1 OR u.line_user_id LIKE :q2)";
            $like = '%' . $q . '%';
            $params[':q1'] = $like;
            $params[':q2'] = $like;
        }

        $sql = "
            SELECT
                nts.id,
                nts.notification_type_id,
                nts.user_id,
                nts.is_enabled,
                nts.created_at,

                u.line_user_id,
                u.line_user_name,
                u.user_role_id
            FROM notification_type_staff nts
            INNER JOIN user u ON u.user_id = nts.user_id
            $where
            ORDER BY nts.id DESC
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $this->pdo->prepare($sql);

        // bind int เพื่อกันปัญหา LIMIT/OFFSET บนบาง env
        if ($notificationTypeId > 0) {
            $stmt->bindValue(':ntid', $params[':ntid'], PDO::PARAM_INT);
        }
        $stmt->bindValue(':limit', $params[':limit'], PDO::PARAM_INT);
        $stmt->bindValue(':offset', $params[':offset'], PDO::PARAM_INT);

        if ($q !== '') {
            $stmt->bindValue(':q1', $params[':q1'], PDO::PARAM_STR);
            $stmt->bindValue(':q2', $params[':q2'], PDO::PARAM_STR);
        }

        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function countByType(int $notificationTypeId, string $q = ''): int
    {
        // ถ้า $notificationTypeId <= 0 = count ทั้งหมด
        // ถ้า > 0 = count เฉพาะ type นั้น
        $q = trim($q);

        $where = "";
        $params = [];

        if ($notificationTypeId > 0) {
            $where = "WHERE nts.notification_type_id = :ntid";
            $params[':ntid'] = $notificationTypeId;
        }

        if ($q !== '') {
            $where .= ($where ? " AND " : "WHERE ");
            $where .= "(u.line_user_name LIKE :q1 OR u.line_user_id LIKE :q2)";
            $like = '%' . $q . '%';
            $params[':q1'] = $like;
            $params[':q2'] = $like;
        }

        $sql = "
            SELECT COUNT(*) AS cnt
            FROM notification_type_staff nts
            INNER JOIN user u ON u.user_id = nts.user_id
            $where
        ";

        $stmt = $this->pdo->prepare($sql);
        if ($notificationTypeId > 0) {
            $stmt->bindValue(':ntid', $params[':ntid'], PDO::PARAM_INT);
        }

        if ($q !== '') {
            $stmt->bindValue(':q1', $params[':q1'], PDO::PARAM_STR);
            $stmt->bindValue(':q2', $params[':q2'], PDO::PARAM_STR);
        }

        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return (int)($row['cnt'] ?? 0);
    }

    /**
     * Get one mapping row by id
     * @return array<string, mixed>|null
     */
    public function getById(int $id): ?array
    {
        $id = max(1, $id);

        $sql = "
            SELECT
                nts.id,
                nts.notification_type_id,
                nts.user_id,
                nts.is_enabled,
                nts.created_at,
                u.line_user_id,
                u.line_user_name,
                u.user_role_id
            FROM notification_type_staff nts
            INNER JOIN user u ON u.user_id = nts.user_id
            WHERE nts.id = :id
            LIMIT 1
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row !== false ? $row : null;
    }

    /**
     * Get mapping row by (notification_type_id, user_id)
     * @return array<string, mixed>|null
     */
    public function getByTypeAndUser(int $notificationTypeId, int $userId): ?array
    {
        $notificationTypeId = max(1, $notificationTypeId);
        $userId = max(1, $userId);

        $sql = "
            SELECT
                id, notification_type_id, user_id, is_enabled, created_at
            FROM notification_type_staff
            WHERE notification_type_id = :ntid AND user_id = :uid
            LIMIT 1
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':ntid', $notificationTypeId, PDO::PARAM_INT);
        $stmt->bindValue(':uid', $userId, PDO::PARAM_INT);
        $stmt->execute();

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row !== false ? $row : null;
    }

    /**
     * Upsert mapping (insert new or update is_enabled)
     * - ถ้ามี UNIQUE(notification_type_id, user_id) จะใช้ ON DUPLICATE KEY UPDATE ได้
     * - ถ้าไม่มี unique จะ fallback เป็น select แล้ว update/insert (แต่แนะนำให้ทำ unique)
     *
     * @return int id ของแถวที่ถูก insert/update
     */
    public function upsert(int $notificationTypeId, int $userId, int $isEnabled = 1): int
    {
        $notificationTypeId = max(1, $notificationTypeId);
        $userId = max(1, $userId);
        $isEnabled = $isEnabled ? 1 : 0;

        // พยายามใช้ ON DUPLICATE KEY UPDATE ก่อน
        $sql = "
            INSERT INTO notification_type_staff (notification_type_id, user_id, is_enabled)
            VALUES (:ntid, :uid, :en)
            ON DUPLICATE KEY UPDATE
                is_enabled = VALUES(is_enabled)
        ";

        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->bindValue(':ntid', $notificationTypeId, PDO::PARAM_INT);
            $stmt->bindValue(':uid', $userId, PDO::PARAM_INT);
            $stmt->bindValue(':en', $isEnabled, PDO::PARAM_INT);
            $stmt->execute();

            $lastId = (int)$this->pdo->lastInsertId();
            if ($lastId > 0) return $lastId;

            // กรณีเป็น update จาก duplicate key: lastInsertId จะเป็น 0 -> ไปหา id เดิม
            $row = $this->getByTypeAndUser($notificationTypeId, $userId);
            return (int)($row['id'] ?? 0);
        } catch (Throwable $e) {
            // fallback: กรณีตารางไม่มี UNIQUE หรือ env ไม่รองรับรูปแบบนี้
            $row = $this->getByTypeAndUser($notificationTypeId, $userId);
            if ($row) {
                $this->setEnabledById((int)$row['id'], $isEnabled);
                return (int)$row['id'];
            }

            return $this->create($notificationTypeId, $userId, $isEnabled);
        }
    }

    /**
     * Create new mapping row (no upsert)
     * @return int inserted id
     */
    public function create(int $notificationTypeId, int $userId, int $isEnabled = 1): int
    {
        $notificationTypeId = max(1, $notificationTypeId);
        $userId = max(1, $userId);
        $isEnabled = $isEnabled ? 1 : 0;

        $sql = "
            INSERT INTO notification_type_staff (notification_type_id, user_id, is_enabled)
            VALUES (:ntid, :uid, :en)
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':ntid', $notificationTypeId, PDO::PARAM_INT);
        $stmt->bindValue(':uid', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':en', $isEnabled, PDO::PARAM_INT);
        $stmt->execute();

        return (int)$this->pdo->lastInsertId();
    }

    /**
     * Update enabled flag by row id
     */
    public function setEnabledById(int $id, int $isEnabled): bool
    {
        $id = max(1, $id);
        $isEnabled = $isEnabled ? 1 : 0;

        $sql = "UPDATE notification_type_staff SET is_enabled = :en WHERE id = :id";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':en', $isEnabled, PDO::PARAM_INT);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }

    /**
     * Update enabled by composite key (notification_type_id + user_id)
     */
    public function setEnabled(int $notificationTypeId, int $userId, int $isEnabled): bool
    {
        $notificationTypeId = max(1, $notificationTypeId);
        $userId = max(1, $userId);
        $isEnabled = $isEnabled ? 1 : 0;

        $sql = "
            UPDATE notification_type_staff
            SET is_enabled = :en
            WHERE notification_type_id = :ntid AND user_id = :uid
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':en', $isEnabled, PDO::PARAM_INT);
        $stmt->bindValue(':ntid', $notificationTypeId, PDO::PARAM_INT);
        $stmt->bindValue(':uid', $userId, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }

    /**
     * Delete row by id
     */
    public function deleteById(int $id): bool
    {
        $id = max(1, $id);

        $sql = "DELETE FROM notification_type_staff WHERE id = :id";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }

    /**
     * (Optional) Search persons (staff) to add into notification_type_staff
     * - ดึงจากตาราง person JOIN user (is_active = 1 AND user_role_id IN (2, 3))
     * - ค้นหาจาก display_name
     *
     * @return array<int, array<string, mixed>>
     */
    public function searchUsers(string $q = '', int $page = 1, int $limit = 500): array
    {
        $page = max(1, $page);
        $limit = max(1, min(500, $limit));
        $offset = ($page - 1) * $limit;
        $q = trim($q);

        $where = "WHERE p.is_active = 1 AND u.user_role_id IN (2, 3)";
        if ($q !== '') {
            $where .= " AND (p.display_name LIKE :q1 OR p.first_name_th LIKE :q2 OR p.last_name_th LIKE :q3)";
        }

        $sql = "
            SELECT
                u.user_id,
                p.display_name AS name,
                p.person_id,
                p.display_name,
                p.is_active,
                u.user_id,
                u.user_role_id
            FROM person p
            INNER JOIN user u ON u.user_id = p.person_user_id
            $where
            ORDER BY p.display_name ASC
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);

        if ($q !== '') {
            $like = '%' . $q . '%';
            $stmt->bindValue(':q1', $like, PDO::PARAM_STR);
            $stmt->bindValue(':q2', $like, PDO::PARAM_STR);
            $stmt->bindValue(':q3', $like, PDO::PARAM_STR);
        }

        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }
}

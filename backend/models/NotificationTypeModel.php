<?php
// backend/models/NotificationTypeModel.php
declare(strict_types=1);

final class NotificationTypeModel
{
    public function __construct(private PDO $pdo)
    {
    }

    /**
     * List with search + pagination
     * @return array<int, array<string,mixed>>
     */
    public function list(string $q = '', int $page = 1, int $limit = 50): array
    {
        $page = max(1, $page);
        $limit = max(1, min(200, $limit));
        $offset = ($page - 1) * $limit;

        $q = trim($q);

        $where = '';
        $params = [];

        if ($q !== '') {
            $where = "WHERE (nt.notification_type LIKE :q1 OR nt.meaning LIKE :q2)";
            $like = '%' . $q . '%';
            $params[':q1'] = $like;
            $params[':q2'] = $like;

        }

        // ✅ สำคัญ: ฝัง LIMIT/OFFSET เป็นตัวเลข (int) ลง SQL โดยตรง
        $sql = "
        SELECT
            nt.notification_type_id,
            nt.notification_type,
            nt.meaning
        FROM notification_type nt
        {$where}
        ORDER BY nt.notification_type_id ASC
        LIMIT {$limit} OFFSET {$offset}
    ";

        $stmt = $this->pdo->prepare($sql);

        // bind เฉพาะ search เท่านั้น
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v, PDO::PARAM_STR);
        }

        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return is_array($rows) ? $rows : [];
    }


    public function count(string $q = ''): int
{
    $q = trim($q);

    $where = '';
    $params = [];

    if ($q !== '') {
        // ✅ ใช้ alias nt ให้ตรงกับ FROM
        $where = "WHERE (nt.notification_type LIKE :q1 OR nt.meaning LIKE :q2)";
        $like = '%' . $q . '%';
        $params[':q1'] = $like;
        $params[':q2'] = $like;
    }

    // ✅ ใส่ alias nt ให้ FROM
    $sql = "SELECT COUNT(*) AS c FROM notification_type nt {$where}";
    $stmt = $this->pdo->prepare($sql);

    foreach ($params as $k => $v) {
        $stmt->bindValue($k, $v, PDO::PARAM_STR);
    }

    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    return (int)($row['c'] ?? 0);
}


    /**
     * @return array<string,mixed>|null
     */
    public function findById(int $id): ?array
    {
        $sql = "
            SELECT
                notification_type_id,
                notification_type,
                meaning
            FROM notification_type
            WHERE notification_type_id = :id
            LIMIT 1
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row)
            return null;

        return $row;
    }

    /**
     * Find by notification_type (case-sensitive match as stored)
     * @return array<string,mixed>|null
     */
    public function findByName(string $notificationType): ?array
    {
        $notificationType = trim($notificationType);
        if ($notificationType === '') return null;

        $sql = "
            SELECT
                notification_type_id,
                notification_type,
                meaning
            FROM notification_type
            WHERE notification_type = :name
            LIMIT 1
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':name', $notificationType, PDO::PARAM_STR);
        $stmt->execute();

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function existsById(int $id): bool
    {
        if ($id <= 0) return false;
        $stmt = $this->pdo->prepare("SELECT 1 FROM notification_type WHERE notification_type_id = :id LIMIT 1");
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        return (bool)$stmt->fetchColumn();
    }

    public function existsByName(string $notificationType, ?int $excludeId = null): bool
    {
        $notificationType = trim($notificationType);

        $sql = "SELECT notification_type_id FROM notification_type WHERE notification_type = :name";
        if ($excludeId !== null) {
            $sql .= " AND notification_type_id <> :exclude_id";
        }
        $sql .= " LIMIT 1";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':name', $notificationType, PDO::PARAM_STR);
        if ($excludeId !== null) {
            $stmt->bindValue(':exclude_id', $excludeId, PDO::PARAM_INT);
        }
        $stmt->execute();

        return (bool) $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function create(string $notificationType, string $meaning = ''): int
    {
        $notificationType = trim($notificationType);
        $meaning = trim($meaning);

        $sql = "
            INSERT INTO notification_type (notification_type, meaning)
            VALUES (:notification_type, :meaning)
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':notification_type', $notificationType, PDO::PARAM_STR);
        $stmt->bindValue(':meaning', $meaning, PDO::PARAM_STR);
        $stmt->execute();

        return (int) $this->pdo->lastInsertId();
    }

    public function update(int $id, string $notificationType, string $meaning = ''): bool
    {
        $notificationType = trim($notificationType);
        $meaning = trim($meaning);

        $sql = "
            UPDATE notification_type
            SET
                notification_type = :notification_type,
                meaning = :meaning
            WHERE notification_type_id = :id
            LIMIT 1
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':notification_type', $notificationType, PDO::PARAM_STR);
        $stmt->bindValue(':meaning', $meaning, PDO::PARAM_STR);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);

        $stmt->execute();
        return $stmt->rowCount() > 0;
    }

    public function delete(int $id): bool
    {
        $sql = "DELETE FROM notification_type WHERE notification_type_id = :id LIMIT 1";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }
}

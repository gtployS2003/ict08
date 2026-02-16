<?php
// backend/models/UserNotificationChannelModel.php
declare(strict_types=1);

final class UserNotificationChannelModel
{
    public function __construct(private PDO $pdo)
    {
    }

    /* =========================================================
     * USER VIEW: list channels for a specific user
     * ========================================================= */

    /**
     * List channels for a user (join channel + user + person) with pagination
     *
     * @return array<int, array<string,mixed>>
     */
    public function listByUser(int $userId, int $page = 1, int $limit = 50): array
    {
        $userId = max(0, $userId);
        $page = max(1, $page);
        $limit = max(1, min(200, $limit));
        $offset = ($page - 1) * $limit;

        $sql = "
            SELECT
                unc.user_notification_channel_id,
                unc.user_id,
                COALESCE(NULLIF(p.display_name, ''), NULLIF(u.line_user_name, ''), CONCAT('USER#', u.user_id)) AS display_name,
                u.user_role_id,
                unc.channel AS channel_id,
                c.channel AS channel_name,
                unc.enable AS is_enabled
            FROM user_notification_channel unc
            INNER JOIN channel c
                ON c.channel_id = unc.channel
            LEFT JOIN `user` u
                ON u.user_id = unc.user_id
            LEFT JOIN person p
                ON p.person_user_id = u.user_id
            WHERE unc.user_id = :user_id
            ORDER BY c.channel_id ASC
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);

        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function countByUser(int $userId): int
    {
        $userId = max(0, $userId);

        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) AS cnt
            FROM user_notification_channel unc
            WHERE unc.user_id = :user_id
        ");
        $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $stmt->execute();

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return (int)($row['cnt'] ?? 0);
    }

    /* =========================================================
     * ADMIN VIEW (GCMS): list all mappings (join + search + filter)
     * - ใช้ทำหน้ารายการ user_notification_channel ใน settings-data
     * ========================================================= */

    /**
     * List all mappings with join + search + filter + pagination
     *
     * filter:
     * - q: ค้น display_name / first-last / line_user_name / channel
     * - channel_id: กรองเฉพาะช่องทาง (optional)
     *
     * @return array<int, array<string,mixed>>
     */
    public function listAll(string $q = '', int $channelId = 0, int $page = 1, int $limit = 50): array
    {
        $q = trim($q);
        $channelId = max(0, $channelId);
        $page = max(1, $page);
        $limit = max(1, min(200, $limit));
        $offset = ($page - 1) * $limit;

        $where = [];
        $params = [];

        if ($q !== '') {
            $where[] = "(
                p.display_name LIKE :q
                OR p.first_name_th LIKE :q
                OR p.last_name_th LIKE :q
                OR u.line_user_name LIKE :q
                OR c.channel LIKE :q
            )";
            $params[':q'] = '%' . $q . '%';
        }

        if ($channelId > 0) {
            $where[] = "c.channel_id = :channel_id";
            $params[':channel_id'] = $channelId;
        }

        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $sql = "
            SELECT
                unc.user_notification_channel_id,
                unc.user_id,
                COALESCE(NULLIF(p.display_name, ''), NULLIF(u.line_user_name, ''), CONCAT('USER#', u.user_id)) AS display_name,
                u.user_role_id,
                unc.channel AS channel_id,
                c.channel AS channel_name,
                unc.enable AS is_enabled
            FROM user_notification_channel unc
            INNER JOIN channel c
                ON c.channel_id = unc.channel
            LEFT JOIN `user` u
                ON u.user_id = unc.user_id
            LEFT JOIN person p
                ON p.person_user_id = u.user_id
            $whereSql
            ORDER BY unc.user_notification_channel_id DESC
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $this->pdo->prepare($sql);

        foreach ($params as $k => $v) {
            if ($k === ':channel_id') $stmt->bindValue($k, (int)$v, PDO::PARAM_INT);
            else $stmt->bindValue($k, (string)$v, PDO::PARAM_STR);
        }

        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);

        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function countAll(string $q = '', int $channelId = 0): int
    {
        $q = trim($q);
        $channelId = max(0, $channelId);

        $where = [];
        $params = [];

        if ($q !== '') {
            $where[] = "(
                p.display_name LIKE :q
                OR p.first_name_th LIKE :q
                OR p.last_name_th LIKE :q
                OR u.line_user_name LIKE :q
                OR c.channel LIKE :q
            )";
            $params[':q'] = '%' . $q . '%';
        }

        if ($channelId > 0) {
            $where[] = "c.channel_id = :channel_id";
            $params[':channel_id'] = $channelId;
        }

        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $sql = "
            SELECT COUNT(*) AS cnt
            FROM user_notification_channel unc
            INNER JOIN channel c ON c.channel_id = unc.channel
            LEFT JOIN `user` u ON u.user_id = unc.user_id
            LEFT JOIN person p ON p.person_user_id = u.user_id
            $whereSql
        ";

        $stmt = $this->pdo->prepare($sql);

        foreach ($params as $k => $v) {
            if ($k === ':channel_id') $stmt->bindValue($k, (int)$v, PDO::PARAM_INT);
            else $stmt->bindValue($k, (string)$v, PDO::PARAM_STR);
        }

        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return (int)($row['cnt'] ?? 0);
    }

    /* =========================================================
     * Refs: list users for dropdown (ถ้าอนาคตอยากใช้)
     * ========================================================= */

    /**
     * @return array<int, array{user_id:int, display_name:string}>
     */
    public function listUsers(string $q = '', int $limit = 200): array
    {
        $q = trim($q);
        $limit = max(1, min(500, $limit));

        $where = "";
        $params = [];

        if ($q !== '') {
            $where = "WHERE (
                p.display_name LIKE :q
                OR p.first_name_th LIKE :q
                OR p.last_name_th LIKE :q
                OR u.line_user_name LIKE :q
            )";
            $params[':q'] = '%' . $q . '%';
        }

        $sql = "
            SELECT
                u.user_id,
                COALESCE(NULLIF(p.display_name, ''), NULLIF(u.line_user_name, ''), CONCAT('USER#', u.user_id)) AS display_name
            FROM `user` u
            LEFT JOIN person p
                ON p.person_user_id = u.user_id
            $where
            GROUP BY u.user_id, display_name
            ORDER BY display_name ASC
            LIMIT :limit
        ";

        $stmt = $this->pdo->prepare($sql);

        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v, PDO::PARAM_STR);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);

        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /* =========================================================
     * Single row + update
     * ========================================================= */

    public function getById(int $id): ?array
    {
        $stmt = $this->pdo->prepare("
            SELECT
                unc.user_notification_channel_id,
                unc.user_id,
                COALESCE(NULLIF(p.display_name, ''), NULLIF(u.line_user_name, ''), CONCAT('USER#', u.user_id)) AS display_name,
                u.user_role_id,
                unc.channel AS channel_id,
                c.channel AS channel_name,
                unc.enable AS is_enabled
            FROM user_notification_channel unc
            INNER JOIN channel c ON c.channel_id = unc.channel
            LEFT JOIN `user` u ON u.user_id = unc.user_id
            LEFT JOIN person p ON p.person_user_id = u.user_id
            WHERE unc.user_notification_channel_id = :id
            LIMIT 1
        ");
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function updateEnable(int $id, int $enable): bool
    {
        $enable = $enable ? 1 : 0;

        $stmt = $this->pdo->prepare("
            UPDATE user_notification_channel
            SET enable = :enable
            WHERE user_notification_channel_id = :id
        ");
        $stmt->bindValue(':enable', $enable, PDO::PARAM_INT);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }

    /**
     * Upsert by (user_id, channel_id)
     * หมายเหตุ: ถ้ามี UNIQUE KEY (user_id, channel) จะดีมาก
     */
    public function upsert(int $userId, int $channelId, int $enable): int
    {
        $userId = max(0, $userId);
        $channelId = max(0, $channelId);
        $enable = $enable ? 1 : 0;

        // 1) หาแถวเดิมก่อน
        $stmt = $this->pdo->prepare("
            SELECT user_notification_channel_id
            FROM user_notification_channel
            WHERE user_id = :user_id AND channel = :channel_id
            LIMIT 1
        ");
        $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':channel_id', $channelId, PDO::PARAM_INT);
        $stmt->execute();

        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row && isset($row['user_notification_channel_id'])) {
            $id = (int)$row['user_notification_channel_id'];
            $this->updateEnable($id, $enable);
            return $id;
        }

        // 2) ถ้าไม่เจอ ให้ insert
        $ins = $this->pdo->prepare("
            INSERT INTO user_notification_channel (user_id, channel, enable)
            VALUES (:user_id, :channel_id, :enable)
        ");
        $ins->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $ins->bindValue(':channel_id', $channelId, PDO::PARAM_INT);
        $ins->bindValue(':enable', $enable, PDO::PARAM_INT);
        $ins->execute();

        return (int)$this->pdo->lastInsertId();
    }

    /* =========================================================
     * AUTO INSERT DEFAULTS (สำคัญที่สุด)
     * ========================================================= */

    /**
     * Ensure default channels exist for a user based on role.
     * - ไม่สร้างซ้ำ (idempotent) เพราะใช้ upsert
     *
     * rule:
     * - role 2 or 3 => web=1, line=1
     * - role 1      => web=0, line=1
     */
    public function ensureDefaultsForUser(int $userId, int $roleId): array
    {
        return $this->bootstrapDefaults($userId, $roleId);
    }

    /**
     * Bootstrap default channels for a user based on role
     */
    public function bootstrapDefaults(int $userId, int $roleId): array
    {
        $userId = max(0, $userId);
        $roleId = max(0, $roleId);

        // ดึง master ช่องทาง (line/web) แบบ case-insensitive
        $stmt = $this->pdo->prepare("
            SELECT channel_id, channel
            FROM channel
            WHERE LOWER(channel) IN ('line','web')
        ");
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $map = [];
        foreach ($rows as $r) {
            $name = strtolower((string)($r['channel'] ?? ''));
            $map[$name] = (int)($r['channel_id'] ?? 0);
        }

        $lineId = $map['line'] ?? 0;
        $webId  = $map['web'] ?? 0;

        if ($lineId <= 0 || $webId <= 0) {
            throw new RuntimeException("Missing channel master: line/web");
        }

        $enableLine = 1;
        $enableWeb  = (in_array($roleId, [2, 3], true)) ? 1 : 0;

        $startedTx = false;
        if (!$this->pdo->inTransaction()) {
            $this->pdo->beginTransaction();
            $startedTx = true;
        }

        try {
            $idLine = $this->upsert($userId, $lineId, $enableLine);
            $idWeb  = $this->upsert($userId, $webId, $enableWeb);

            if ($startedTx) $this->pdo->commit();

            return [
                'user_id' => $userId,
                'role_id' => $roleId,
                'line' => [
                    'channel_id' => $lineId,
                    'user_notification_channel_id' => $idLine,
                    'is_enabled' => $enableLine
                ],
                'web' => [
                    'channel_id' => $webId,
                    'user_notification_channel_id' => $idWeb,
                    'is_enabled' => $enableWeb
                ],
            ];
        } catch (Throwable $e) {
            if ($startedTx && $this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $e;
        }
    }
}

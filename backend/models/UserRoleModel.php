<?php
// backend/models/UserRoleModel.php

require_once __DIR__ . '/../config/db.php';

class UserRoleModel
{
    /** @var PDO */
    private $db;

    /** @var string */
    private $table = 'user_role';

    public function __construct(?PDO $pdo = null)
    {
        $this->db = $pdo ?: db();
    }


    public function getTableName(): string
    {
        return $this->table;
    }

    /**
     * ดึงรายการสิทธิ์ผู้ใช้งานทั้งหมด
     * รองรับค้นหา + paging
     *
     * @param string|null $q ค้นหา code/role
     * @param int $page
     * @param int $limit
     * @return array ['items'=>[], 'pagination'=>[]]
     */
    public function list(?string $q = null, int $page = 1, int $limit = 50): array
    {
        $page = max(1, (int) $page);
        $limit = max(1, min(200, (int) $limit));
        $offset = ($page - 1) * $limit;

        $where = '';
        $params = [];

        if ($q !== null && trim($q) !== '') {
            $where = "WHERE `code` LIKE :q1 OR `role` LIKE :q2";
            $like = '%' . trim($q) . '%';
            $params[':q1'] = $like;
            $params[':q2'] = $like;
        }

        // total
        $sqlCount = "SELECT COUNT(*) AS total FROM `{$this->table}` {$where}";
        $stmtCount = $this->db->prepare($sqlCount);
        $stmtCount->execute($params);
        $total = (int) ($stmtCount->fetch(PDO::FETCH_ASSOC)['total'] ?? 0);

        // items
        $sql = "
    SELECT `user_role_id`, `code`, `role`
    FROM `{$this->table}`
    {$where}
    ORDER BY `user_role_id` ASC
    LIMIT :limit OFFSET :offset
";
        $stmt = $this->db->prepare($sql);

        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v, PDO::PARAM_STR);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);

        $stmt->execute();
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        return [
            'items' => $items,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'total_pages' => (int) ceil($total / $limit),
            ],
        ];
    }

    /**
     * สร้างสิทธิ์ใหม่
     */
    public function create(string $code, string $role): array
    {
        $code = trim($code);
        $role = trim($role);

        if ($code === '' || $role === '') {
            throw new Exception('code and role are required');
        }

        $sql = "INSERT INTO `{$this->table}` (`code`, `role`) VALUES (:code, :role)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':code' => $code,
            ':role' => $role,
        ]);

        $id = (int) $this->db->lastInsertId();
        return $this->getById($id);
    }

    /**
     * อัปเดตสิทธิ์
     */
    public function update(int $userRoleId, string $code, string $role): array
    {
        $userRoleId = (int) $userRoleId;
        $code = trim($code);
        $role = trim($role);

        if ($code === '' || $role === '') {
            throw new Exception('code and role are required');
        }

        // กันกรณี id ไม่เจอ ให้ throw แบบเดียวกับ ProvinceModel
        $this->getById($userRoleId);

        $sql = "
            UPDATE `{$this->table}`
            SET `code` = :code,
                `role` = :role
            WHERE `user_role_id` = :id
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':code' => $code,
            ':role' => $role,
            ':id' => $userRoleId,
        ]);

        return $this->getById($userRoleId);
    }

    /**
     * ลบสิทธิ์
     */
    public function delete(int $userRoleId): bool
    {
        $userRoleId = (int) $userRoleId;

        $sql = "DELETE FROM `{$this->table}` WHERE `user_role_id` = :id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $userRoleId]);

        return $stmt->rowCount() > 0;
    }

    /**
     * ดึง 1 รายการตาม id (ใช้ภายใน)
     */
    public function getById(int $userRoleId): array
    {
        $userRoleId = (int) $userRoleId;

        $sql = "SELECT `user_role_id`, `code`, `role` FROM `{$this->table}` WHERE `user_role_id` = :id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $userRoleId]);

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new Exception('User role not found');
        }

        return $row;
    }

    public function findByCode(string $code): ?array
    {
        $code = trim($code);
        if ($code === '')
            return null;

        $sql = "SELECT `user_role_id`, `code`, `role`
                FROM `{$this->table}`
                WHERE `code` = :code
                LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':code' => $code]);

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * เช็ค code ซ้ำ (optional)
     */
    public function existsByCode(string $code, ?int $excludeId = null): bool
    {
        $code = trim($code);
        if ($code === '')
            return false;

        $sql = "SELECT COUNT(*) AS c FROM `{$this->table}` WHERE `code` = :code";
        $params = [':code' => $code];

        if ($excludeId !== null) {
            $sql .= " AND `user_role_id` <> :excludeId";
            $params[':excludeId'] = (int) $excludeId;
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        $c = (int) ($stmt->fetch(PDO::FETCH_ASSOC)['c'] ?? 0);
        return $c > 0;
    }
}

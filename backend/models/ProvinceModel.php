<?php
// backend/models/ProvinceModel.php

require_once __DIR__ . '/../config/db.php';

class ProvinceModel
{
    /** @var PDO */
    private $db;

    public function __construct(?PDO $pdo = null)
    {
        $this->db = $pdo ?: db();
    }

    /**
     * ดึงรายการจังหวัดทั้งหมด
     * รองรับค้นหา + paging (optional)
     *
     * @param string|null $q ค้นหา nameTH/nameEN
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
            $where = "WHERE nameTH LIKE :q1 OR nameEN LIKE :q2";
            $like = '%' . trim($q) . '%';
            $params[':q1'] = $like;
            $params[':q2'] = $like;
        }

        // total
        $sqlCount = "SELECT COUNT(*) AS total FROM province $where";
        $stmtCount = $this->db->prepare($sqlCount);
        $stmtCount->execute($params);
        $total = (int) ($stmtCount->fetch(PDO::FETCH_ASSOC)['total'] ?? 0);

        // items
        $sql = "
        SELECT province_id, nameEN, nameTH
        FROM province
        $where
        ORDER BY province_id ASC
        LIMIT $limit OFFSET $offset
    ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'items' => $items,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'total_pages' => (int) ceil($total / $limit),
            ]
        ];
    }



    /**
     * สร้างจังหวัดใหม่
     */
    public function create(string $nameEN, string $nameTH): array
    {
        $nameEN = trim($nameEN);
        $nameTH = trim($nameTH);

        $sql = "INSERT INTO province (nameEN, nameTH) VALUES (:nameEN, :nameTH)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':nameEN' => $nameEN,
            ':nameTH' => $nameTH,
        ]);

        $id = (int) $this->db->lastInsertId();

        return $this->getById($id);
    }

    /**
     * อัปเดตจังหวัด
     */
    public function update(int $provinceId, string $nameEN, string $nameTH): array
    {
        $provinceId = (int) $provinceId;
        $nameEN = trim($nameEN);
        $nameTH = trim($nameTH);

        $sql = "
            UPDATE province
            SET nameEN = :nameEN,
                nameTH = :nameTH
            WHERE province_id = :id
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':nameEN' => $nameEN,
            ':nameTH' => $nameTH,
            ':id' => $provinceId,
        ]);

        return $this->getById($provinceId);
    }

    /**
     * ลบจังหวัด
     */
    public function delete(int $provinceId): bool
    {
        $provinceId = (int) $provinceId;

        $sql = "DELETE FROM province WHERE province_id = :id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $provinceId]);

        return $stmt->rowCount() > 0;
    }

    /**
     * ดึงจังหวัดตาม id (ใช้ภายใน)
     */
    public function getById(int $provinceId): array
    {
        $provinceId = (int) $provinceId;

        $sql = "SELECT province_id, nameEN, nameTH FROM province WHERE province_id = :id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $provinceId]);

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new Exception('Province not found');
        }

        return $row;
    }

    /**
     * เช็คว่าชื่อซ้ำ (optional)
     */
    public function existsByName(string $nameEN, string $nameTH, ?int $excludeId = null): bool
    {
        $nameEN = trim($nameEN);
        $nameTH = trim($nameTH);

        $sql = "SELECT COUNT(*) AS c FROM province WHERE (nameEN = :nameEN OR nameTH = :nameTH)";
        $params = [
            ':nameEN' => $nameEN,
            ':nameTH' => $nameTH
        ];

        if ($excludeId !== null) {
            $sql .= " AND province_id <> :excludeId";
            $params[':excludeId'] = (int) $excludeId;
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        $c = (int) ($stmt->fetch(PDO::FETCH_ASSOC)['c'] ?? 0);
        return $c > 0;
    }
}

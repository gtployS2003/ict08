<?php
// backend/models/OrganizationModel.php

require_once __DIR__ . '/../config/db.php';

class OrganizationModel
{
    private $db;

    public function __construct($pdo = null)
    {
        $this->db = $pdo ?: db();
    }

    /**
     * ดึงรายการหน่วยงานทั้งหมด
     * รองรับค้นหา + filter + paging (optional)
     *
     * @param string|null $q ค้นหา code / name / location
     * @param int|null $provinceId filter จังหวัด
     * @param int|null $organizationTypeId filter ประเภทหน่วยงาน
     * @param int $page
     * @param int $limit
     * @return array ['items'=>[], 'pagination'=>[]]
     */
    public function list(
        ?string $q = null,
        ?int $provinceId = null,
        ?int $organizationTypeId = null,
        int $page = 1,
        int $limit = 50
    ): array {
        $page = max(1, (int) $page);
        $limit = max(1, min(200, (int) $limit));
        $offset = ($page - 1) * $limit;

        $whereParts = [];
        $params = [];

        // search
        if ($q !== null && trim($q) !== '') {
            $like = '%' . trim($q) . '%';
            $whereParts[] = "(o.code LIKE :q1 OR o.name LIKE :q2 OR o.location LIKE :q3)";
            $params[':q1'] = $like;
            $params[':q2'] = $like;
            $params[':q3'] = $like;
        }

        // filter province
        if ($provinceId !== null && (int) $provinceId > 0) {
            $whereParts[] = "o.province_id = :province_id";
            $params[':province_id'] = (int) $provinceId;
        }

        // filter organization type
        if ($organizationTypeId !== null && (int) $organizationTypeId > 0) {
            $whereParts[] = "o.organization_type_id = :organization_type_id";
            $params[':organization_type_id'] = (int) $organizationTypeId;
        }

        $where = '';
        if (!empty($whereParts)) {
            $where = 'WHERE ' . implode(' AND ', $whereParts);
        }

        // total
        $sqlCount = "
            SELECT COUNT(*) AS total
            FROM organization o
            $where
        ";
        $stmtCount = $this->db->prepare($sqlCount);

        // bind params (count)
        foreach ($params as $k => $v) {
            $stmtCount->bindValue($k, $v, is_int($v) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }

        $stmtCount->execute();
        $total = (int) ($stmtCount->fetch(PDO::FETCH_ASSOC)['total'] ?? 0);

        // items (JOIN เพื่อเอาชื่อจังหวัด/ประเภท)
        $sql = "
            SELECT
                o.organization_id,
                o.code,
                o.name,
                o.location,
                o.province_id,
                p.nameTH AS province_name_th,
                p.nameEN AS province_name_en,
                o.organization_type_id,
                ot.type_name AS organization_type_name,
                ot.type_name_th AS organization_type_name_th
            FROM organization o
            LEFT JOIN province p ON p.province_id = o.province_id
            LEFT JOIN organization_type ot ON ot.organization_type_id = o.organization_type_id
            $where
            ORDER BY o.organization_id ASC
            LIMIT :limit OFFSET :offset
        ";
        $stmt = $this->db->prepare($sql);

        // bind params (items)
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v, is_int($v) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }

        // bind paging
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);

        $stmt->execute();
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

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
     * สร้างหน่วยงานใหม่
     */
    public function create(
        string $code,
        string $name,
        string $location,
        int $provinceId,
        int $organizationTypeId
    ): array {
        $code = trim($code);
        $name = trim($name);
        $location = trim($location);
        $provinceId = (int) $provinceId;
        $organizationTypeId = (int) $organizationTypeId;

        $sql = "
            INSERT INTO organization (code, name, location, province_id, organization_type_id)
            VALUES (:code, :name, :location, :province_id, :organization_type_id)
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':code' => $code,
            ':name' => $name,
            ':location' => $location,
            ':province_id' => $provinceId,
            ':organization_type_id' => $organizationTypeId,
        ]);

        $id = (int) $this->db->lastInsertId();
        return $this->getById($id);
    }

    /**
     * อัปเดตหน่วยงาน
     */
    public function update(
        int $organizationId,
        string $code,
        string $name,
        string $location,
        int $provinceId,
        int $organizationTypeId
    ): array {
        $organizationId = (int) $organizationId;
        $code = trim($code);
        $name = trim($name);
        $location = trim($location);
        $provinceId = (int) $provinceId;
        $organizationTypeId = (int) $organizationTypeId;

        $sql = "
            UPDATE organization
            SET code = :code,
                name = :name,
                location = :location,
                province_id = :province_id,
                organization_type_id = :organization_type_id
            WHERE organization_id = :id
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':code' => $code,
            ':name' => $name,
            ':location' => $location,
            ':province_id' => $provinceId,
            ':organization_type_id' => $organizationTypeId,
            ':id' => $organizationId,
        ]);

        return $this->getById($organizationId);
    }

    /**
     * ลบหน่วยงาน
     */
    public function delete(int $organizationId): bool
    {
        $organizationId = (int) $organizationId;

        $sql = "DELETE FROM organization WHERE organization_id = :id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $organizationId]);

        return $stmt->rowCount() > 0;
    }

    /**
     * ดึงข้อมูลตาม id (ใช้ภายใน)
     * - JOIN province / organization_type เพื่อให้ได้ชื่อไว้ใช้ใน UI
     */
    public function getById(int $organizationId): array
    {
        $organizationId = (int) $organizationId;

        $sql = "
            SELECT
                o.organization_id,
                o.code,
                o.name,
                o.location,
                o.province_id,
                p.nameTH AS province_name_th,
                p.nameEN AS province_name_en,
                o.organization_type_id,
                ot.type_name AS organization_type_name,
                ot.type_name_th AS organization_type_name_th
            FROM organization o
            LEFT JOIN province p ON p.province_id = o.province_id
            LEFT JOIN organization_type ot ON ot.organization_type_id = o.organization_type_id
            WHERE o.organization_id = :id
            LIMIT 1
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $organizationId]);

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new Exception('Organization not found');
        }

        return $row;
    }

    /**
     * Alias เพื่อให้เรียกแบบมาตรฐานเดียวกับ model อื่น
     */
    public function findById(int $organizationId): array
    {
        return $this->getById($organizationId);
    }

    /**
     * เช็ค code ซ้ำ (แนะนำใช้ตอน create/update)
     * - excludeId ใช้ตอน update เพื่อกันชนกับตัวเอง
     */
    public function existsByCode(string $code, $excludeId = null): bool
    {
        $code = trim($code);

        $sql = "SELECT COUNT(*) AS c FROM organization WHERE code = :code";
        $params = [':code' => $code];

        if ($excludeId !== null) {
            $sql .= " AND organization_id <> :excludeId";
            $params[':excludeId'] = (int) $excludeId;
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        $c = (int) ($stmt->fetch(PDO::FETCH_ASSOC)['c'] ?? 0);
        return $c > 0;
    }

    /**
     * (optional) เช็คชื่อหน่วยงานซ้ำในจังหวัดเดียวกัน/ประเภทเดียวกัน (กันข้อมูลซ้ำ)
     * - คุณจะใช้หรือไม่ใช้ก็ได้ แล้วแต่ requirement
     */
    public function existsByNameInScope(
        string $name,
        int $provinceId,
        int $organizationTypeId,
        $excludeId = null
    ): bool {
        $name = trim($name);
        $provinceId = (int) $provinceId;
        $organizationTypeId = (int) $organizationTypeId;

        $sql = "
            SELECT COUNT(*) AS c
            FROM organization
            WHERE name = :name
              AND province_id = :province_id
              AND organization_type_id = :organization_type_id
        ";
        $params = [
            ':name' => $name,
            ':province_id' => $provinceId,
            ':organization_type_id' => $organizationTypeId,
        ];

        if ($excludeId !== null) {
            $sql .= " AND organization_id <> :excludeId";
            $params[':excludeId'] = (int) $excludeId;
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        $c = (int) ($stmt->fetch(PDO::FETCH_ASSOC)['c'] ?? 0);
        return $c > 0;
    }
}

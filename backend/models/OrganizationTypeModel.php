<?php
// backend/models/OrganizationTypeModel.php

require_once __DIR__ . '/../config/db.php';

class OrganizationTypeModel
{
    private PDO $db;

    public function __construct()
    {
        $this->db = db();
    }

    /**
     * ดึงรายการประเภทหน่วยงานทั้งหมด
     * รองรับค้นหา + paging (optional)
     *
     * @param string|null $q ค้นหา type_name / type_name_th
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
            $where = "WHERE type_name LIKE :q1 OR type_name_th LIKE :q2";
            $like = '%' . trim($q) . '%';
            $params[':q1'] = $like;
            $params[':q2'] = $like;
        }


        // total
        $sqlCount = "SELECT COUNT(*) AS total FROM organization_type $where";
        $stmtCount = $this->db->prepare($sqlCount);
        $stmtCount->execute($params);
        $total = (int) ($stmtCount->fetch(PDO::FETCH_ASSOC)['total'] ?? 0);

        // items
        $sql = "
            SELECT organization_type_id, type_name, type_name_th
            FROM organization_type
            $where
            ORDER BY organization_type_id ASC
            LIMIT :limit OFFSET :offset
        ";
        $stmt = $this->db->prepare($sql);

        // bind search params
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v, PDO::PARAM_STR);
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
     * สร้างประเภทหน่วยงานใหม่
     */
    public function create(string $typeName, string $typeNameTh): array
    {
        $typeName = trim($typeName);
        $typeNameTh = trim($typeNameTh);

        $sql = "INSERT INTO organization_type (type_name, type_name_th) VALUES (:type_name, :type_name_th)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':type_name' => $typeName,
            ':type_name_th' => $typeNameTh,
        ]);

        $id = (int) $this->db->lastInsertId();

        return $this->getById($id);
    }

    /**
     * อัปเดตประเภทหน่วยงาน
     */
    public function update(int $organizationTypeId, string $typeName, string $typeNameTh): array
    {
        $organizationTypeId = (int) $organizationTypeId;
        $typeName = trim($typeName);
        $typeNameTh = trim($typeNameTh);

        $sql = "
            UPDATE organization_type
            SET type_name = :type_name,
                type_name_th = :type_name_th
            WHERE organization_type_id = :id
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':type_name' => $typeName,
            ':type_name_th' => $typeNameTh,
            ':id' => $organizationTypeId,
        ]);

        return $this->getById($organizationTypeId);
    }

    /**
     * ลบประเภทหน่วยงาน
     */
    public function delete(int $organizationTypeId): bool
    {
        $organizationTypeId = (int) $organizationTypeId;

        $sql = "DELETE FROM organization_type WHERE organization_type_id = :id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $organizationTypeId]);

        return $stmt->rowCount() > 0;
    }

    /**
     * ดึงข้อมูลตาม id (ใช้ภายใน)
     */
    public function getById(int $organizationTypeId): array
    {
        $organizationTypeId = (int) $organizationTypeId;

        $sql = "SELECT organization_type_id, type_name, type_name_th FROM organization_type WHERE organization_type_id = :id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $organizationTypeId]);

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new Exception('Organization type not found');
        }

        return $row;
    }

    /**
     * เช็คว่าชื่อซ้ำ (optional)
     * - ใช้เช็คทั้ง EN/TH ว่ามีอยู่แล้วไหม
     * - excludeId ใช้ตอน update เพื่อกันชนกับตัวเอง
     */
    public function existsByName(string $typeName, string $typeNameTh, ?int $excludeId = null): bool
    {
        $typeName = trim($typeName);
        $typeNameTh = trim($typeNameTh);

        $sql = "SELECT COUNT(*) AS c FROM organization_type
                WHERE (type_name = :type_name OR type_name_th = :type_name_th)";
        $params = [
            ':type_name' => $typeName,
            ':type_name_th' => $typeNameTh,
        ];

        if ($excludeId !== null) {
            $sql .= " AND organization_type_id <> :excludeId";
            $params[':excludeId'] = (int) $excludeId;
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        $c = (int) ($stmt->fetch(PDO::FETCH_ASSOC)['c'] ?? 0);
        return $c > 0;
    }
}

<?php
// backend/models/DepartmentModel.php
declare(strict_types=1);

require_once __DIR__ . '/../config/db.php';

class DepartmentModel
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? db();
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    /**
     * List departments with search + pagination
     * GET /departments?q=&page=&limit=
     *
     * return:
     * [
     *   "items" => [...],
     *   "pagination" => ["page"=>1,"limit"=>50,"total"=>123,"total_pages"=>3]
     * ]
     */
    public function list(string $q = '', int $page = 1, int $limit = 50, ?int $organization_id = null): array
    {
        $page = max(1, $page);
        $limit = max(1, min(500, $limit));
        $offset = ($page - 1) * $limit;

        $q = trim($q);
        $whereParts = [];
        $params = [];

        // filter: search
        if ($q !== '') {
            $whereParts[] = "(
        d.department_code LIKE :q1
        OR d.department_title LIKE :q2
        OR o.name LIKE :q3
        OR o.code LIKE :q4
    )";
            $like = '%' . $q . '%';
            $params[':q1'] = $like;
            $params[':q2'] = $like;
            $params[':q3'] = $like;
            $params[':q4'] = $like;
        }


        // filter: organization_id
        if ($organization_id !== null && $organization_id > 0) {
            $whereParts[] = "d.organization_id = :orgId";
            $params[':orgId'] = (int) $organization_id;
        }

        $where = $whereParts ? ('WHERE ' . implode(' AND ', $whereParts)) : '';

        // total
        $sqlTotal = "SELECT COUNT(*) AS cnt
            FROM department d
            LEFT JOIN organization o ON o.organization_id = d.organization_id
            {$where}";
        $stmtTotal = $this->pdo->prepare($sqlTotal);

        // bind total params
        foreach ($params as $k => $v) {
            if ($k === ':orgId') {
                $stmtTotal->bindValue($k, (int) $v, PDO::PARAM_INT);
            } else { // :q
                $stmtTotal->bindValue($k, (string) $v, PDO::PARAM_STR);
            }
        }
        $stmtTotal->execute();
        $total = (int) ($stmtTotal->fetchColumn() ?: 0);

        $totalPages = (int) max(1, (int) ceil($total / $limit));

        // items
        $sql = "
        SELECT
            d.department_id,
            d.department_code,
            d.department_title,
            d.organization_id,
            o.name AS organization_name,
            o.code AS organization_code
        FROM department d
        LEFT JOIN organization o ON o.organization_id = d.organization_id
        {$where}
        ORDER BY d.department_id ASC
        LIMIT :limit OFFSET :offset
    ";

        $stmt = $this->pdo->prepare($sql);

        // bind search/org params
        foreach ($params as $k => $v) {
            if ($k === ':orgId') {
                $stmt->bindValue($k, (int) $v, PDO::PARAM_INT);
            } else { // :q
                $stmt->bindValue($k, (string) $v, PDO::PARAM_STR);
            }
        }

        $stmt->bindValue(':limit', (int) $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', (int) $offset, PDO::PARAM_INT);

        $stmt->execute();
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        return [
            'items' => $items,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'total_pages' => $totalPages,
            ],
        ];
    }


    /**
     * Check duplicate by code/title (case-insensitive)
     * If $excludeId provided, ignore that id
     */
    public function existsByCodeOrTitle(string $department_code, string $department_title, int $organization_id, ?int $excludeId = null): bool
    {
        $department_code = trim($department_code);
        $department_title = trim($department_title);
        $organization_id = (int) $organization_id;

        $sql = "
            SELECT d.department_id
            FROM department d
            WHERE d.organization_id = :orgId
              AND (
                    LOWER(d.department_code) = LOWER(:code)
                 OR LOWER(d.department_title) = LOWER(:title)
              )
        ";

        $params = [
            ':code' => $department_code,
            ':title' => $department_title,
            ':orgId' => $organization_id,
        ];

        if ($excludeId !== null && $excludeId > 0) {
            $sql .= " AND d.department_id <> :excludeId";
            $params[':excludeId'] = $excludeId;
        }

        $sql .= " LIMIT 1";

        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $k => $v) {
            if ($k === ':excludeId') {
                $stmt->bindValue($k, (int) $v, PDO::PARAM_INT);
            } else {
                $stmt->bindValue($k, (string) $v, PDO::PARAM_STR);
            }
        }
        $stmt->execute();

        return (bool) $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function create(string $department_code, string $department_title, int $organization_id): array
    {
        $department_code = trim($department_code);
        $department_title = trim($department_title);

        $sql = "INSERT INTO department (department_code, department_title, organization_id) VALUES (:code, :title, :orgId)";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':code' => $department_code,
            ':title' => $department_title,
            ':orgId' => $organization_id,
        ]);

        $id = (int) $this->pdo->lastInsertId();

        return [
            'department_id' => $id,
            'department_code' => $department_code,
            'department_title' => $department_title,
            'organization_id' => $organization_id,
        ];
    }

    public function update(int $department_id, string $department_code, string $department_title, int $organization_id): array
    {
        $department_id = (int) $department_id;
        if ($department_id <= 0) {
            throw new InvalidArgumentException('Invalid department_id');
        }

        $department_code = trim($department_code);
        $department_title = trim($department_title);
        $organization_id = (int) $organization_id;

        $sql = "
            UPDATE department
            SET department_code = :code,
                department_title = :title,
                organization_id = :orgId
            WHERE department_id = :id
        ";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':code' => $department_code,
            ':title' => $department_title,
            ':orgId' => $organization_id,
            ':id' => $department_id,
        ]);

        if ($stmt->rowCount() === 0) {
            // อาจเป็น not found หรือข้อมูลเหมือนเดิมทั้งหมด
            // เช็คว่ามี record ไหม
            if (!$this->findById($department_id)) {
                throw new RuntimeException('Department not found');
            }
        }

        return [
            'department_id' => $department_id,
            'department_code' => $department_code,
            'department_title' => $department_title,
            'organization_id' => $organization_id,
        ];
    }

    public function delete(int $department_id): bool
    {
        $department_id = (int) $department_id;
        if ($department_id <= 0) {
            throw new InvalidArgumentException('Invalid department_id');
        }

        $stmt = $this->pdo->prepare("DELETE FROM department WHERE department_id = :id");
        $stmt->execute([':id' => $department_id]);

        return $stmt->rowCount() > 0;
    }

    public function findById(int $department_id): ?array
    {
        $department_id = (int) $department_id;
        if ($department_id <= 0)
            return null;

        $stmt = $this->pdo->prepare("
            SELECT department_id, department_code, department_title, organization_id
            FROM department
            WHERE department_id = :id
            LIMIT 1
        ");
        $stmt->execute([':id' => $department_id]);

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }
}

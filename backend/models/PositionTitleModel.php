<?php
// backend/models/PositionTitleModel.php
declare(strict_types=1);

require_once __DIR__ . '/../config/db.php';

class PositionTitleModel
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? db();
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    /**
     * List position titles with search + filters + pagination
     * GET /position-titles?q=&page=&limit=&organization_id=&department_id=
     *
     * return:
     * [
     *   "items" => [...],
     *   "pagination" => ["page"=>1,"limit"=>50,"total"=>123,"total_pages"=>3]
     * ]
     */
    public function list(
        string $q = '',
        int $page = 1,
        int $limit = 50,
        ?int $organization_id = null,
        ?int $department_id = null
    ): array {
        $page = max(1, $page);
        $limit = max(1, min(500, $limit));
        $offset = ($page - 1) * $limit;

        $q = trim($q);
        $whereParts = [];
        $params = [];

        // search
        if ($q !== '') {
            $whereParts[] = "(
        p.position_code LIKE :q1
        OR p.position_title LIKE :q2
        OR d.department_code LIKE :q3
        OR d.department_title LIKE :q4
        OR o.code LIKE :q5
        OR o.name LIKE :q6
    )";

            $like = '%' . $q . '%';
            $params[':q1'] = $like;
            $params[':q2'] = $like;
            $params[':q3'] = $like;
            $params[':q4'] = $like;
            $params[':q5'] = $like;
            $params[':q6'] = $like;
        }


        // filter: organization (รองรับกรณี dept_id = NULL)
        if ($organization_id !== null && $organization_id > 0) {
            $whereParts[] = "COALESCE(p.organization_id, d.organization_id) = :orgId";
            $params[':orgId'] = (int) $organization_id;
        }

        // filter: department
        if ($department_id !== null && $department_id > 0) {
            $whereParts[] = "p.department_id = :depId";
            $params[':depId'] = (int) $department_id;
        }

        $where = $whereParts ? ('WHERE ' . implode(' AND ', $whereParts)) : '';

        // total
        $sqlTotal = "
            SELECT COUNT(*) AS cnt
            FROM position_title p
            LEFT JOIN department d ON d.department_id = p.department_id
            LEFT JOIN organization o ON o.organization_id = COALESCE(p.organization_id, d.organization_id)
            {$where}
        ";
        $stmtTotal = $this->pdo->prepare($sqlTotal);

        foreach ($params as $k => $v) {
            if ($k === ':orgId' || $k === ':depId') {
                $stmtTotal->bindValue($k, (int) $v, PDO::PARAM_INT);
            } else {
                $stmtTotal->bindValue($k, (string) $v, PDO::PARAM_STR);
            }
        }
        $stmtTotal->execute();
        $total = (int) ($stmtTotal->fetchColumn() ?: 0);

        $totalPages = (int) max(1, (int) ceil($total / $limit));

        // items
        $sql = "
            SELECT
                p.position_title_id,
                p.position_code,
                p.position_title,
                p.department_id,
                p.organization_id,

                d.department_code,
                d.department_title,
                d.organization_id AS department_org_id,

                o.code AS organization_code,
                o.name AS organization_name

            FROM position_title p
            LEFT JOIN department d ON d.department_id = p.department_id
            LEFT JOIN organization o ON o.organization_id = COALESCE(p.organization_id, d.organization_id)
            {$where}
            ORDER BY p.position_title_id ASC
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $this->pdo->prepare($sql);

        foreach ($params as $k => $v) {
            if ($k === ':orgId' || $k === ':depId') {
                $stmt->bindValue($k, (int) $v, PDO::PARAM_INT);
            } else {
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
     * Lightweight list for dropdown
     * GET /position-titles/dropdown?organization_id=&department_id=
     *
     * - ถ้าใส่ organization_id อย่างเดียว: คืนตำแหน่งที่เป็นของหน่วยงานนั้นทั้งหมด
     * - ถ้าใส่ department_id ด้วย: คืนเฉพาะตำแหน่งในฝ่ายนั้น
     */
    public function listForDropdown(int $organization_id, ?int $department_id = null): array
    {
        $organization_id = (int) $organization_id;
        if ($organization_id <= 0) {
            return [];
        }

        $department_id = ($department_id !== null) ? (int) $department_id : null;
        if ($department_id !== null && $department_id <= 0) {
            $department_id = null;
        }

        $where = "WHERE p.organization_id = :orgId";
        $params = [':orgId' => $organization_id];

        if ($department_id !== null) {
            $where .= " AND p.department_id = :depId";
            $params[':depId'] = $department_id;
        }

        $sql = "
            SELECT
                p.position_title_id,
                p.position_code,
                p.position_title,
                p.organization_id,
                p.department_id,
                d.department_title,
                o.name AS organization_name
            FROM position_title p
            LEFT JOIN department d ON d.department_id = p.department_id
            LEFT JOIN organization o ON o.organization_id = p.organization_id
            {$where}
            ORDER BY p.position_title ASC, p.position_title_id ASC
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':orgId', $organization_id, PDO::PARAM_INT);
        if ($department_id !== null) {
            $stmt->bindValue(':depId', $department_id, PDO::PARAM_INT);
        }
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }


    /**
     * Check duplicate by code/title within same (org + department)
     * - ถ้า department_id เป็น NULL => เทียบเฉพาะรายการที่ department_id IS NULL ภายใต้ org เดียวกัน
     * - ถ้า department_id ไม่ NULL => เทียบภายใต้ department_id นั้น (และ org เดียวกันเพื่อความปลอดภัย)
     */
    public function existsByCodeOrTitle(
        string $position_code,
        string $position_title,
        int $organization_id,
        ?int $department_id,
        ?int $excludeId = null
    ): bool {
        $position_code = trim($position_code);
        $position_title = trim($position_title);
        $organization_id = (int) $organization_id;

        if ($organization_id <= 0) {
            // ปกติควรถูก validate ใน controller ก่อนแล้ว
            throw new InvalidArgumentException('Invalid organization_id');
        }

        // dept เงื่อนไข
        $whereDept = ($department_id === null)
            ? "p.department_id IS NULL"
            : "p.department_id = :depId";

        $sql = "
            SELECT p.position_title_id
            FROM position_title p
            WHERE p.organization_id = :orgId
              AND {$whereDept}
              AND (
                    LOWER(p.position_code) = LOWER(:code)
                 OR LOWER(p.position_title) = LOWER(:title)
              )
        ";

        $params = [
            ':orgId' => $organization_id,
            ':code' => $position_code,
            ':title' => $position_title,
        ];

        if ($department_id !== null) {
            $params[':depId'] = (int) $department_id;
        }

        if ($excludeId !== null && $excludeId > 0) {
            $sql .= " AND p.position_title_id <> :excludeId";
            $params[':excludeId'] = (int) $excludeId;
        }

        $sql .= " LIMIT 1";

        $stmt = $this->pdo->prepare($sql);

        foreach ($params as $k => $v) {
            if (in_array($k, [':orgId', ':depId', ':excludeId'], true)) {
                $stmt->bindValue($k, (int) $v, PDO::PARAM_INT);
            } else {
                $stmt->bindValue($k, (string) $v, PDO::PARAM_STR);
            }
        }

        $stmt->execute();
        return (bool) $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function create(
        string $position_code,
        string $position_title,
        int $organization_id,
        ?int $department_id
    ): array {
        $position_code = trim($position_code);
        $position_title = trim($position_title);
        $organization_id = (int) $organization_id;

        if ($organization_id <= 0) {
            throw new InvalidArgumentException('Invalid organization_id');
        }

        if ($department_id !== null) {
            $department_id = (int) $department_id;
            if ($department_id <= 0)
                $department_id = null; // กันค่า 0 หลุดมา
        }

        $sql = "
            INSERT INTO position_title (position_code, position_title, organization_id, department_id)
            VALUES (:code, :title, :orgId, :depId)
        ";
        $stmt = $this->pdo->prepare($sql);

        $stmt->bindValue(':code', $position_code, PDO::PARAM_STR);
        $stmt->bindValue(':title', $position_title, PDO::PARAM_STR);
        $stmt->bindValue(':orgId', $organization_id, PDO::PARAM_INT);

        if ($department_id === null) {
            $stmt->bindValue(':depId', null, PDO::PARAM_NULL);
        } else {
            $stmt->bindValue(':depId', $department_id, PDO::PARAM_INT);
        }

        $stmt->execute();

        $id = (int) $this->pdo->lastInsertId();
        return $this->findById($id) ?? [
            'position_title_id' => $id,
            'position_code' => $position_code,
            'position_title' => $position_title,
            'organization_id' => $organization_id,
            'department_id' => $department_id,
        ];
    }

    public function update(
        int $position_title_id,
        string $position_code,
        string $position_title,
        int $organization_id,
        ?int $department_id
    ): array {
        $position_title_id = (int) $position_title_id;
        if ($position_title_id <= 0)
            throw new InvalidArgumentException('Invalid position_title_id');

        $position_code = trim($position_code);
        $position_title = trim($position_title);
        $organization_id = (int) $organization_id;

        if ($organization_id <= 0) {
            throw new InvalidArgumentException('Invalid organization_id');
        }

        if ($department_id !== null) {
            $department_id = (int) $department_id;
            if ($department_id <= 0)
                $department_id = null;
        }

        $sql = "
            UPDATE position_title
            SET position_code = :code,
                position_title = :title,
                organization_id = :orgId,
                department_id = :depId
            WHERE position_title_id = :id
        ";
        $stmt = $this->pdo->prepare($sql);

        $stmt->bindValue(':code', $position_code, PDO::PARAM_STR);
        $stmt->bindValue(':title', $position_title, PDO::PARAM_STR);
        $stmt->bindValue(':orgId', $organization_id, PDO::PARAM_INT);

        if ($department_id === null) {
            $stmt->bindValue(':depId', null, PDO::PARAM_NULL);
        } else {
            $stmt->bindValue(':depId', $department_id, PDO::PARAM_INT);
        }

        $stmt->bindValue(':id', $position_title_id, PDO::PARAM_INT);
        $stmt->execute();

        if ($stmt->rowCount() === 0 && !$this->findById($position_title_id)) {
            throw new RuntimeException('Position title not found');
        }

        return $this->findById($position_title_id) ?? [
            'position_title_id' => $position_title_id,
            'position_code' => $position_code,
            'position_title' => $position_title,
            'organization_id' => $organization_id,
            'department_id' => $department_id,
        ];
    }

    public function delete(int $position_title_id): bool
    {
        $position_title_id = (int) $position_title_id;
        if ($position_title_id <= 0) {
            throw new InvalidArgumentException('Invalid position_title_id');
        }

        $stmt = $this->pdo->prepare("DELETE FROM position_title WHERE position_title_id = :id");
        $stmt->execute([':id' => $position_title_id]);

        return $stmt->rowCount() > 0;
    }

    public function findById(int $position_title_id): ?array
    {
        $position_title_id = (int) $position_title_id;
        if ($position_title_id <= 0)
            return null;

        $sql = "
            SELECT
                p.position_title_id,
                p.position_code,
                p.position_title,
                p.department_id,
                p.organization_id,

                d.department_code,
                d.department_title,
                d.organization_id AS department_org_id,

                o.code AS organization_code,
                o.name AS organization_name

            FROM position_title p
            LEFT JOIN department d ON d.department_id = p.department_id
            LEFT JOIN organization o ON o.organization_id = COALESCE(p.organization_id, d.organization_id)
            WHERE p.position_title_id = :id
            LIMIT 1
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':id' => $position_title_id]);

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }
}

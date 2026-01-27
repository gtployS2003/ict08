<?php
// backend/models/PersonModel.php
declare(strict_types=1);

class PersonModel
{
    public function __construct(private PDO $pdo)
    {
    }

    /**
     * ใช้เช็คสถานะการอนุมัติ
     * - เรียกจาก AuthController::lineLogin()
     */
    public function findByUserId(int $userId): ?array
    {
        $sql = "
            SELECT
                person_id,
                person_user_id,
                person_prefix_id,
                first_name_th,
                last_name_th,
                department_id,
                position_title_id,
                organization_id,
                is_active
            FROM person
            WHERE person_user_id = :uid
            LIMIT 1
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':uid' => $userId
        ]);

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * ใช้ตอนสมัครสมาชิก (register)
     * - is_active ต้องเป็น 0 (รอการอนุมัติ)
     *
     * ต้องมี key:
     * - person_user_id
     * - person_prefix_id
     * - first_name_th
     * - last_name_th
     * - department_id
     * - position_title_id
     * - organization_id (optional null)
     */
    public function create(array $data): int
    {
        $firstTh = (string) ($data['first_name_th'] ?? '');
        $lastTh = (string) ($data['last_name_th'] ?? '');

        $firstEn = $data['first_name_en'] ?? null;
        $lastEn = $data['last_name_en'] ?? null;
        $display = (string) ($data['display_name'] ?? trim($firstTh . ' ' . $lastTh));

        $orgId = $data['organization_id'] ?? null;
        if ($orgId === '' || $orgId === 'null')
            $orgId = null;
        if (is_string($orgId) && ctype_digit($orgId))
            $orgId = (int) $orgId;
        if (is_int($orgId) && $orgId <= 0)
            $orgId = null;


        $sql = "
        INSERT INTO person (
            person_user_id,
            person_prefix_id,
            first_name_th,
            first_name_en,
            last_name_th,
            last_name_en,
            display_name,
            department_id,
            position_title_id,
            organization_id,
            is_active
        ) VALUES (
            :person_user_id,
            :person_prefix_id,
            :first_name_th,
            :first_name_en,
            :last_name_th,
            :last_name_en,
            :display_name,
            :department_id,
            :position_title_id,
            :organization_id,
            :is_active
        )
    ";

        $stmt = $this->pdo->prepare($sql);

        $stmt->bindValue(':person_user_id', (int) $data['person_user_id'], PDO::PARAM_INT);
        $stmt->bindValue(':person_prefix_id', (int) $data['person_prefix_id'], PDO::PARAM_INT);

        $stmt->bindValue(':first_name_th', $firstTh, PDO::PARAM_STR);
        $stmt->bindValue(':last_name_th', $lastTh, PDO::PARAM_STR);

        // ✅ NULL ได้จริง
        $stmt->bindValue(':first_name_en', $firstEn, $firstEn === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
        $stmt->bindValue(':last_name_en', $lastEn, $lastEn === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
        $stmt->bindValue(':display_name', $display, $display === null ? PDO::PARAM_NULL : PDO::PARAM_STR);

        $stmt->bindValue(':department_id', (int) $data['department_id'], PDO::PARAM_INT);
        $stmt->bindValue(':position_title_id', (int) $data['position_title_id'], PDO::PARAM_INT);

        if ($orgId === null)
            $stmt->bindValue(':organization_id', null, PDO::PARAM_NULL);
        else
            $stmt->bindValue(':organization_id', (int) $orgId, PDO::PARAM_INT);

        $stmt->bindValue(':is_active', (int) ($data['is_active'] ?? 0), PDO::PARAM_INT);

        $stmt->execute();
        return (int) $this->pdo->lastInsertId();
    }

    
    /**
     * (ใช้ฝั่ง admin) อนุมัติสมาชิก (ชื่อเดิมที่คุณมี)
     * - set is_active = 1
     */
    public function approveByUserId(int $userId): bool
    {
        return $this->setActiveByUserId($userId, 1);
    }
    public function setActiveByUserId(int $userId, int $isActive): bool
    {
        $sql = "
            UPDATE person
            SET is_active = :active
            WHERE person_user_id = :uid
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':active', $isActive, PDO::PARAM_INT);
        $stmt->bindValue(':uid', $userId, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }

    /**
     * ✅ ดึงรายการ "รออนุมัติ" เพื่อแสดงใน profile-setup.html (admin)
     * output columns:
     * - line_user_name | display_name | organization_name | department_name | position_title_name | role
     *
     * @return array{items: array<int,array<string,mixed>>, page:int, limit:int, total:int, totalPages:int}
     */
    public function getPendingApprovals(string $q = '', int $page = 1, int $limit = 50): array
    {
        $page = max(1, $page);
        $limit = max(1, min(200, $limit));
        $offset = ($page - 1) * $limit;

        $where = "p.is_active = 0";
        $params = [];

        if ($q !== '') {
            // ค้นจาก line name หรือ display name
            $where .= " AND (
                u.line_user_name LIKE :q
                OR p.display_name LIKE :q
            )";
            $params[':q'] = '%' . $q . '%';
        }

        // total
        $sqlCount = "
            SELECT COUNT(*) AS cnt
            FROM person p
            JOIN user u ON u.user_id = p.person_user_id
            WHERE $where
        ";
        $stmtC = $this->pdo->prepare($sqlCount);
        $stmtC->execute($params);
        $total = (int)($stmtC->fetch(PDO::FETCH_ASSOC)['cnt'] ?? 0);
        $totalPages = (int)max(1, (int)ceil($total / $limit));

        // items
        $sql = "
            SELECT
                u.user_id,
                u.line_user_name,
                p.display_name,

                o.name,
                d.department_title,
                pt.position_title,

                ur.user_role_id,
                ur.role

            FROM person p
            JOIN user u ON u.user_id = p.person_user_id
            JOIN user_role ur ON ur.user_role_id = u.user_role_id

            LEFT JOIN organization o ON o.organization_id = p.organization_id
            LEFT JOIN department d ON d.department_id = p.department_id
            LEFT JOIN position_title pt ON pt.position_title_id = p.position_title_id

            WHERE $where
            ORDER BY p.person_id DESC
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $this->pdo->prepare($sql);

        // bind search params
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v, PDO::PARAM_STR);
        }

        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);

        $stmt->execute();
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        return [
            'items' => $items,
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'totalPages' => $totalPages,
        ];
    }
}

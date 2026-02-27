<?php
// backend/models/UsersModel.php
declare(strict_types=1);

class UsersModel
{
    /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * คืนรายการผู้ใช้แบบ JOIN (person + user + role + prefix + org + dept + position)
     * รองรับ:
     * - q (search ทุกฟิลด์หลัก)
     * - organization_id, department_id, position_title_id (filter)
     * - page, limit (pagination)
     *
     * return: [
     *   'items' => [...],
     *   'page' => int,
     *   'limit' => int,
     *   'total' => int,
     *   'total_pages' => int
     * ]
     */
    public function list(array $params = []): array
    {
        $q = isset($params['q']) ? trim((string) $params['q']) : '';
        $page = isset($params['page']) ? max(1, (int) $params['page']) : 1;
        $limit = isset($params['limit']) ? max(1, (int) $params['limit']) : 50;

        $organization_id = $this->toIntOrNull($params['organization_id'] ?? null);
        $department_id = $this->toIntOrNull($params['department_id'] ?? null);
        $position_title_id = $this->toIntOrNull($params['position_title_id'] ?? null);

        $offset = ($page - 1) * $limit;

        $whereSql = [];
        $bind = [];

        // filters (หลัก)
        if ($organization_id !== null) {
            $whereSql[] = "p.organization_id = :organization_id";
            $bind[':organization_id'] = $organization_id;

            // กันหลุดองค์กร (ไม่ต้องใช้ placeholder ซ้ำ)
            $whereSql[] = "(d.organization_id IS NULL OR d.organization_id = p.organization_id)";
            $whereSql[] = "(pt.organization_id IS NULL OR pt.organization_id = p.organization_id)";
        }

        if ($department_id !== null) {
            $whereSql[] = "p.department_id = :department_id";
            $bind[':department_id'] = $department_id;

            // กันหลุดฝ่าย (ไม่ต้องใช้ placeholder ซ้ำ)
            $whereSql[] = "(pt.department_id IS NULL OR pt.department_id = p.department_id)";
        }

        if ($position_title_id !== null) {
            $whereSql[] = "p.position_title_id = :position_title_id";
            $bind[':position_title_id'] = $position_title_id;
        }

        // search (ค้นได้ทั้งหมด)
        if ($q !== '') {
            $cols = [
                'p.first_name_th',
                'p.last_name_th',
                'p.first_name_en',
                'p.last_name_en',
                'p.display_name',
                'u.line_user_id',
                'u.line_user_name',
                'ur.role',
                'ur.code',
                'pp.prefix_th',
                'pp.prefix_en',
                'o.name',
                'o.code',
                'd.department_title',
                'd.department_code',
                'pt.position_title',
                'pt.position_code',
            ];

            $ors = [];
            foreach ($cols as $i => $col) {
                $ph = ":q{$i}";
                $ors[] = "{$col} LIKE {$ph}";
                $bind[$ph] = '%' . $q . '%';
            }

            $whereSql[] = '(' . implode(' OR ', $ors) . ')';
        }

        $where = '';
        if (!empty($whereSql)) {
            $where = 'WHERE ' . implode(' AND ', $whereSql);
        }


        // ===== count total =====
        $countSql = "
            SELECT COUNT(*) AS total
            FROM person p
            JOIN user u ON u.user_id = p.person_user_id
            JOIN user_role ur ON ur.user_role_id = u.user_role_id
            LEFT JOIN person_prefix pp ON pp.person_prefix_id = p.person_prefix_id
            LEFT JOIN organization o ON o.organization_id = p.organization_id
            LEFT JOIN department d ON d.department_id = p.department_id
            LEFT JOIN position_title pt ON pt.position_title_id = p.position_title_id
            $where
        ";
        $stmt = $this->pdo->prepare($countSql);
        $stmt->execute($bind);
        $total = (int) ($stmt->fetchColumn() ?: 0);

        // ===== list items =====
        $sql = "
            SELECT
                p.person_id,
                p.person_user_id,

                p.person_prefix_id,
                pp.prefix_th,
                pp.prefix_en,

                p.first_name_th,
                p.last_name_th,
                p.first_name_en,
                p.last_name_en,
                p.display_name,

                p.organization_id,
                o.code AS organization_code,
                o.name AS organization_name,

                p.department_id,
                d.department_code,
                d.department_title,

                p.position_title_id,
                pt.position_code,
                pt.position_title,

                u.user_id,
                u.line_user_id,
                u.line_user_name,

                u.user_role_id,
                ur.code AS role_code,
                ur.role AS role_name,

                p.photo_path,
                p.is_active,
                p.start_date,
                p.end_date,
                p.create_at
            FROM person p
            JOIN user u ON u.user_id = p.person_user_id
            JOIN user_role ur ON ur.user_role_id = u.user_role_id
            LEFT JOIN person_prefix pp ON pp.person_prefix_id = p.person_prefix_id
            LEFT JOIN organization o ON o.organization_id = p.organization_id
            LEFT JOIN department d ON d.department_id = p.department_id
            LEFT JOIN position_title pt ON pt.position_title_id = p.position_title_id
            $where
            ORDER BY pt.position_title ASC, pt.position_title_id ASC
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $this->pdo->prepare($sql);

        // bind ปกติ
        foreach ($bind as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        // bind limit/offset ต้องเป็น int
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);

        $stmt->execute();
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $totalPages = (int) ceil($total / max(1, $limit));

        return [
            'items' => $items,
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'total_pages' => $totalPages,
        ];
    }

    /**
     * ดึงข้อมูลผู้ใช้ 1 รายการตาม person_id
     */
    public function find(int $personId): ?array
    {
        $sql = "
            SELECT
                p.person_id,
                p.person_user_id,

                p.person_prefix_id,
                pp.prefix_th,
                pp.prefix_en,

                p.first_name_th,
                p.last_name_th,
                p.first_name_en,
                p.last_name_en,
                p.display_name,

                p.organization_id,
                o.code AS organization_code,
                o.name AS organization_name,

                p.department_id,
                d.department_code,
                d.department_title,

                p.position_title_id,
                pt.position_code,
                pt.position_title,

                u.user_id,
                u.line_user_id,
                u.line_user_name,

                u.user_role_id,
                ur.code AS role_code,
                ur.role AS role_name,

                p.photo_path,
                p.is_active,
                p.start_date,
                p.end_date,
                p.create_at
            FROM person p
            JOIN user u ON u.user_id = p.person_user_id
            JOIN user_role ur ON ur.user_role_id = u.user_role_id
            LEFT JOIN person_prefix pp ON pp.person_prefix_id = p.person_prefix_id
            LEFT JOIN organization o ON o.organization_id = p.organization_id
            LEFT JOIN department d ON d.department_id = p.department_id
            LEFT JOIN position_title pt ON pt.position_title_id = p.position_title_id
            WHERE p.person_id = :pid
            LIMIT 1
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':pid' => $personId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

        public function findDetail(int $personId): ?array
    {
        $sql = "
        SELECT
            -- person
            p.person_id,
            p.person_user_id,
            p.person_prefix_id,
            p.first_name_th,
            p.first_name_en,
            p.last_name_th,
            p.last_name_en,
            p.display_name,
            p.organization_id,
            p.department_id,
            p.position_title_id,
            p.photo_path,
            p.is_active,
            p.start_date,
            p.end_date,
            p.create_at,


            px.prefix_th AS prefix_name,
            o.name AS organization_name,
            d.department_title AS department_name,
            pt.position_title AS position_title_name,

            -- user + role (ถ้าต้องการโชว์ใน modal ด้วย)
            u.user_id,
            u.line_user_id,
            u.line_user_name,
            u.user_role_id,
            ur.role AS user_role_name

        FROM person p
        LEFT JOIN user u ON u.user_id = p.person_user_id
        LEFT JOIN user_role ur ON ur.user_role_id = u.user_role_id

        LEFT JOIN organization o ON o.organization_id = p.organization_id
        LEFT JOIN department d ON d.department_id = p.department_id
        LEFT JOIN position_title pt ON pt.position_title_id = p.position_title_id

        LEFT JOIN person_prefix px ON px.person_prefix_id = p.person_prefix_id

        WHERE p.person_id = :pid
        LIMIT 1
    ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':pid', $personId, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * CREATE: เพิ่มผู้ใช้ใหม่
     * - สร้าง user ก่อน (LINE fields อาจว่างได้ ถ้าเพิ่มจากหลังบ้าน)
     * - สร้าง person ผูกกับ user
     */
    public function create(array $data): int
    {
        $this->pdo->beginTransaction();
        try {
            // 1) create user
            $sqlUser = "
                INSERT INTO user (line_user_id, line_user_name, user_role_id)
                VALUES (:line_user_id, :line_user_name, :user_role_id)
            ";
            $stmtUser = $this->pdo->prepare($sqlUser);
            $stmtUser->execute([
                ':line_user_id' => (string) ($data['line_user_id'] ?? ''),
                ':line_user_name' => (string) ($data['line_user_name'] ?? ''),
                ':user_role_id' => (int) ($data['user_role_id'] ?? 0),
            ]);

            $userId = (int) $this->pdo->lastInsertId();

            // 2) create person
            $sqlPerson = "
                INSERT INTO person (
                    person_user_id,
                    person_prefix_id,
                    first_name_th,
                    last_name_th,
                    first_name_en,
                    last_name_en,
                    display_name,
                    organization_id,
                    department_id,
                    position_title_id,
                    photo_path,
                    is_active,
                    start_date,
                    end_date,
                    create_at
                ) VALUES (
                    :person_user_id,
                    :person_prefix_id,
                    :first_name_th,
                    :last_name_th,
                    :first_name_en,
                    :last_name_en,
                    :display_name,
                    :organization_id,
                    :department_id,
                    :position_title_id,
                    :photo_path,
                    :is_active,
                    :start_date,
                    :end_date,
                    NOW()
                )
            ";
            $stmtPerson = $this->pdo->prepare($sqlPerson);
            $stmtPerson->execute([
                ':person_user_id' => $userId,
                ':person_prefix_id' => (int) ($data['person_prefix_id'] ?? 0),
                ':first_name_th' => (string) ($data['first_name_th'] ?? ''),
                ':last_name_th' => (string) ($data['last_name_th'] ?? ''),
                ':first_name_en' => (string) ($data['first_name_en'] ?? ''),
                ':last_name_en' => (string) ($data['last_name_en'] ?? ''),
                ':display_name' => (string) ($data['display_name'] ?? ''),
                ':organization_id' => (int) ($data['organization_id'] ?? 0),
                ':department_id' => (int) ($data['department_id'] ?? 0),
                ':position_title_id' => (int) ($data['position_title_id'] ?? 0),
                ':photo_path' => (string) ($data['photo_path'] ?? ''),
                ':is_active' => (int) ($data['is_active'] ?? 0),
                ':start_date' => $data['start_date'] ?? null,
                ':end_date' => $data['end_date'] ?? null,
            ]);

            $personId = (int) $this->pdo->lastInsertId();

            $this->pdo->commit();
            return $personId;
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    /**
     * UPDATE: แก้ไขผู้ใช้ (แก้ทั้ง user + person)
     * personId คือ p.person_id
     */
    public function update(int $personId, array $data): bool
    {
        $this->pdo->beginTransaction();
        try {
            $row = $this->find($personId);
            if (!$row) {
                $this->pdo->rollBack();
                return false;
            }
            $userId = (int) $row['user_id'];

            // update user
            $sqlUser = "
                UPDATE user
                SET
                    line_user_id = :line_user_id,
                    line_user_name = :line_user_name,
                    user_role_id = :user_role_id
                WHERE user_id = :user_id
                LIMIT 1
            ";
            $stmtUser = $this->pdo->prepare($sqlUser);
            $stmtUser->execute([
                ':line_user_id' => (string) ($data['line_user_id'] ?? $row['line_user_id'] ?? ''),
                ':line_user_name' => (string) ($data['line_user_name'] ?? $row['line_user_name'] ?? ''),
                ':user_role_id' => (int) ($data['user_role_id'] ?? $row['user_role_id'] ?? 0),
                ':user_id' => $userId,
            ]);

            // update person
            $sqlPerson = "
                UPDATE person
                SET
                    person_prefix_id = :person_prefix_id,
                    first_name_th = :first_name_th,
                    last_name_th = :last_name_th,
                    first_name_en = :first_name_en,
                    last_name_en = :last_name_en,
                    display_name = :display_name,
                    organization_id = :organization_id,
                    department_id = :department_id,
                    position_title_id = :position_title_id,
                    photo_path = :photo_path,
                    is_active = :is_active,
                    start_date = :start_date,
                    end_date = :end_date
                WHERE person_id = :person_id
                LIMIT 1
            ";
            $stmtPerson = $this->pdo->prepare($sqlPerson);
            $stmtPerson->execute([
                ':person_prefix_id' => (int) ($data['person_prefix_id'] ?? $row['person_prefix_id'] ?? 0),
                ':first_name_th' => (string) ($data['first_name_th'] ?? $row['first_name_th'] ?? ''),
                ':last_name_th' => (string) ($data['last_name_th'] ?? $row['last_name_th'] ?? ''),
                ':first_name_en' => (string) ($data['first_name_en'] ?? $row['first_name_en'] ?? ''),
                ':last_name_en' => (string) ($data['last_name_en'] ?? $row['last_name_en'] ?? ''),
                ':display_name' => (string) ($data['display_name'] ?? $row['display_name'] ?? ''),
                ':organization_id' => (int) ($data['organization_id'] ?? $row['organization_id'] ?? 0),
                ':department_id' => (int) ($data['department_id'] ?? $row['department_id'] ?? 0),
                ':position_title_id' => (int) ($data['position_title_id'] ?? $row['position_title_id'] ?? 0),
                ':photo_path' => (string) ($data['photo_path'] ?? $row['photo_path'] ?? ''),
                ':is_active' => (int) ($data['is_active'] ?? $row['is_active'] ?? 0),
                ':start_date' => $data['start_date'] ?? $row['start_date'] ?? null,
                ':end_date' => $data['end_date'] ?? $row['end_date'] ?? null,
                ':person_id' => $personId,
            ]);

            $this->pdo->commit();
            return true;
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    /**
     * DELETE: ลบผู้ใช้
     * - ลบ person ก่อน แล้วลบ user
     * ระวัง: ถ้า user ถูกอ้างอิงจากตารางอื่น จะลบไม่ได้ (FK)
     */
    public function delete(int $personId): bool
    {
        $this->pdo->beginTransaction();
        try {
            $row = $this->find($personId);
            if (!$row) {
                $this->pdo->rollBack();
                return false;
            }
            $userId = (int) $row['user_id'];

            $stmt1 = $this->pdo->prepare("DELETE FROM person WHERE person_id = :pid LIMIT 1");
            $stmt1->execute([':pid' => $personId]);

            $stmt2 = $this->pdo->prepare("DELETE FROM user WHERE user_id = :uid LIMIT 1");
            $stmt2->execute([':uid' => $userId]);

            $this->pdo->commit();
            return true;
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    private function toIntOrNull(mixed $v): ?int
    {
        if ($v === null)
            return null;
        if ($v === '')
            return null;
        if (is_int($v))
            return $v;
        $s = (string) $v;
        if (!ctype_digit($s))
            return null;
        return (int) $s;
    }
}

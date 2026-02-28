<?php
// backend/models/PersonPrefixModel.php
declare(strict_types=1);

require_once __DIR__ . '/../config/db.php';

class PersonPrefixModel
{
    /** @var PDO */
    private $pdo;

    public function __construct(?PDO $pdo = null)
    {
        // รองรับทั้งแบบส่ง PDO เข้ามา และแบบใช้ db.php (เพื่อให้เข้ากับโครงสร้างโปรเจกต์ที่มีอยู่)
        if ($pdo instanceof PDO) {
            $this->pdo = $pdo;
        } else {
            if (function_exists('db')) {
                /** @var PDO $conn */
                $conn = db();
                $this->pdo = $conn;
            } elseif (isset($GLOBALS['pdo']) && $GLOBALS['pdo'] instanceof PDO) {
                $this->pdo = $GLOBALS['pdo'];
            } else {
                throw new RuntimeException('Database connection not available (PDO).');
            }
        }

        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    /* =========================
       Queries
    ========================= */

    /**
     * GET /person-prefixes?q=&page=&limit=
     * คืนค่า:
     *  [
     *    'items' => [...],
     *    'pagination' => ['page'=>1,'limit'=>50,'total'=>100,'total_pages'=>2]
     *  ]
     */
    public function list(?string $q, int $page = 1, int $limit = 50): array
    {
        $page = max(1, (int) $page);
        $limit = max(1, min(200, (int) $limit));
        $offset = ($page - 1) * $limit;

        $where = '';
        $params = [];

        $q = trim((string) $q);
        if ($q !== '') {
            $where = " WHERE prefix_en LIKE :q1 OR prefix_th LIKE :q2 ";
            $like = "%{$q}%";
            $params[':q1'] = $like;
            $params[':q2'] = $like;
        }

        // total
        $sqlCount = "SELECT COUNT(*) FROM person_prefix" . $where;
        $stmt = $this->pdo->prepare($sqlCount);
        foreach ($params as $k => $v)
            $stmt->bindValue($k, $v, PDO::PARAM_STR);
        $stmt->execute();
        $total = (int) $stmt->fetchColumn();

        $totalPages = (int) ceil($total / $limit);
        if ($totalPages <= 0)
            $totalPages = 1;
        if ($page > $totalPages) {
            $page = $totalPages;
            $offset = ($page - 1) * $limit;
        }

        // items
        $sql = "
            SELECT
              person_prefix_id,
              prefix_th,
              prefix_en
            FROM person_prefix
            $where
            ORDER BY person_prefix_id ASC
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $k => $v)
            $stmt->bindValue($k, $v, PDO::PARAM_STR);
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
                'total_pages' => $totalPages,
            ],
        ];
    }

    public function getById(int $id): array
    {
        $stmt = $this->pdo->prepare("
            SELECT person_prefix_id, prefix_th, prefix_en
            FROM person_prefix
            WHERE person_prefix_id = :id
            LIMIT 1
        ");
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new RuntimeException('Person prefix not found');
        }
        return $row;
    }

    /**
     * ตรวจซ้ำ: prefix_en หรือ prefix_th ซ้ำ (ยกเว้น id ที่ระบุ)
     */
    public function existsByName(string $prefixEN, string $prefixTH, ?int $exceptId = null): bool
    {
        $prefixEN = trim($prefixEN);
        $prefixTH = trim($prefixTH);

        $sql = "
            SELECT 1
            FROM person_prefix
            WHERE (prefix_en = :en OR prefix_th = :th)
        ";
        if ($exceptId !== null) {
            $sql .= " AND person_prefix_id <> :exceptId ";
        }
        $sql .= " LIMIT 1 ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':en', $prefixEN, PDO::PARAM_STR);
        $stmt->bindValue(':th', $prefixTH, PDO::PARAM_STR);
        if ($exceptId !== null) {
            $stmt->bindValue(':exceptId', $exceptId, PDO::PARAM_INT);
        }
        $stmt->execute();

        return (bool) $stmt->fetchColumn();
    }

    public function create(string $prefixEN, string $prefixTH): array
    {
        $prefixEN = trim($prefixEN);
        $prefixTH = trim($prefixTH);

        $stmt = $this->pdo->prepare("
            INSERT INTO person_prefix (prefix_th, prefix_en)
            VALUES (:th, :en)
        ");
        $stmt->bindValue(':th', $prefixTH, PDO::PARAM_STR);
        $stmt->bindValue(':en', $prefixEN, PDO::PARAM_STR);
        $stmt->execute();

        $id = (int) $this->pdo->lastInsertId();
        return $this->getById($id);
    }

    public function update(int $id, string $prefixEN, string $prefixTH): array
    {
        // ensure exists (จะ throw ถ้าไม่เจอ)
        $this->getById($id);

        $prefixEN = trim($prefixEN);
        $prefixTH = trim($prefixTH);

        $stmt = $this->pdo->prepare("
            UPDATE person_prefix
            SET prefix_th = :th,
                prefix_en = :en
            WHERE person_prefix_id = :id
        ");
        $stmt->bindValue(':th', $prefixTH, PDO::PARAM_STR);
        $stmt->bindValue(':en', $prefixEN, PDO::PARAM_STR);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();

        return $this->getById($id);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare("
            DELETE FROM person_prefix
            WHERE person_prefix_id = :id
        ");
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }
}

<?php
// backend/models/RequestTypeModel.php
declare(strict_types=1);

class RequestTypeModel
{
    /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * ดึงรายการทั้งหมดแบบมี search + pagination
     * GET /request-types?q=&page=&limit=
     */
    public function list(string $q = '', int $page = 1, int $limit = 50): array
    {
        $page = max(1, $page);
        $limit = max(1, min(200, $limit));
        $offset = ($page - 1) * $limit;

        $params = [];
        $whereSql = '';

        if (trim($q) !== '') {
            $whereSql = "WHERE type_name LIKE :q OR discription LIKE :q OR url_link LIKE :q";
            $params[':q'] = '%' . $q . '%';
        }

        $sql = "
            SELECT
                request_type_id,
                type_name,
                discription,
                url_link
            FROM request_type
            $whereSql
            ORDER BY request_type_id ASC
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $this->pdo->prepare($sql);

        // bind search param
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v, PDO::PARAM_STR);
        }

        // bind pagination params (ต้อง bindValue แบบ INT)
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);

        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * นับจำนวนรายการทั้งหมด (ใช้ทำ pagination)
     */
    public function count(string $q = ''): int
    {
        $params = [];
        $whereSql = '';

        if (trim($q) !== '') {
            $whereSql = "WHERE type_name LIKE :q OR discription LIKE :q OR url_link LIKE :q";
            $params[':q'] = '%' . $q . '%';
        }

        $sql = "SELECT COUNT(*) AS cnt FROM request_type $whereSql";
        $stmt = $this->pdo->prepare($sql);

        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v, PDO::PARAM_STR);
        }

        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return (int)($row['cnt'] ?? 0);
    }

    /**
     * ดึงรายการเดียว
     */
    public function findById(int $id): ?array
    {
        $sql = "
            SELECT
                request_type_id,
                type_name,
                discription,
                url_link
            FROM request_type
            WHERE request_type_id = :id
            LIMIT 1
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':id' => $id]);

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * สร้างรายการใหม่
     * ต้องมีอย่างน้อย type_name
     */
    public function create(array $data): int
    {
        $sql = "
            INSERT INTO request_type (type_name, discription, url_link)
            VALUES (:type_name, :discription, :url_link)
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':type_name'   => (string)($data['type_name'] ?? ''),
            ':discription' => $data['discription'] ?? null,
            ':url_link'    => $data['url_link'] ?? null,
        ]);

        return (int)$this->pdo->lastInsertId();
    }

    /**
     * แก้ไขรายการ
     */
    public function update(int $id, array $data): bool
    {
        $sql = "
            UPDATE request_type
            SET
                type_name = :type_name,
                discription = :discription,
                url_link = :url_link
            WHERE request_type_id = :id
            LIMIT 1
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':type_name'   => (string)($data['type_name'] ?? ''),
            ':discription' => $data['discription'] ?? null,
            ':url_link'    => $data['url_link'] ?? null,
            ':id'          => $id,
        ]);

        return $stmt->rowCount() > 0;
    }

    /**
     * ลบรายการ
     */
    public function delete(int $id): bool
    {
        $sql = "DELETE FROM request_type WHERE request_type_id = :id LIMIT 1";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':id' => $id]);

        return $stmt->rowCount() > 0;
    }
}

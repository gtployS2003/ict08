<?php
// backend/models/RequestSubTypeModel.php
declare(strict_types=1);

class RequestSubTypeModel
{
    /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * List request sub types
     *
     * @param string $q search text (name/discription)
     * @param int $subtypeOf request_type_id (filter by parent) ; 0 = no filter
     * @param int $page
     * @param int $limit
     */
public function list(string $q = '', int $subtypeOf = 0, int $page = 1, int $limit = 50): array
{
    $page = max(1, $page);
    $limit = max(1, min(200, $limit));
    $offset = ($page - 1) * $limit;

    [$whereSql, $params] = $this->buildWhere($q, $subtypeOf);

    $sql = "
        SELECT
            rst.request_sub_type_id,
            rst.name,
            rst.discription,
            rst.subtype_of,
            rt.type_name AS request_type_name
        FROM request_sub_type rst
        LEFT JOIN request_type rt
            ON rt.request_type_id = rst.subtype_of
        {$whereSql}
        ORDER BY rst.request_sub_type_id ASC
        LIMIT :limit OFFSET :offset
    ";

    $stmt = $this->pdo->prepare($sql);

    foreach ($params as $k => $v) {
        $stmt->bindValue($k, $v, is_int($v) ? PDO::PARAM_INT : PDO::PARAM_STR);
    }

    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);

    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
}


public function count(string $q = '', int $subtypeOf = 0): int
{
    [$whereSql, $params] = $this->buildWhere($q, $subtypeOf);

    $sql = "
        SELECT COUNT(*) AS c
        FROM request_sub_type rst
        {$whereSql}
    ";

    $stmt = $this->pdo->prepare($sql);

    foreach ($params as $k => $v) {
        $stmt->bindValue($k, $v, is_int($v) ? PDO::PARAM_INT : PDO::PARAM_STR);
    }

    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return (int)($row['c'] ?? 0);
}


    public function findById(int $id): ?array
    {
        $sql = "
            SELECT
                request_sub_type_id,
                name,
                discription,
                subtype_of
            FROM request_sub_type
            WHERE request_sub_type_id = :id
            LIMIT 1
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':id' => $id]);

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * Create
     * @return int inserted id
     */
    public function create(array $data): int
    {
        $sql = "
            INSERT INTO request_sub_type
            (name, discription, subtype_of)
            VALUES
            (:name, :discription, :subtype_of)
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':name' => (string)($data['name'] ?? ''),
            ':discription' => (string)($data['discription'] ?? ''),
            ':subtype_of' => (int)($data['subtype_of'] ?? 0),
        ]);

        return (int)$this->pdo->lastInsertId();
    }

    public function update(int $id, array $data): bool
    {
        $sql = "
            UPDATE request_sub_type
            SET
                name = :name,
                discription = :discription,
                subtype_of = :subtype_of
            WHERE request_sub_type_id = :id
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':name' => (string)($data['name'] ?? ''),
            ':discription' => (string)($data['discription'] ?? ''),
            ':subtype_of' => (int)($data['subtype_of'] ?? 0),
            ':id' => $id,
        ]);

        return $stmt->rowCount() > 0;
    }

    public function delete(int $id): bool
    {
        $sql = "DELETE FROM request_sub_type WHERE request_sub_type_id = :id";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':id' => $id]);

        return $stmt->rowCount() > 0;
    }

    /**
     * Build WHERE clause for q + subtype_of
     * @return array{0:string,1:array}
     */
private function buildWhere(string $q, int $subtypeOf): array
{
    $conds = [];
    $params = [];

    $q = trim($q);
    if ($q !== '') {
        $conds[] = "(rst.name LIKE :q1 OR rst.discription LIKE :q2)";
        $params[':q1'] = '%' . $q . '%';
        $params[':q2'] = '%' . $q . '%';
    }

    if ($subtypeOf > 0) {
        $conds[] = "rst.subtype_of = :subtype_of";
        $params[':subtype_of'] = $subtypeOf;
    }

    if (!empty($conds)) {
        return ['WHERE ' . implode(' AND ', $conds), $params];
    }

    return ['', $params];
}

}

<?php
// backend/models/EventStatusModel.php
declare(strict_types=1);

class EventStatusModel
{
    public function __construct(private PDO $pdo)
    {
    }

    public function list(string $q = '', int $requestTypeId = 0, int $page = 1, int $limit = 50): array
    {
        $page = max(1, $page);
        $limit = max(1, min(200, $limit));
        $offset = ($page - 1) * $limit;

        $where = [];
        $params = [];

        if ($requestTypeId > 0) {
            $where[] = "es.request_type_id = :request_type_id";
            $params[':request_type_id'] = $requestTypeId;
        }

        if ($q !== '') {
            $where[] = "(es.status_code LIKE :q1 OR es.status_name LIKE :q2 OR es.meaning LIKE :q3 OR rt.type_name LIKE :q4)";
            $like = "%{$q}%";
            $params[':q1'] = $like;
            $params[':q2'] = $like;
            $params[':q3'] = $like;
            $params[':q4'] = $like;
        }

        $whereSql = $where ? ("WHERE " . implode(" AND ", $where)) : "";

        $sql = "
            SELECT
                es.event_status_id,
                es.status_code,
                es.status_name,
                es.meaning,
                es.request_type_id,
                es.sort_order,
                rt.type_name
            FROM event_status es
            LEFT JOIN request_type rt ON rt.request_type_id = es.request_type_id
            {$whereSql}
            ORDER BY es.request_type_id ASC, es.sort_order ASC, es.event_status_id ASC
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $this->pdo->prepare($sql);

        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);

        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function count(string $q = '', int $requestTypeId = 0): int
    {
        $where = [];
        $params = [];

        if ($requestTypeId > 0) {
            $where[] = "es.request_type_id = :request_type_id";
            $params[':request_type_id'] = $requestTypeId;
        }

        if ($q !== '') {
            $where[] = "(es.status_code LIKE :q1 OR es.status_name LIKE :q2 OR es.meaning LIKE :q3 OR rt.type_name LIKE :q4)";
            $like = "%{$q}%";
            $params[':q1'] = $like;
            $params[':q2'] = $like;
            $params[':q3'] = $like;
            $params[':q4'] = $like;
        }

        $whereSql = $where ? ("WHERE " . implode(" AND ", $where)) : "";

        $sql = "
            SELECT COUNT(*) AS c
            FROM event_status es
            LEFT JOIN request_type rt ON rt.request_type_id = es.request_type_id
            {$whereSql}
        ";

        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->execute();

        return (int)($stmt->fetch(PDO::FETCH_ASSOC)['c'] ?? 0);
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare("
            SELECT es.*, rt.type_name
            FROM event_status es
            LEFT JOIN request_type rt ON rt.request_type_id = es.request_type_id
            WHERE es.event_status_id = :id
            LIMIT 1
        ");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function create(array $data): int
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO event_status (status_code, status_name, meaning, request_type_id, sort_order)
            VALUES (:status_code, :status_name, :meaning, :request_type_id, :sort_order)
        ");
        $stmt->execute([
            ':status_code' => $data['status_code'],
            ':status_name' => $data['status_name'],
            ':meaning' => $data['meaning'],
            ':request_type_id' => (int)$data['request_type_id'],
            ':sort_order' => (int)$data['sort_order'],
        ]);

        return (int)$this->pdo->lastInsertId();
    }

    public function update(int $id, array $data): bool
    {
        $stmt = $this->pdo->prepare("
            UPDATE event_status
            SET status_code = :status_code,
                status_name = :status_name,
                meaning = :meaning,
                request_type_id = :request_type_id,
                sort_order = :sort_order
            WHERE event_status_id = :id
        ");

        return $stmt->execute([
            ':id' => $id,
            ':status_code' => $data['status_code'],
            ':status_name' => $data['status_name'],
            ':meaning' => $data['meaning'],
            ':request_type_id' => (int)$data['request_type_id'],
            ':sort_order' => (int)$data['sort_order'],
        ]);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare("DELETE FROM event_status WHERE event_status_id = :id");
        return $stmt->execute([':id' => $id]);
    }
}

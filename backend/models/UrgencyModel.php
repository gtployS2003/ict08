<?php
// backend/models/UrgencyModel.php
declare(strict_types=1);

final class UrgencyModel
{
    public function __construct(private PDO $pdo)
    {
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function list(string $q = '', int $page = 1, int $limit = 200): array
    {
        $page = max(1, $page);
        $limit = max(1, min(200, $limit));
        $offset = ($page - 1) * $limit;

        $q = trim($q);
        $where = '';
        $params = [];
        if ($q !== '') {
            $where = 'WHERE urgency_code LIKE :q1 OR urgency_title LIKE :q2';
            $like = '%' . $q . '%';
            $params[':q1'] = $like;
            $params[':q2'] = $like;
        }

        $sql = "
            SELECT
                urgency_id,
                urgency_code,
                urgency_title,
                urgency_level
            FROM urgency
            {$where}
            ORDER BY urgency_level ASC, urgency_id ASC
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v, PDO::PARAM_STR);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function count(string $q = ''): int
    {
        $q = trim($q);
        $where = '';
        $params = [];
        if ($q !== '') {
            $where = 'WHERE urgency_code LIKE :q1 OR urgency_title LIKE :q2';
            $like = '%' . $q . '%';
            $params[':q1'] = $like;
            $params[':q2'] = $like;
        }

        $sql = "SELECT COUNT(*) AS c FROM urgency {$where}";
        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v, PDO::PARAM_STR);
        }
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return (int)($row['c'] ?? 0);
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT urgency_id, urgency_code, urgency_title, urgency_level FROM urgency WHERE urgency_id = :id LIMIT 1');
        $stmt->execute([':id' => max(1, $id)]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function existsByCode(string $code, ?int $excludeId = null): bool
    {
        $code = trim($code);
        if ($code === '') return false;

        $sql = 'SELECT 1 FROM urgency WHERE urgency_code = :code';
        $params = [':code' => $code];

        if ($excludeId !== null && $excludeId > 0) {
            $sql .= ' AND urgency_id <> :exclude';
            $params[':exclude'] = $excludeId;
        }
        $sql .= ' LIMIT 1';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return (bool)$stmt->fetchColumn();
    }

    public function create(array $data): int
    {
        $code = trim((string)($data['urgency_code'] ?? ''));
        $title = trim((string)($data['urgency_title'] ?? ''));
        $level = (int)($data['urgency_level'] ?? 0);

        $stmt = $this->pdo->prepare('INSERT INTO urgency (urgency_code, urgency_title, urgency_level) VALUES (:code, :title, :lvl)');
        $stmt->execute([
            ':code' => $code,
            ':title' => $title,
            ':lvl' => $level,
        ]);

        return (int)$this->pdo->lastInsertId();
    }

    public function update(int $id, array $data): bool
    {
        $id = max(1, $id);
        $code = trim((string)($data['urgency_code'] ?? ''));
        $title = trim((string)($data['urgency_title'] ?? ''));
        $level = (int)($data['urgency_level'] ?? 0);

        $stmt = $this->pdo->prepare('UPDATE urgency SET urgency_code = :code, urgency_title = :title, urgency_level = :lvl WHERE urgency_id = :id');
        $stmt->execute([
            ':code' => $code,
            ':title' => $title,
            ':lvl' => $level,
            ':id' => $id,
        ]);

        return $stmt->rowCount() >= 0; // PDO may return 0 even if values unchanged
    }

    public function delete(int $id): bool
    {
        $id = max(1, $id);
        $stmt = $this->pdo->prepare('DELETE FROM urgency WHERE urgency_id = :id');
        $stmt->execute([':id' => $id]);
        return $stmt->rowCount() > 0;
    }
}

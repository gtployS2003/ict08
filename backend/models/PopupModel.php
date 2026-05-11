<?php
// backend/models/PopupModel.php
declare(strict_types=1);

final class PopupModel
{
    /** @var PDO */
    private $pdo;

    /** @var string */
    private $table = '`popup`';

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * @return array<int, array<string,mixed>>
     */
    public function list(string $q = '', int $page = 1, int $limit = 50): array
    {
        $page = max(1, $page);
        $limit = max(1, min(200, $limit));
        $offset = ($page - 1) * $limit;

        $q = trim($q);
        $where = [];
        $params = [];

        if ($q !== '') {
            $like = '%' . $q . '%';
            $where[] = "(p.title LIKE :q1 OR p.description LIKE :q2 OR p.url_link LIKE :q3 OR CAST(p.popup_id AS CHAR) LIKE :q4)";
            $params[':q1'] = $like;
            $params[':q2'] = $like;
            $params[':q3'] = $like;
            $params[':q4'] = $like;
        }

        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $sql = "
            SELECT
                p.popup_id,
                p.title,
                p.description,
                p.image_path,
                p.url_link,
                p.is_active
            FROM {$this->table} p
            {$whereSql}
            ORDER BY p.popup_id DESC
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
        $where = [];
        $params = [];

        if ($q !== '') {
            $like = '%' . $q . '%';
            $where[] = "(p.title LIKE :q1 OR p.description LIKE :q2 OR p.url_link LIKE :q3 OR CAST(p.popup_id AS CHAR) LIKE :q4)";
            $params[':q1'] = $like;
            $params[':q2'] = $like;
            $params[':q3'] = $like;
            $params[':q4'] = $like;
        }

        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';
        $stmt = $this->pdo->prepare("SELECT COUNT(*) AS cnt FROM {$this->table} p {$whereSql}");
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v, PDO::PARAM_STR);
        }
        $stmt->execute();

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return (int)($row['cnt'] ?? 0);
    }

    /**
     * @return array<string,mixed>|null
     */
    public function find(int $id): ?array
    {
        $stmt = $this->pdo->prepare("
            SELECT popup_id, title, description, image_path, url_link, is_active
            FROM {$this->table}
            WHERE popup_id = :id
            LIMIT 1
        ");
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row !== false ? $row : null;
    }

    /**
     * @return array<int, array<string,mixed>>
     */
    public function listPublic(int $limit = 20): array
    {
        $limit = max(1, min(50, $limit));

        $stmt = $this->pdo->prepare("
            SELECT popup_id, title, description, image_path, url_link, is_active
            FROM {$this->table}
            WHERE image_path <> ''
              AND is_active = 1
            ORDER BY popup_id DESC
            LIMIT :limit
        ");
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * @param array<string,mixed> $data
     */
    public function create(array $data): int
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO {$this->table} (title, description, image_path, url_link, is_active)
            VALUES (:title, :description, :image_path, :url_link, :is_active)
        ");
        $stmt->bindValue(':title', trim((string)($data['title'] ?? '')), PDO::PARAM_STR);
        $stmt->bindValue(':description', (string)($data['description'] ?? ''), PDO::PARAM_STR);
        $stmt->bindValue(':image_path', trim((string)($data['image_path'] ?? '')), PDO::PARAM_STR);
        $stmt->bindValue(':url_link', trim((string)($data['url_link'] ?? '')), PDO::PARAM_STR);
        $stmt->bindValue(':is_active', (int)($data['is_active'] ?? 1) ? 1 : 0, PDO::PARAM_INT);
        $stmt->execute();

        return (int)$this->pdo->lastInsertId();
    }

    /**
     * @param array<string,mixed> $data
     */
    public function update(int $id, array $data): bool
    {
        $stmt = $this->pdo->prepare("
            UPDATE {$this->table}
            SET
                title = :title,
                description = :description,
                image_path = :image_path,
                url_link = :url_link,
                is_active = :is_active
            WHERE popup_id = :id
            LIMIT 1
        ");
        $stmt->bindValue(':title', trim((string)($data['title'] ?? '')), PDO::PARAM_STR);
        $stmt->bindValue(':description', (string)($data['description'] ?? ''), PDO::PARAM_STR);
        $stmt->bindValue(':image_path', trim((string)($data['image_path'] ?? '')), PDO::PARAM_STR);
        $stmt->bindValue(':url_link', trim((string)($data['url_link'] ?? '')), PDO::PARAM_STR);
        $stmt->bindValue(':is_active', (int)($data['is_active'] ?? 1) ? 1 : 0, PDO::PARAM_INT);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }

    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare("DELETE FROM {$this->table} WHERE popup_id = :id LIMIT 1");
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }
}

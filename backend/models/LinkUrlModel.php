<?php
// backend/models/LinkUrlModel.php
declare(strict_types=1);

final class LinkUrlModel
{
    /** @var string */
    private $table = '`link_url`';

    /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * @return array<int, array<string,mixed>>
     */
    public function list(string $q = '', int $page = 1, int $limit = 50, ?int $isBanner = null): array
    {
        $page = max(1, $page);
        $limit = max(1, min(200, $limit));
        $offset = ($page - 1) * $limit;

        $q = trim($q);
        $where = [];
        $params = [];

        if ($q !== '') {
            $like = '%' . $q . '%';
            $where[] = "(l.title LIKE :q1 OR l.content LIKE :q2 OR l.link_url LIKE :q3 OR CAST(l.url_id AS CHAR) LIKE :q4)";
            $params[':q1'] = $like;
            $params[':q2'] = $like;
            $params[':q3'] = $like;
            $params[':q4'] = $like;
        }

        if ($isBanner !== null) {
            $where[] = 'l.is_banner = :is_banner';
            $params[':is_banner'] = $isBanner;
        }

        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $sql = "
            SELECT
                l.url_id,
                l.title,
                l.content,
                l.link_url,
                l.is_banner,
                l.writer,
                l.create_at
            FROM {$this->table} l
            {$whereSql}
            ORDER BY l.url_id ASC
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v, is_int($v) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        /** @var array<int, array<string,mixed>> */
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function count(string $q = '', ?int $isBanner = null): int
    {
        $q = trim($q);
        $where = [];
        $params = [];

        if ($q !== '') {
            $like = '%' . $q . '%';
            $where[] = "(l.title LIKE :q1 OR l.content LIKE :q2 OR l.link_url LIKE :q3 OR CAST(l.url_id AS CHAR) LIKE :q4)";
            $params[':q1'] = $like;
            $params[':q2'] = $like;
            $params[':q3'] = $like;
            $params[':q4'] = $like;
        }

        if ($isBanner !== null) {
            $where[] = 'l.is_banner = :is_banner';
            $params[':is_banner'] = $isBanner;
        }

        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $sql = "SELECT COUNT(*) AS cnt FROM {$this->table} l {$whereSql}";
        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v, is_int($v) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return (int) ($row['cnt'] ?? 0);
    }

    /**
     * @return array<string,mixed>|null
     */
    public function find(int $id): ?array
    {
        $sql = "
            SELECT
                l.url_id,
                l.title,
                l.content,
                l.link_url,
                l.is_banner,
                l.writer,
                l.create_at
            FROM {$this->table} l
            WHERE l.url_id = :id
            LIMIT 1
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row !== false ? $row : null;
    }

    /**
     * @param array<string,mixed> $data
     */
    public function create(array $data, int $writerId = 0): int
    {
        $title = trim((string) ($data['title'] ?? ''));
        $content = (string) ($data['content'] ?? '');
        $linkUrl = trim((string) ($data['link_url'] ?? ''));
        $isBanner = (int) ($data['is_banner'] ?? 0);

        $sql = "
            INSERT INTO {$this->table} (
                title,
                content,
                link_url,
                is_banner,
                writer,
                create_at
            ) VALUES (
                :title,
                :content,
                :link_url,
                :is_banner,
                :writer,
                NOW()
            )
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':title', $title, PDO::PARAM_STR);
        $stmt->bindValue(':content', $content, PDO::PARAM_STR);
        $stmt->bindValue(':link_url', $linkUrl, PDO::PARAM_STR);
        $stmt->bindValue(':is_banner', $isBanner, PDO::PARAM_INT);
        $stmt->bindValue(':writer', $writerId, PDO::PARAM_INT);
        $stmt->execute();

        return (int) $this->pdo->lastInsertId();
    }

    /**
     * @param array<string,mixed> $data
     */
    public function update(int $id, array $data, int $writerId = 0): bool
    {
        $title = trim((string) ($data['title'] ?? ''));
        $content = (string) ($data['content'] ?? '');
        $linkUrl = trim((string) ($data['link_url'] ?? ''));
        $isBanner = (int) ($data['is_banner'] ?? 0);

        $sql = "
            UPDATE {$this->table}
            SET
                title = :title,
                content = :content,
                link_url = :link_url,
                is_banner = :is_banner,
                writer = :writer
            WHERE url_id = :id
            LIMIT 1
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':title', $title, PDO::PARAM_STR);
        $stmt->bindValue(':content', $content, PDO::PARAM_STR);
        $stmt->bindValue(':link_url', $linkUrl, PDO::PARAM_STR);
        $stmt->bindValue(':is_banner', $isBanner, PDO::PARAM_INT);
        $stmt->bindValue(':writer', $writerId, PDO::PARAM_INT);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }

    public function delete(int $id): bool
    {
        $sql = "DELETE FROM {$this->table} WHERE url_id = :id LIMIT 1";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->rowCount() > 0;
    }
}

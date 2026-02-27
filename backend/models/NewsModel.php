<?php
// backend/models/NewsModel.php
declare(strict_types=1);

class NewsModel {
    /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    private ?bool $supportsUpdateAt = null;

    private function tableHasColumn(string $table, string $column): bool
    {
        // Use INFORMATION_SCHEMA instead of SHOW COLUMNS because some MariaDB/PDO setups
        // fail to prepare SHOW statements with placeholders (error near '?').
        $sql = "
            SELECT 1
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = :table_name
              AND COLUMN_NAME = :column_name
            LIMIT 1
        ";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':table_name' => $table,
            ':column_name' => $column,
        ]);
        return (bool)($stmt->fetchColumn() ?: null);
    }

    public function supportsUpdateAt(): bool
    {
        if ($this->supportsUpdateAt !== null) return $this->supportsUpdateAt;
        $this->supportsUpdateAt = $this->tableHasColumn('news', 'update_at');
        return $this->supportsUpdateAt;
    }

    public function list(int $limit = 20): array {
        $cols = "n.news_id, n.title, n.content, n.link_url, n.is_banner, n.writer, n.create_at";
        if ($this->supportsUpdateAt()) {
            $cols .= ", n.update_at";
        }

        // writer name (for public pages)
        $cols .= ", COALESCE(NULLIF(p.display_name, ''), NULLIF(u.line_user_name, ''), CONCAT('user#', n.writer)) AS writer_name";

        $sql = "SELECT {$cols}
                FROM news n
                LEFT JOIN `user` u ON u.user_id = n.writer
                LEFT JOIN person p ON p.person_user_id = u.user_id
                ORDER BY n.create_at ASC, n.news_id ASC
                LIMIT :lim";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function get(int $id): ?array {
        $cols = "n.news_id, n.title, n.content, n.link_url, n.is_banner, n.writer, n.create_at";
        if ($this->supportsUpdateAt()) {
            $cols .= ", n.update_at";
        }
        $cols .= ", COALESCE(NULLIF(p.display_name, ''), NULLIF(u.line_user_name, ''), CONCAT('user#', n.writer)) AS writer_name";

        $sql = "SELECT {$cols}
                FROM news n
                LEFT JOIN `user` u ON u.user_id = n.writer
                LEFT JOIN person p ON p.person_user_id = u.user_id
                WHERE n.news_id = :id
                LIMIT 1";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function create(array $data): int {
        $createAt = $data['create_at'] ?? date('Y-m-d H:i:s');

        $cols = ['title', 'content', 'link_url', 'is_banner', 'writer', 'create_at'];
        $vals = [':title', ':content', ':link_url', ':is_banner', ':writer', ':create_at'];

        // Optional update_at (if schema has it)
        if ($this->supportsUpdateAt()) {
            $cols[] = 'update_at';
            $vals[] = ':update_at';
        }

        $sql = "INSERT INTO news (" . implode(', ', $cols) . ")\n                VALUES (" . implode(', ', $vals) . ")";
        $stmt = $this->pdo->prepare($sql);

        $params = [
            'title' => $data['title'],
            'content' => $data['content'],
            'link_url' => $data['link_url'] ?? null,
            'is_banner' => isset($data['is_banner']) ? (int)$data['is_banner'] : 0,
            'writer' => $data['writer'] ?? null,
            'create_at' => $createAt,
        ];

        if ($this->supportsUpdateAt()) {
            $params['update_at'] = $data['update_at'] ?? $createAt;
        }

        $stmt->execute($params);
        return (int)$this->pdo->lastInsertId();
    }

    public function update(int $id, array $data): bool {
        $set = [
            'title = :title',
            'content = :content',
            'link_url = :link_url',
            'is_banner = :is_banner',
        ];

        $params = [
            'id' => $id,
            'title' => $data['title'],
            'content' => $data['content'],
            'link_url' => $data['link_url'] ?? null,
            'is_banner' => isset($data['is_banner']) ? (int)$data['is_banner'] : 0,
        ];

        if ($this->supportsUpdateAt() && array_key_exists('update_at', $data)) {
            $set[] = 'update_at = :update_at';
            $params['update_at'] = $data['update_at'];
        }

        $sql = "UPDATE news\n                SET " . implode(",\n                    ", $set) . "\n                WHERE news_id = :id";
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute($params);
    }

    public function delete(int $id): bool {
        $stmt = $this->pdo->prepare("DELETE FROM news WHERE news_id = :id");
        return $stmt->execute(['id' => $id]);
    }
}

<?php
// backend/models/NewsModel.php
declare(strict_types=1);

class NewsModel {
    public function __construct(private PDO $pdo) {}

    public function list(int $limit = 20): array {
        $sql = "SELECT news_id, title, content, link_url, is_banner, writer, create_at
                FROM news
                ORDER BY create_at ASC
                LIMIT :lim";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function get(int $id): ?array {
        $sql = "SELECT news_id, title, content, link_url, is_banner, writer, create_at
                FROM news WHERE news_id = :id LIMIT 1";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function create(array $data): int {
        $sql = "INSERT INTO news (title, content, link_url, is_banner, writer, create_at)
                VALUES (:title, :content, :link_url, :is_banner, :writer, :create_at)";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            'title' => $data['title'],
            'content' => $data['content'],
            'link_url' => $data['link_url'] ?? null,
            'is_banner' => isset($data['is_banner']) ? (int)$data['is_banner'] : 0,
            'writer' => $data['writer'] ?? null,
            'create_at' => $data['create_at'] ?? date('Y-m-d H:i:s'),
        ]);
        return (int)$this->pdo->lastInsertId();
    }

    public function update(int $id, array $data): bool {
        $sql = "UPDATE news
                SET title = :title,
                    content = :content,
                    link_url = :link_url,
                    is_banner = :is_banner
                WHERE news_id = :id";
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute([
            'id' => $id,
            'title' => $data['title'],
            'content' => $data['content'],
            'link_url' => $data['link_url'] ?? null,
            'is_banner' => isset($data['is_banner']) ? (int)$data['is_banner'] : 0,
        ]);
    }

    public function delete(int $id): bool {
        $stmt = $this->pdo->prepare("DELETE FROM news WHERE news_id = :id");
        return $stmt->execute(['id' => $id]);
    }
}

<?php
// backend/models/ChannelModel.php
declare(strict_types=1);

final class ChannelModel
{
    public function __construct(private PDO $pdo)
    {
    }

    /**
     * List channels with search + pagination
     * @return array<int, array<string,mixed>>
     */
    public function list(string $q = '', int $page = 1, int $limit = 50): array
    {
        $page = max(1, $page);
        $limit = max(1, min(200, $limit));
        $offset = ($page - 1) * $limit;

        $q = trim($q);

        $where = '';
        $params = [];

        if ($q !== '') {
            $where = "WHERE (c.channel LIKE :q)";
            $params[':q'] = '%' . $q . '%';
        }

        $sql = "
            SELECT
                c.channel_id,
                c.channel
            FROM channel c
            $where
            ORDER BY c.channel_id ASC
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

    /**
     * Count channels for pagination
     */
    public function count(string $q = ''): int
    {
        $q = trim($q);

        $where = '';
        $params = [];

        if ($q !== '') {
            $where = "WHERE (c.channel LIKE :q)";
            $params[':q'] = '%' . $q . '%';
        }

        $sql = "SELECT COUNT(*) AS cnt FROM channel c $where";
        $stmt = $this->pdo->prepare($sql);

        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v, PDO::PARAM_STR);
        }

        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return (int)($row['cnt'] ?? 0);
    }

    /**
     * Get single channel by id
     */
    public function getById(int $id): ?array
    {
        $stmt = $this->pdo->prepare("
            SELECT c.channel_id, c.channel
            FROM channel c
            WHERE c.channel_id = :id
            LIMIT 1
        ");
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * (Optional) Create channel
     */
    public function create(string $channel): int
    {
        $channel = trim($channel);
        if ($channel === '') {
            throw new InvalidArgumentException('channel is required');
        }

        $stmt = $this->pdo->prepare("
            INSERT INTO channel (channel)
            VALUES (:channel)
        ");
        $stmt->bindValue(':channel', $channel, PDO::PARAM_STR);
        $stmt->execute();

        return (int)$this->pdo->lastInsertId();
    }

    /**
     * (Optional) Update channel
     */
    public function update(int $id, string $channel): bool
    {
        $channel = trim($channel);
        if ($id <= 0) {
            throw new InvalidArgumentException('id is invalid');
        }
        if ($channel === '') {
            throw new InvalidArgumentException('channel is required');
        }

        $stmt = $this->pdo->prepare("
            UPDATE channel
            SET channel = :channel
            WHERE channel_id = :id
        ");
        $stmt->bindValue(':channel', $channel, PDO::PARAM_STR);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);

        $stmt->execute();
        return $stmt->rowCount() > 0;
    }

    /**
     * (Optional) Delete channel
     */
    public function delete(int $id): bool
    {
        if ($id <= 0) {
            throw new InvalidArgumentException('id is invalid');
        }

        $stmt = $this->pdo->prepare("DELETE FROM channel WHERE channel_id = :id");
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }
}

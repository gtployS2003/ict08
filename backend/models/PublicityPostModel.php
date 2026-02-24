<?php
// backend/models/PublicityPostModel.php
declare(strict_types=1);

final class PublicityPostModel
{
    public function __construct(private PDO $pdo) {}

    /**
     * @return array<int,array<string,mixed>>
     */
    public function list(string $q = '', int $page = 1, int $limit = 200): array
    {
        $q = trim($q);
        $page = max(1, $page);
        $limit = max(1, min(500, $limit));
        $offset = ($page - 1) * $limit;

        $where = '';
        $params = [
            ':limit' => $limit,
            ':offset' => $offset,
        ];

        if ($q !== '') {
            $where = 'WHERE (
                CAST(pp.event_id AS CHAR) LIKE :q
                OR pp.title LIKE :q
                OR pp.content LIKE :q
            )';
            $params[':q'] = '%' . $q . '%';
        }

        $sql = "
            SELECT
                pp.publicity_post_id,
                pp.event_id,
                pp.title,
                pp.content,
                pp.is_banner,
                pp.create_by,
                pp.create_at,
                pp.update_at
            FROM publicity_post pp
            {$where}
            ORDER BY pp.update_at DESC, pp.publicity_post_id DESC
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $k => $v) {
            if ($k === ':limit' || $k === ':offset') {
                $stmt->bindValue($k, (int)$v, PDO::PARAM_INT);
            } else {
                $stmt->bindValue($k, (string)$v, PDO::PARAM_STR);
            }
        }
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function count(string $q = ''): int
    {
        $q = trim($q);
        $where = '';
        $params = [];

        if ($q !== '') {
            $where = 'WHERE (
                CAST(pp.event_id AS CHAR) LIKE :q
                OR pp.title LIKE :q
                OR pp.content LIKE :q
            )';
            $params[':q'] = '%' . $q . '%';
        }

        $sql = "SELECT COUNT(*) AS c FROM publicity_post pp {$where}";
        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, (string)$v, PDO::PARAM_STR);
        }
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
        return (int)($row['c'] ?? 0);
    }

    public function findByEventId(int $eventId): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM publicity_post WHERE event_id = :eid LIMIT 1');
        $stmt->execute([':eid' => $eventId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function createFromEvent(int $eventId, int $createBy = 0): array
    {
        $existing = $this->findByEventId($eventId);
        if ($existing) {
            throw new RuntimeException('PUBLICITY_POST_ALREADY_EXISTS');
        }

        $stmtEv = $this->pdo->prepare('SELECT event_id, title, detail FROM event WHERE event_id = :eid LIMIT 1');
        $stmtEv->execute([':eid' => $eventId]);
        $ev = $stmtEv->fetch(PDO::FETCH_ASSOC) ?: null;
        if (!$ev) {
            throw new RuntimeException('EVENT_NOT_FOUND');
        }

        $title = (string)($ev['title'] ?? '');
        if ($title === '') $title = 'กิจกรรม #' . $eventId;
        $content = (string)($ev['detail'] ?? '');

        $ins = $this->pdo->prepare('
            INSERT INTO publicity_post
                (event_id, title, content, is_banner, create_by, create_at, update_at)
            VALUES
                (:event_id, :title, :content, 0, :create_by, NOW(), NOW())
        ');
        $ins->execute([
            ':event_id' => $eventId,
            ':title' => mb_substr($title, 0, 255),
            ':content' => $content,
            ':create_by' => $createBy,
        ]);

        $row = $this->findByEventId($eventId);
        if (!$row) {
            throw new RuntimeException('CREATE_FAILED');
        }
        return $row;
    }

    public function updateByEventId(int $eventId, array $fields): array
    {
        $allowed = ['title', 'content', 'is_banner'];
        $set = [];
        $params = [':eid' => $eventId];

        foreach ($allowed as $k) {
            if (!array_key_exists($k, $fields)) continue;

            if ($k === 'is_banner') {
                $set[] = 'is_banner = :is_banner';
                $params[':is_banner'] = (int)$fields['is_banner'] ? 1 : 0;
                continue;
            }

            if ($k === 'title') {
                $set[] = 'title = :title';
                $params[':title'] = mb_substr((string)$fields['title'], 0, 255);
                continue;
            }

            if ($k === 'content') {
                $set[] = 'content = :content';
                $params[':content'] = (string)$fields['content'];
                continue;
            }
        }

        if (!$set) {
            $row = $this->findByEventId($eventId);
            if (!$row) throw new RuntimeException('PUBLICITY_POST_NOT_FOUND');
            return $row;
        }

        $set[] = 'update_at = NOW()';

        $sql = 'UPDATE publicity_post SET ' . implode(', ', $set) . ' WHERE event_id = :eid';
        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $k => $v) {
            if ($k === ':is_banner' || $k === ':eid') {
                $stmt->bindValue($k, (int)$v, PDO::PARAM_INT);
            } else {
                $stmt->bindValue($k, (string)$v, PDO::PARAM_STR);
            }
        }
        $stmt->execute();

        $row = $this->findByEventId($eventId);
        if (!$row) throw new RuntimeException('PUBLICITY_POST_NOT_FOUND');
        return $row;
    }
}

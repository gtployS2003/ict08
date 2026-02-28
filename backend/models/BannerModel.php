<?php
// backend/models/BannerModel.php
declare(strict_types=1);

final class BannerModel
{
    /** @var PDO */
    private $pdo;

    /** @var string */
    private $table = 'banner';

    /** @var string|null */
    private static $activityPostIdColumn = null;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Detect the actual publicity_post id column name in `activity`.
     * Some databases have a historical typo column name: `publicuty_post_id`.
     */
    private function activityPublicityPostIdColumn(): string
    {
        if (self::$activityPostIdColumn) return self::$activityPostIdColumn;

        $stmt = $this->pdo->prepare(
            "SELECT COLUMN_NAME
             FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'activity'
               AND COLUMN_NAME IN ('publicity_post_id', 'publicuty_post_id')
             ORDER BY (COLUMN_NAME = 'publicity_post_id') ASC
             LIMIT 1"
        );
        $stmt->execute();
        $col = (string)($stmt->fetchColumn() ?: '');
        $col = $col === 'publicity_post_id' || $col === 'publicuty_post_id' ? $col : 'publicity_post_id';

        self::$activityPostIdColumn = $col;
        return self::$activityPostIdColumn;
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
            $where[] = "(b.title LIKE :q1 OR b.discription LIKE :q2 OR CAST(b.banner_id AS CHAR) LIKE :q3)";
            $params[':q1'] = $like;
            $params[':q2'] = $like;
            $params[':q3'] = $like;
        }

        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $sql = "
            SELECT
                b.banner_id,
                b.title,
                b.discription,
                b.image_path,
                b.source_activity_id,
                b.source_news_id,
                b.source_link_url,
                b.is_active,
                b.start_at,
                b.end_at,
                b.create_by,
                b.create_at
            FROM {$this->table} b
            {$whereSql}
            ORDER BY b.banner_id ASC
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
            $where[] = "(b.title LIKE :q1 OR b.discription LIKE :q2 OR CAST(b.banner_id AS CHAR) LIKE :q3)";
            $params[':q1'] = $like;
            $params[':q2'] = $like;
            $params[':q3'] = $like;
        }

        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $sql = "SELECT COUNT(*) AS cnt FROM {$this->table} b {$whereSql}";
        $stmt = $this->pdo->prepare($sql);
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
        $sql = "
            SELECT
                b.banner_id,
                b.title,
                b.discription,
                b.image_path,
                b.source_activity_id,
                b.source_news_id,
                b.source_link_url,
                b.is_active,
                b.start_at,
                b.end_at,
                b.create_by,
                b.create_at
            FROM {$this->table} b
            WHERE b.banner_id = :id
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
        $title = trim((string)($data['title'] ?? ''));
        $discription = (string)($data['discription'] ?? '');
        $imagePath = trim((string)($data['image_path'] ?? ''));

        $sourceActivityId = $data['source_activity_id'] !== '' ? ($data['source_activity_id'] ?? null) : null;
        $sourceNewsId = $data['source_news_id'] !== '' ? ($data['source_news_id'] ?? null) : null;
        $sourceLinkUrl = trim((string)($data['source_link_url'] ?? ''));
        $sourceLinkUrl = $sourceLinkUrl === '' ? null : $sourceLinkUrl;

        $isActive = (int)($data['is_active'] ?? 1) ? 1 : 0;
        $startAt = $data['start_at'] ?? null;
        $endAt = $data['end_at'] ?? null;

        $sql = "
            INSERT INTO {$this->table} (
                title,
                discription,
                image_path,
                source_activity_id,
                source_news_id,
                source_link_url,
                is_active,
                start_at,
                end_at,
                create_by,
                create_at
            ) VALUES (
                :title,
                :discription,
                :image_path,
                :source_activity_id,
                :source_news_id,
                :source_link_url,
                :is_active,
                :start_at,
                :end_at,
                :create_by,
                NOW()
            )
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':title', $title, PDO::PARAM_STR);
        $stmt->bindValue(':discription', $discription, PDO::PARAM_STR);
        $stmt->bindValue(':image_path', $imagePath, PDO::PARAM_STR);
        $stmt->bindValue(':source_activity_id', $sourceActivityId !== null ? (int)$sourceActivityId : null, $sourceActivityId !== null ? PDO::PARAM_INT : PDO::PARAM_NULL);
        $stmt->bindValue(':source_news_id', $sourceNewsId !== null ? (int)$sourceNewsId : null, $sourceNewsId !== null ? PDO::PARAM_INT : PDO::PARAM_NULL);
        $stmt->bindValue(':source_link_url', $sourceLinkUrl, $sourceLinkUrl !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':is_active', $isActive, PDO::PARAM_INT);
        $stmt->bindValue(':start_at', $startAt !== null ? (string)$startAt : null, $startAt !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':end_at', $endAt !== null ? (string)$endAt : null, $endAt !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':create_by', $writerId, PDO::PARAM_INT);
        $stmt->execute();

        return (int)$this->pdo->lastInsertId();
    }

    /**
     * @param array<string,mixed> $data
     */
    public function update(int $id, array $data): bool
    {
        $title = trim((string)($data['title'] ?? ''));
        $discription = (string)($data['discription'] ?? '');
        $imagePath = trim((string)($data['image_path'] ?? ''));

        $sourceActivityId = $data['source_activity_id'] !== '' ? ($data['source_activity_id'] ?? null) : null;
        $sourceNewsId = $data['source_news_id'] !== '' ? ($data['source_news_id'] ?? null) : null;
        $sourceLinkUrl = trim((string)($data['source_link_url'] ?? ''));
        $sourceLinkUrl = $sourceLinkUrl === '' ? null : $sourceLinkUrl;

        $isActive = (int)($data['is_active'] ?? 1) ? 1 : 0;
        $startAt = $data['start_at'] ?? null;
        $endAt = $data['end_at'] ?? null;

        $sql = "
            UPDATE {$this->table}
            SET
                title = :title,
                discription = :discription,
                image_path = :image_path,
                source_activity_id = :source_activity_id,
                source_news_id = :source_news_id,
                source_link_url = :source_link_url,
                is_active = :is_active,
                start_at = :start_at,
                end_at = :end_at
            WHERE banner_id = :id
            LIMIT 1
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':title', $title, PDO::PARAM_STR);
        $stmt->bindValue(':discription', $discription, PDO::PARAM_STR);
        $stmt->bindValue(':image_path', $imagePath, PDO::PARAM_STR);
        $stmt->bindValue(':source_activity_id', $sourceActivityId !== null ? (int)$sourceActivityId : null, $sourceActivityId !== null ? PDO::PARAM_INT : PDO::PARAM_NULL);
        $stmt->bindValue(':source_news_id', $sourceNewsId !== null ? (int)$sourceNewsId : null, $sourceNewsId !== null ? PDO::PARAM_INT : PDO::PARAM_NULL);
        $stmt->bindValue(':source_link_url', $sourceLinkUrl, $sourceLinkUrl !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':is_active', $isActive, PDO::PARAM_INT);
        $stmt->bindValue(':start_at', $startAt !== null ? (string)$startAt : null, $startAt !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':end_at', $endAt !== null ? (string)$endAt : null, $endAt !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }

    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare("DELETE FROM {$this->table} WHERE banner_id = :id LIMIT 1");
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->rowCount() > 0;
    }

    /**
     * Public list: active and within date range.
     *
     * @return array<int, array<string,mixed>>
     */
    public function listPublic(int $limit = 20): array
    {
        $limit = max(1, min(50, $limit));

        $sql = "
            SELECT
                b.banner_id,
                b.title,
                b.discription,
                b.image_path,
                b.source_activity_id,
                b.source_news_id,
                b.source_link_url,
                b.start_at,
                b.end_at
            FROM {$this->table} b
            WHERE b.is_active = 1
                            AND (b.start_at IS NULL OR NOW() >= b.start_at)
                            AND (b.end_at IS NULL OR NOW() <= b.end_at)
                        ORDER BY COALESCE(b.start_at, '1970-01-01 00:00:00') ASC, b.banner_id ASC
            LIMIT :limit
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * @return array<int, array{activity_id:int,title:string,create_at:mixed,update_at:mixed}>
     */
    public function listActivityRefsForBanner(int $limit = 500): array
    {
        $limit = max(1, min(1000, $limit));
        $col = $this->activityPublicityPostIdColumn();

        $sql = "
            SELECT
                a.activity_id,
                COALESCE(pp.title, '') AS title,
                pp.create_at,
                pp.update_at
            FROM activity a
            INNER JOIN publicity_post pp
                ON pp.publicity_post_id = a.{$col}
            WHERE pp.is_banner = 1
            ORDER BY COALESCE(pp.update_at, pp.create_at) ASC, a.activity_id ASC
            LIMIT :limit
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        return array_map(function ($r) {
            return [
                'activity_id' => (int)($r['activity_id'] ?? 0),
                'title' => (string)($r['title'] ?? ''),
                'create_at' => $r['create_at'] ?? null,
                'update_at' => $r['update_at'] ?? null,
            ];
        }, $rows);
    }

    /**
     * @return array<int, array{news_id:int,title:string,create_at:mixed}>
     */
    public function listNewsRefsForBanner(int $limit = 500): array
    {
        $limit = max(1, min(1000, $limit));

        $sql = "
            SELECT
                n.news_id,
                COALESCE(n.title, '') AS title,
                n.create_at
            FROM news n
            WHERE n.is_banner = 1
            ORDER BY n.create_at ASC, n.news_id ASC
            LIMIT :limit
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        return array_map(function ($r) {
            return [
                'news_id' => (int)($r['news_id'] ?? 0),
                'title' => (string)($r['title'] ?? ''),
                'create_at' => $r['create_at'] ?? null,
            ];
        }, $rows);
    }
}

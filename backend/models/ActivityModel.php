<?php
// backend/models/ActivityModel.php
declare(strict_types=1);

final class ActivityModel
{
    /** @var PDO */
    private $pdo;

    /** @var string */
    private $table = 'activity';

    /** @var string|null */
    private static $activityPostIdColumn = null;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Some databases have a historical typo column name: `publicuty_post_id`.
     * Detect the actual column name once and reuse it.
     */
    private function publicityPostIdColumn(): string
    {
        if (self::$activityPostIdColumn) return self::$activityPostIdColumn;

        $stmt = $this->pdo->prepare(
            "SELECT COLUMN_NAME
             FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = :t
               AND COLUMN_NAME IN ('publicity_post_id', 'publicuty_post_id')
             ORDER BY (COLUMN_NAME = 'publicity_post_id') DESC
             LIMIT 1"
        );
        $stmt->execute([':t' => $this->table]);
        $col = (string)($stmt->fetchColumn() ?: '');
        $col = $col === 'publicity_post_id' || $col === 'publicuty_post_id' ? $col : 'publicity_post_id';

        self::$activityPostIdColumn = $col;
        return self::$activityPostIdColumn;
    }

    public function findByPublicityPostId(int $publicityPostId): ?array
    {
        $publicityPostId = max(1, (int)$publicityPostId);
        $col = $this->publicityPostIdColumn();
        $stmt = $this->pdo->prepare("SELECT activity_id, {$col} AS publicity_post_id FROM {$this->table} WHERE {$col} = :pid LIMIT 1");
        $stmt->execute([':pid' => $publicityPostId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * Publish a publicity_post to website by inserting into activity table.
     * Returns the activity row and whether it already existed.
     *
     * @return array{activity_id:int,publicity_post_id:int,already_published:bool}
     */
    public function publishByPublicityPostId(int $publicityPostId): array
    {
        $publicityPostId = max(1, (int)$publicityPostId);
        $existing = $this->findByPublicityPostId($publicityPostId);
        if ($existing) {
            return [
                'activity_id' => (int)($existing['activity_id'] ?? 0),
                'publicity_post_id' => (int)($existing['publicity_post_id'] ?? 0),
                'already_published' => true,
            ];
        }

        $col = $this->publicityPostIdColumn();
        $stmt = $this->pdo->prepare("INSERT INTO {$this->table} ({$col}) VALUES (:pid)");
        $stmt->execute([':pid' => $publicityPostId]);
        $id = (int)($this->pdo->lastInsertId() ?: 0);

        $row = $this->findByPublicityPostId($publicityPostId);
        return [
            'activity_id' => (int)($row['activity_id'] ?? $id),
            'publicity_post_id' => (int)($row['publicity_post_id'] ?? $publicityPostId),
            'already_published' => false,
        ];
    }

    public function countPublic(string $q = ''): int
    {
        $q = trim($q);
        $col = $this->publicityPostIdColumn();
        $where = [];
        $params = [];

        if ($q !== '') {
            $where[] = '(
                pp.title LIKE :q
                OR pp.content LIKE :q
                OR COALESCE(prov.nameTH, prov.nameEN) LIKE :q
                OR COALESCE(rt.type_name, \'\') LIKE :q
                OR COALESCE(rst.name, \'\') LIKE :q
            )';
            $params[':q'] = '%' . $q . '%';
        }

        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $sql = "
            SELECT COUNT(*) AS c
            FROM {$this->table} a
            INNER JOIN publicity_post pp
                ON pp.publicity_post_id = a.{$col}
            LEFT JOIN event e
                ON e.event_id = pp.event_id
            LEFT JOIN province prov
                ON prov.province_id = e.province_id
            LEFT JOIN request r
                ON r.request_id = e.request_id
            LEFT JOIN request_type rt
                ON rt.request_type_id = r.request_type
            LEFT JOIN request_sub_type rst
                ON rst.request_sub_type_id = r.request_sub_type
            {$whereSql}
        ";

        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, (string)$v, PDO::PARAM_STR);
        }
        $stmt->execute();
        return (int)($stmt->fetchColumn() ?: 0);
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function listPublic(string $q = '', int $page = 1, int $limit = 200): array
    {
        $q = trim($q);
        $page = max(1, (int)$page);
        $limit = max(1, min(500, (int)$limit));
        $offset = ($page - 1) * $limit;

        $col = $this->publicityPostIdColumn();

        $where = [];
        $params = [
            ':limit' => $limit,
            ':offset' => $offset,
        ];

        if ($q !== '') {
            $where[] = '(
                pp.title LIKE :q
                OR pp.content LIKE :q
                OR COALESCE(prov.nameTH, prov.nameEN) LIKE :q
                OR COALESCE(rt.type_name, \'\') LIKE :q
                OR COALESCE(rst.name, \'\') LIKE :q
            )';
            $params[':q'] = '%' . $q . '%';
        }

        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $sql = "
            SELECT
                a.activity_id,
                a.{$col} AS publicity_post_id,

                pp.event_id,
                pp.title,
                pp.create_at,
                pp.update_at,

                -- event meta
                e.start_datetime,
                e.end_datetime,
                COALESCE(prov.nameTH, prov.nameEN) AS province_name,
                COALESCE(rt.type_name, '') AS request_type_name,
                COALESCE(rst.name, '') AS request_sub_type_name,

                -- writer
                COALESCE(p.display_name, u.line_user_name, CONCAT('user#', pp.create_by)) AS writer_name,

                -- cover image (first selected, prefer is_cover)
                (
                    SELECT COALESCE(ra.filepath, erp.filepath)
                    FROM publicity_post_media ppm
                    INNER JOIN event_media em
                        ON em.event_media_id = ppm.event_media_id
                    LEFT JOIN request_attachment ra
                        ON em.source_type = 'request_attachment'
                       AND ra.request_attachment_id = em.source_id
                    LEFT JOIN event_report_picture erp
                        ON em.source_type = 'event_report_picture'
                       AND erp.event_report_picture_id = em.source_id
                    WHERE ppm.post_id = pp.publicity_post_id
                    ORDER BY ppm.is_cover DESC, ppm.sort_order ASC, ppm.publicity_post_media_id ASC
                    LIMIT 1
                ) AS cover_filepath
            FROM {$this->table} a
            INNER JOIN publicity_post pp
                ON pp.publicity_post_id = a.{$col}
            LEFT JOIN event e
                ON e.event_id = pp.event_id
            LEFT JOIN province prov
                ON prov.province_id = e.province_id
            LEFT JOIN request r
                ON r.request_id = e.request_id
            LEFT JOIN request_type rt
                ON rt.request_type_id = r.request_type
            LEFT JOIN request_sub_type rst
                ON rst.request_sub_type_id = r.request_sub_type
            LEFT JOIN person p
                ON p.person_user_id = pp.create_by
            LEFT JOIN `user` u
                ON u.user_id = pp.create_by
            {$whereSql}
            ORDER BY COALESCE(e.end_datetime, e.start_datetime, pp.update_at, pp.create_at) DESC, a.activity_id DESC
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

    public function getPublic(int $activityId): ?array
    {
        $activityId = max(1, (int)$activityId);

        $col = $this->publicityPostIdColumn();

        $sql = "
            SELECT
                a.activity_id,
                a.{$col} AS publicity_post_id,

                pp.event_id,
                pp.title,
                pp.content,
                pp.create_at,
                pp.update_at,

                e.start_datetime,
                e.end_datetime,
                COALESCE(prov.nameTH, prov.nameEN) AS province_name,
                COALESCE(rt.type_name, '') AS request_type_name,
                COALESCE(rst.name, '') AS request_sub_type_name,

                COALESCE(p.display_name, u.line_user_name, CONCAT('user#', pp.create_by)) AS writer_name
            FROM {$this->table} a
            INNER JOIN publicity_post pp
                ON pp.publicity_post_id = a.{$col}
            LEFT JOIN event e
                ON e.event_id = pp.event_id
            LEFT JOIN province prov
                ON prov.province_id = e.province_id
            LEFT JOIN request r
                ON r.request_id = e.request_id
            LEFT JOIN request_type rt
                ON rt.request_type_id = r.request_type
            LEFT JOIN request_sub_type rst
                ON rst.request_sub_type_id = r.request_sub_type
            LEFT JOIN person p
                ON p.person_user_id = pp.create_by
            LEFT JOIN `user` u
                ON u.user_id = pp.create_by
            WHERE a.activity_id = :aid
            LIMIT 1
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':aid' => $activityId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        if (!$row) return null;

        $postId = (int)($row['publicity_post_id'] ?? 0);
        if ($postId > 0) {
            $mStmt = $this->pdo->prepare("
                SELECT
                    ppm.publicity_post_media_id,
                    ppm.event_media_id,
                    ppm.sort_order,
                    ppm.is_cover,
                    COALESCE(ra.filepath, erp.filepath) AS filepath
                FROM publicity_post_media ppm
                INNER JOIN event_media em
                    ON em.event_media_id = ppm.event_media_id
                LEFT JOIN request_attachment ra
                    ON em.source_type = 'request_attachment'
                   AND ra.request_attachment_id = em.source_id
                LEFT JOIN event_report_picture erp
                    ON em.source_type = 'event_report_picture'
                   AND erp.event_report_picture_id = em.source_id
                WHERE ppm.post_id = :pid
                ORDER BY ppm.is_cover DESC, ppm.sort_order ASC, ppm.publicity_post_media_id ASC
            ");
            $mStmt->execute([':pid' => $postId]);
            $row['media'] = $mStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        } else {
            $row['media'] = [];
        }

        return $row;
    }
}

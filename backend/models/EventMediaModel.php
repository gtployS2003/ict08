<?php
// backend/models/EventMediaModel.php
declare(strict_types=1);

final class EventMediaModel
{
    /** @var string */
    private $table = 'event_media';

    /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function countByEventId(int $eventId): int
    {
        $eventId = max(1, (int) $eventId);
        $stmt = $this->pdo->prepare("SELECT COUNT(*) AS c FROM {$this->table} WHERE event_id = :eid");
        $stmt->execute([':eid' => $eventId]);
        return (int) ($stmt->fetchColumn() ?: 0);
    }

    /**
     * Ensure event_media is populated for an event.
     *
     * Rule:
     * - If event.request_id exists => import from request_attachment
     * - Else => import from event_report_picture
     *
     * This is intended to run when creating publicity_post and also as a fallback
     * when requesting /events/{id}/media.
     *
     * @return array{inserted:int,source:string}
     */
    public function ensureIndexForEvent(int $eventId): array
    {
        $eventId = max(1, (int) $eventId);
        if ($eventId <= 0)
            return ['inserted' => 0, 'source' => 'invalid'];

        // If already indexed, do nothing.
        if ($this->countByEventId($eventId) > 0) {
            return ['inserted' => 0, 'source' => 'existing'];
        }

        // Determine request_id
        $stmt = $this->pdo->prepare('SELECT request_id FROM event WHERE event_id = :eid LIMIT 1');
        $stmt->execute([':eid' => $eventId]);
        $requestId = (int) ($stmt->fetchColumn() ?: 0);

        $sourceType = '';
        $sourceIds = [];

        if ($requestId > 0) {
            $sourceType = 'request_attachment';
            $q = $this->pdo->prepare('SELECT request_attachment_id AS id FROM request_attachment WHERE request_id = :rid ORDER BY request_attachment_id ASC');
            $q->execute([':rid' => $requestId]);
            $rows = $q->fetchAll(PDO::FETCH_ASSOC) ?: [];
            foreach ($rows as $r) {
                $id = (int) ($r['id'] ?? 0);
                if ($id > 0)
                    $sourceIds[] = $id;
            }
        } else {
            $sourceType = 'event_report_picture';
            $q = $this->pdo->prepare('
                SELECT erp.event_report_picture_id AS id
                FROM event_report_picture erp
                INNER JOIN event_report er
                    ON er.event_report_id = erp.event_report_id
                WHERE er.event_id = :eid
                ORDER BY erp.event_report_picture_id ASC
            ');
            $q->execute([':eid' => $eventId]);
            $rows = $q->fetchAll(PDO::FETCH_ASSOC) ?: [];
            foreach ($rows as $r) {
                $id = (int) ($r['id'] ?? 0);
                if ($id > 0)
                    $sourceIds[] = $id;
            }
        }

        if (empty($sourceIds)) {
            return ['inserted' => 0, 'source' => $sourceType ?: 'none'];
        }

        $inserted = 0;
        $this->pdo->beginTransaction();
        try {
            $sort = 1;
            $ins = $this->pdo->prepare("
                INSERT INTO {$this->table}
                    (event_id, source_type, source_id, sort_order, is_cover)
                VALUES
                    (:eid, :stype, :sid, :sort, :cover)
            ");

            foreach ($sourceIds as $idx => $sid) {
                $cover = ($idx === 0) ? 1 : 0;
                $ins->execute([
                    ':eid' => $eventId,
                    ':stype' => $sourceType,
                    ':sid' => (int) $sid,
                    ':sort' => $sort,
                    ':cover' => $cover,
                ]);
                $inserted++;
                $sort++;
            }

            $this->pdo->commit();
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }

        return ['inserted' => $inserted, 'source' => $sourceType];
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function listByEventId(int $eventId): array
    {
        $eventId = max(1, (int) $eventId);

        $sql = "
            SELECT
                em.event_media_id,
                em.event_id,
                em.source_type,
                em.source_id,
                em.sort_order,
                em.is_cover,
                em.created_at,

                COALESCE(ra.filepath, erp.filepath) AS filepath,
                COALESCE(ra.original_filename, erp.original_filename) AS original_filename,
                COALESCE(ra.stored_filename, erp.stored_filename) AS stored_filename,
                COALESCE(ra.file_size, erp.file_size) AS file_size,
                COALESCE(ra.uploaded_by, erp.uploaded_by) AS uploaded_by,
                COALESCE(ra.uploaded_at, erp.uploaded_at) AS uploaded_at
            FROM {$this->table} em
            LEFT JOIN request_attachment ra
                ON em.source_type = 'request_attachment'
               AND ra.request_attachment_id = em.source_id
            LEFT JOIN event_report_picture erp
                ON em.source_type = 'event_report_picture'
               AND erp.event_report_picture_id = em.source_id
            WHERE em.event_id = :eid
            ORDER BY em.is_cover DESC, em.sort_order ASC, em.event_media_id ASC
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':eid' => $eventId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }
}

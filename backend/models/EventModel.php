<?php
// backend/models/EventModel.php
declare(strict_types=1);

final class EventModel
{
    public function __construct(private PDO $pdo) {}

    /**
     * List events for schedule/events.html table.
     * Includes request info, requester display name, participant display names, province name and event status.
     *
     * @return array<int,array<string,mixed>>
     */
    public function listForTable(string $q = '', int $page = 1, int $limit = 200): array
    {
        $q = trim($q);
        $page = max(1, $page);
        $limit = max(1, min(500, $limit));
        $offset = ($page - 1) * $limit;

        $where = [];
        $params = [
            ':limit' => $limit,
            ':offset' => $offset,
        ];

        if ($q !== '') {
            $where[] = '(
                e.title LIKE :q
                OR e.detail LIKE :q
                OR COALESCE(pReq.display_name, uReq.line_user_name, CONCAT(\'user#\', r.requester_id)) LIKE :q
                OR COALESCE(prov.nameTH, prov.nameEN) LIKE :q
                OR COALESCE(rt.type_name, \'\') LIKE :q
                OR COALESCE(rst.name, \'\') LIKE :q
                OR COALESCE(es.status_name, es.status_code, \'\') LIKE :q
                OR COALESCE(GROUP_CONCAT(DISTINCT COALESCE(pPart.display_name, uPart.line_user_name, CONCAT(\'user#\', uPart.user_id)) SEPARATOR \' , \'), \'\') LIKE :q
            )';
            $params[':q'] = '%' . $q . '%';
        }

        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $sql = "
            SELECT
                e.event_id,
                e.request_id,
                e.title,
                e.province_id,
                e.start_datetime,
                e.end_datetime,
                e.event_status_id,

                -- province
                prov.nameTH AS province_name_th,
                prov.nameEN AS province_name_en,

                -- request type/subtype
                r.request_type AS request_type_id,
                rt.type_name AS request_type_name,
                r.request_sub_type AS request_sub_type_id,
                rst.name AS request_sub_type_name,

                -- requester
                r.requester_id,
                COALESCE(pReq.display_name, uReq.line_user_name, CONCAT('user#', r.requester_id)) AS requester_name,

                -- status
                es.request_type_id AS event_status_request_type_id,
                es.status_code AS event_status_code,
                es.status_name AS event_status_name,

                -- participants (names)
                GROUP_CONCAT(DISTINCT uPart.user_id ORDER BY uPart.user_id SEPARATOR ',') AS participant_user_ids,
                GROUP_CONCAT(
                    DISTINCT COALESCE(pPart.display_name, uPart.line_user_name, CONCAT('user#', uPart.user_id))
                    ORDER BY COALESCE(pPart.display_name, uPart.line_user_name, CONCAT('user#', uPart.user_id))
                    SEPARATOR ' , '
                ) AS participant_names
            FROM event e
            LEFT JOIN province prov
                ON prov.province_id = e.province_id
            LEFT JOIN request r
                ON r.request_id = e.request_id
            LEFT JOIN request_type rt
                ON rt.request_type_id = r.request_type
            LEFT JOIN request_sub_type rst
                ON rst.request_sub_type_id = r.request_sub_type
            LEFT JOIN event_status es
                ON es.event_status_id = e.event_status_id
               AND (r.request_type IS NULL OR es.request_type_id = r.request_type)
            LEFT JOIN person pReq
                ON pReq.person_user_id = r.requester_id
            LEFT JOIN `user` uReq
                ON uReq.user_id = r.requester_id
            LEFT JOIN event_participant ep
                ON ep.event_id = e.event_id
               AND (ep.is_active = 1 OR ep.is_active IS NULL)
            LEFT JOIN `user` uPart
                ON uPart.user_id = ep.user_id
            LEFT JOIN person pPart
                ON pPart.person_user_id = uPart.user_id
            {$whereSql}
            GROUP BY e.event_id
            ORDER BY e.event_id ASC
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

    public function countForTable(string $q = ''): int
    {
        $q = trim($q);

        $where = [];
        $params = [];

        if ($q !== '') {
            $where[] = '(
                e.title LIKE :q
                OR e.detail LIKE :q
                OR COALESCE(pReq.display_name, uReq.line_user_name, CONCAT(\'user#\', r.requester_id)) LIKE :q
                OR COALESCE(prov.nameTH, prov.nameEN) LIKE :q
                OR COALESCE(rt.type_name, \'\') LIKE :q
                OR COALESCE(rst.name, \'\') LIKE :q
                OR COALESCE(es.status_name, es.status_code, \'\') LIKE :q
            )';
            $params[':q'] = '%' . $q . '%';
        }

        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $sql = "
            SELECT COUNT(DISTINCT e.event_id) AS cnt
            FROM event e
            LEFT JOIN province prov
                ON prov.province_id = e.province_id
            LEFT JOIN request r
                ON r.request_id = e.request_id
            LEFT JOIN request_type rt
                ON rt.request_type_id = r.request_type
            LEFT JOIN request_sub_type rst
                ON rst.request_sub_type_id = r.request_sub_type
            LEFT JOIN event_status es
                ON es.event_status_id = e.event_status_id
               AND (r.request_type IS NULL OR es.request_type_id = r.request_type)
            LEFT JOIN person pReq
                ON pReq.person_user_id = r.requester_id
            LEFT JOIN `user` uReq
                ON uReq.user_id = r.requester_id
            {$whereSql}
        ";

        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, (string)$v, PDO::PARAM_STR);
        }
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
        return (int)($row['cnt'] ?? 0);
    }

    /**
     * List events in a datetime range (inclusive).
     * Includes province name and aggregated participant info.
     *
     * @return array<int,array<string,mixed>>
     */
    public function listByRange(string $fromDatetime, string $toDatetime, int $limit = 2000): array
    {
        $fromDatetime = trim($fromDatetime);
        $toDatetime = trim($toDatetime);
        $limit = max(1, min(5000, (int)$limit));

        // Intersection logic:
        // start <= to AND COALESCE(end, start) >= from
        $sql = "
            SELECT
                e.*,

                -- province
                p.nameTH AS province_name_th,
                p.nameEN AS province_name_en,

                -- request-derived fields (for filtering)
                r.request_type AS request_type_id,
                rt.type_name AS request_type_name,
                r.request_sub_type AS request_sub_type_id,
                rst.name AS request_sub_type_name,

                -- event status (varies by request_type)
                es.status_code AS event_status_code,
                es.status_name AS event_status_name,

                -- participants
                GROUP_CONCAT(DISTINCT u.user_id ORDER BY u.user_id SEPARATOR ',') AS participant_user_ids,
                GROUP_CONCAT(DISTINCT u.line_user_name ORDER BY u.user_id SEPARATOR ',') AS participant_names
            FROM event e
            LEFT JOIN province p
                ON p.province_id = e.province_id
            LEFT JOIN request r
                ON r.request_id = e.request_id
            LEFT JOIN request_type rt
                ON rt.request_type_id = r.request_type
            LEFT JOIN request_sub_type rst
                ON rst.request_sub_type_id = r.request_sub_type
            LEFT JOIN event_status es
                ON es.event_status_id = e.event_status_id
            LEFT JOIN event_participant ep
                ON ep.event_id = e.event_id
               AND (ep.is_active = 1 OR ep.is_active IS NULL)
            LEFT JOIN `user` u
                ON u.user_id = ep.user_id
            WHERE e.start_datetime <= :to_dt
              AND COALESCE(e.end_datetime, e.start_datetime) >= :from_dt
            GROUP BY e.event_id
            ORDER BY e.start_datetime ASC, e.event_id ASC
            LIMIT {$limit}
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':from_dt' => $fromDatetime,
            ':to_dt' => $toDatetime,
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * @return array<string,mixed>|null
     */
    public function findById(int $id): ?array
    {
        $id = max(1, $id);

        $sql = "
            SELECT
                e.*,
                es.status_code AS event_status_code,
                es.status_name AS event_status_name
            FROM event e
            LEFT JOIN event_status es
                ON es.event_status_id = e.event_status_id
            WHERE e.event_id = :id
            LIMIT 1
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * @return array<string,mixed>|null
     */
    public function findByRequestId(int $requestId): ?array
    {
        $requestId = max(1, $requestId);

        $sql = "
            SELECT
                e.*,
                es.status_code AS event_status_code,
                es.status_name AS event_status_name
            FROM event e
            LEFT JOIN event_status es
                ON es.event_status_id = e.event_status_id
            WHERE e.request_id = :rid
            ORDER BY e.event_id ASC
            LIMIT 1
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':rid', $requestId, PDO::PARAM_INT);
        $stmt->execute();

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * Create event row.
     * Required keys: round_no, event_year
     * @param array<string,mixed> $data
     */
    public function create(array $data): int
    {
        $roundNo = isset($data['round_no']) ? (int)$data['round_no'] : 0;
        $eventYear = isset($data['event_year']) ? (int)$data['event_year'] : 0;

        if ($roundNo <= 0) {
            throw new InvalidArgumentException('round_no is required');
        }
        if ($eventYear <= 0) {
            throw new InvalidArgumentException('event_year is required');
        }

        $sql = "
            INSERT INTO event (
                request_id,
                title,
                detail,
                location,
                province_id,
                meeting_link,
                round_no,
                event_year,
                note,
                event_status_id,
                start_datetime,
                end_datetime,
                updated_at
            ) VALUES (
                :request_id,
                :title,
                :detail,
                :location,
                :province_id,
                :meeting_link,
                :round_no,
                :event_year,
                :note,
                :event_status_id,
                :start_datetime,
                :end_datetime,
                NOW()
            )
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':request_id' => $this->toNullableInt($data['request_id'] ?? null),
            ':title' => $this->toNullableString($data['title'] ?? null),
            ':detail' => $this->toNullableString($data['detail'] ?? null),
            ':location' => $this->toNullableString($data['location'] ?? null),
            ':province_id' => $this->toNullableInt($data['province_id'] ?? null),
            ':meeting_link' => $this->toNullableString($data['meeting_link'] ?? null),
            ':round_no' => $roundNo,
            ':event_year' => $eventYear,
            ':note' => $this->toNullableString($data['note'] ?? null),
            ':event_status_id' => $this->toNullableInt($data['event_status_id'] ?? null),
            ':start_datetime' => $this->toNullableString($data['start_datetime'] ?? null),
            ':end_datetime' => $this->toNullableString($data['end_datetime'] ?? null),
        ]);

        $eventId = (int)$this->pdo->lastInsertId();

        // Insert initial log row for every event insert.
        // NOTE: event_log columns are NOT NULL, so we coerce nulls to empty strings.
        $updatedBy = isset($data['updated_by']) ? (int)$data['updated_by'] : 0;
        if ($updatedBy < 0) $updatedBy = 0;

        $titleLog = trim((string)($data['title'] ?? ''));
        if (mb_strlen($titleLog) > 255) {
            $titleLog = mb_substr($titleLog, 0, 255);
        }
        $detailLog = (string)($data['detail'] ?? '');
        $locationLog = (string)($data['location'] ?? '');
        $noteLog = (string)($data['note'] ?? '');

        $stmtLog = $this->pdo->prepare('
            INSERT INTO event_log (
                event_id,
                title,
                detail,
                location,
                note,
                updated_by
            ) VALUES (
                :event_id,
                :title,
                :detail,
                :location,
                :note,
                :updated_by
            )
        ');
        $stmtLog->execute([
            ':event_id' => $eventId,
            ':title' => $titleLog,
            ':detail' => $detailLog,
            ':location' => $locationLog,
            ':note' => $noteLog,
            ':updated_by' => $updatedBy,
        ]);

        return $eventId;
    }

    /**
     * @param array<string,mixed> $data
     */
    public function update(int $id, array $data): bool
    {
        $id = max(1, $id);

        $sql = "
            UPDATE event
            SET
                title = :title,
                detail = :detail,
                location = :location,
                province_id = :province_id,
                meeting_link = :meeting_link,
                note = :note,
                event_status_id = :event_status_id,
                start_datetime = :start_datetime,
                end_datetime = :end_datetime,
                updated_at = NOW()
            WHERE event_id = :id
            LIMIT 1
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':title' => $this->toNullableString($data['title'] ?? null),
            ':detail' => $this->toNullableString($data['detail'] ?? null),
            ':location' => $this->toNullableString($data['location'] ?? null),
            ':province_id' => $this->toNullableInt($data['province_id'] ?? null),
            ':meeting_link' => $this->toNullableString($data['meeting_link'] ?? null),
            ':note' => $this->toNullableString($data['note'] ?? null),
            ':event_status_id' => $this->toNullableInt($data['event_status_id'] ?? null),
            ':start_datetime' => $this->toNullableString($data['start_datetime'] ?? null),
            ':end_datetime' => $this->toNullableString($data['end_datetime'] ?? null),
            ':id' => $id,
        ]);

        return $stmt->rowCount() > 0;
    }

    public function delete(int $id): bool
    {
        $id = max(1, $id);
        $stmt = $this->pdo->prepare('DELETE FROM event WHERE event_id = :id LIMIT 1');
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->rowCount() > 0;
    }

    private function toNullableInt(mixed $v): ?int
    {
        if ($v === null || $v === '') return null;
        if (is_bool($v)) return $v ? 1 : 0;
        if (!is_numeric($v)) return null;
        $i = (int)$v;
        return $i > 0 ? $i : null;
    }

    private function toNullableString(mixed $v): ?string
    {
        if ($v === null) return null;
        $s = trim((string)$v);
        return $s === '' ? null : $s;
    }
}

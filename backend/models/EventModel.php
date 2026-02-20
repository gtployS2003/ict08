<?php
// backend/models/EventModel.php
declare(strict_types=1);

final class EventModel
{
    public function __construct(private PDO $pdo) {}

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
            ORDER BY e.event_id DESC
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

        return (int)$this->pdo->lastInsertId();
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

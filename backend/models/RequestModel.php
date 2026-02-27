<?php
// backend/models/RequestModel.php
declare(strict_types=1);

class RequestModel
{
    /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Create new request
     * $data keys:
     * - request_type (int) [required]
     * - request_sub_type (int) [optional default 0]
     * - subject (string) [required]
     * - device_id (int|null) [optional]
     * - detail (string|null) [optional]
     * - requester_id (int) [required]
     * - province_id (int) [required for your flow]
     * - hasAttachment (int 0/1) [optional default 0]
     * - head_of_request_id (int|null) [optional]
     * - approve_by_id (int|null) [optional]
     * - approve_channel_id (int|null) [optional]
     * - urgency_id (int|null) [optional]
     * - approve_at (string|null) [optional datetime]
     * - start_date_time (string|null) [optional: 'YYYY-MM-DD HH:MM:SS']
     * - end_date_time (string|null) [optional]
     * - current_status_id (int) [optional default 1]
     * - request_at (optional) (ปล่อย DB set/หรือใช้ NOW)
     */
    public function create(array $data): int
    {
        if (!isset($data['request_type']) || !is_numeric($data['request_type'])) {
        throw new InvalidArgumentException('request_type is required');
    }
    

        $requestTypeId = (int)$data['request_type'];

        $currentStatusId = array_key_exists('current_status_id', $data) && $data['current_status_id'] !== '' && $data['current_status_id'] !== null
        ? (int)$data['current_status_id']
        : $this->getDefaultStatusIdByRequestType($requestTypeId);

        $sql = "
            INSERT INTO request (
                request_type,
                request_sub_type,
                subject,
                device_id,
                detail,
                requester_id,
                province_id,
                location,
                hasAttachment,
                head_of_request_id,
                approve_by_id,
                approve_channel_id,
                urgency_id,
                approve_at,
                start_date_time,
                end_date_time,
                current_status_id,
                request_at
            ) VALUES (
                :request_type,
                :request_sub_type,
                :subject,
                :device_id,
                :detail,
                :requester_id,
                :province_id,
                :location,
                :hasAttachment,
                :head_of_request_id,
                :approve_by_id,
                :approve_channel_id,
                :urgency_id,
                :approve_at,
                :start_date_time,
                :end_date_time,
                :current_status_id,
                NOW()
            )
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':request_type'       => (int)$data['request_type'],
            // ✅ allow NULL (repair flow requires request_sub_type = NULL)
            ':request_sub_type'   => array_key_exists('request_sub_type', $data)
                ? $this->toNullableInt($data['request_sub_type'])
                : null,
            ':subject'            => (string)$data['subject'],

            ':device_id'          => array_key_exists('device_id', $data) ? $this->toNullableInt($data['device_id']) : null,
            ':detail'             => array_key_exists('detail', $data) ? $this->toNullableString($data['detail']) : null,

            ':requester_id'       => (int)$data['requester_id'],
            ':province_id'        => (int)$data['province_id'],
            ':location'           => array_key_exists('location', $data) ? $this->toNullableString($data['location']) : null,

            ':hasAttachment'      => (int)($data['hasAttachment'] ?? 0),

            ':head_of_request_id' => array_key_exists('head_of_request_id', $data) ? $this->toNullableInt($data['head_of_request_id']) : null,
            ':approve_by_id'      => array_key_exists('approve_by_id', $data) ? $this->toNullableInt($data['approve_by_id']) : null,
            ':approve_channel_id' => array_key_exists('approve_channel_id', $data) ? $this->toNullableInt($data['approve_channel_id']) : null,

            ':urgency_id'         => array_key_exists('urgency_id', $data) ? $this->toNullableInt($data['urgency_id']) : null,
            ':approve_at'         => array_key_exists('approve_at', $data) ? $this->toNullableString($data['approve_at']) : null,

            ':start_date_time'    => array_key_exists('start_date_time', $data) ? $this->toNullableString($data['start_date_time']) : null,
            ':end_date_time'      => array_key_exists('end_date_time', $data) ? $this->toNullableString($data['end_date_time']) : null,

            ':current_status_id'  => $currentStatusId,
        ]);

        return (int)$this->pdo->lastInsertId();
    }

    public function findById(int $id): ?array
    {
        $sql = "SELECT * FROM request WHERE request_id = :id LIMIT 1";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    private function toNullableInt(mixed $v): ?int
    {
        if ($v === null) return null;
        if ($v === '') return null;
        if (is_bool($v)) return $v ? 1 : 0;
        if (!is_numeric($v)) return null;
        return (int)$v;
    }

    private function toNullableString(mixed $v): ?string
    {
        if ($v === null) return null;
        $s = trim((string)$v);
        return $s === '' ? null : $s;
    }

    private function getDefaultStatusIdByRequestType(int $requestTypeId): int
{
    $sql = "
        SELECT status_id
        FROM request_status
        WHERE request_type_id = :tid
        ORDER BY sort_order ASC, status_id ASC
        LIMIT 1
    ";
    $stmt = $this->pdo->prepare($sql);
    $stmt->execute([':tid' => $requestTypeId]);
    $id = $stmt->fetchColumn();

    // fallback เผื่อไม่มีข้อมูล status ของ type นั้นจริง ๆ
    return $id ? (int)$id : 1;
}

}

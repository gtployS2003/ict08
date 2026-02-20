<?php
// backend/controllers/events.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../models/EventModel.php';
require_once __DIR__ . '/../models/EventParticipantModel.php';
require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/../models/NotificationModel.php';
require_once __DIR__ . '/../services/NotificationService.php';

env_load(__DIR__ . '/../.env');

// auth middleware
$authPath = __DIR__ . '/../middleware/auth.php';
if (file_exists($authPath)) {
    require_once $authPath;
}

// dev auth middleware (X-Dev-Api-Key)
$devAuthPath = __DIR__ . '/../middleware/dev_auth.php';
if (file_exists($devAuthPath)) {
    require_once $devAuthPath;
}

final class EventsController
{
    public function __construct(private PDO $pdo) {}

    /**
     * GET /events/table?page=&limit=&q=
     * List events for schedule/events.html table.
     */
    public function table(): void
    {
        try {
            $this->requireStaffAccess();

            $page = max(1, (int)($_GET['page'] ?? 1));
            $limit = max(1, min(500, (int)($_GET['limit'] ?? 200)));
            $q = trim((string)($_GET['q'] ?? ''));

            $m = new EventModel($this->pdo);
            $rows = $m->listForTable($q, $page, $limit);
            $total = $m->countForTable($q);

            json_response([
                'error' => false,
                'data' => $rows,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => $total,
                    'totalPages' => (int)ceil($total / max(1, $limit)),
                ],
            ]);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to list events table',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /events?from=YYYY-MM-DD&to=YYYY-MM-DD
     * Returns events in date range for calendar.
     */
    public function index(): void
    {
        try {
            $this->requireStaffAccess();

            $from = trim((string)($_GET['from'] ?? ''));
            $to = trim((string)($_GET['to'] ?? ''));

            if ($from === '' || $to === '') {
                json_response(['error' => true, 'message' => 'from and to are required (YYYY-MM-DD)'], 422);
                return;
            }

            if (!$this->isDate($from) || !$this->isDate($to)) {
                json_response(['error' => true, 'message' => 'from and to must be YYYY-MM-DD'], 422);
                return;
            }

            $fromDt = $from . ' 00:00:00';
            $toDt = $to . ' 23:59:59';

            $m = new EventModel($this->pdo);
            $rows = $m->listByRange($fromDt, $toDt);

            json_response(['error' => false, 'data' => $rows]);
        } catch (Throwable $e) {
            json_response(['error' => true, 'message' => 'Failed to list events', 'detail' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /events/internal
     * Create internal event (not via request) and create event_participant rows.
     */
    public function createInternal(): void
    {
        try {
            $this->requireStaffAccess();

            $body = read_json_body();

            $title = trim((string)($body['title'] ?? ''));
            if ($title === '') {
                json_response(['error' => true, 'message' => 'title is required'], 422);
                return;
            }
            if (mb_strlen($title) > 255) {
                json_response(['error' => true, 'message' => 'title max length is 255'], 422);
                return;
            }

            $detail = (string)($body['detail'] ?? '');
            $location = (string)($body['location'] ?? '');
            $meetingLink = (string)($body['meeting_link'] ?? '');
            $note = (string)($body['note'] ?? '');

            $provinceId = (int)($body['province_id'] ?? 0);
            if ($provinceId <= 0) $provinceId = 0;

            $startRaw = trim((string)($body['start_datetime'] ?? $body['start_date'] ?? ''));
            $endRaw = trim((string)($body['end_datetime'] ?? $body['end_date'] ?? ''));

            if ($startRaw === '' || $endRaw === '') {
                json_response(['error' => true, 'message' => 'start_datetime and end_datetime are required'], 422);
                return;
            }

            $startDt = $this->normalizeToDateTime($startRaw, false);
            $endDt = $this->normalizeToDateTime($endRaw, true);

            if ($startDt === null || $endDt === null) {
                json_response(['error' => true, 'message' => 'start_datetime/end_datetime must be YYYY-MM-DD or YYYY-MM-DD HH:MM:SS'], 422);
                return;
            }

            if (strtotime($endDt) < strtotime($startDt)) {
                json_response(['error' => true, 'message' => 'end_datetime must be later than or equal to start_datetime'], 422);
                return;
            }

            if ($provinceId > 0) {
                $chk = $this->pdo->prepare('SELECT 1 FROM province WHERE province_id = :id LIMIT 1');
                $chk->execute([':id' => $provinceId]);
                if (!$chk->fetchColumn()) {
                    json_response(['error' => true, 'message' => 'Invalid province_id'], 422);
                    return;
                }
            }

            // participants: array of user_id where role_id in (2,3)
            $participantIds = $body['participant_user_ids'] ?? $body['participants'] ?? [];
            if (!is_array($participantIds)) {
                json_response(['error' => true, 'message' => 'participant_user_ids must be an array'], 422);
                return;
            }
            $participantIds = array_values(array_unique(array_filter(array_map('intval', $participantIds), fn($v) => $v > 0)));

            // Validate participant roles (if any)
            if (!empty($participantIds)) {
                $in = implode(',', array_fill(0, count($participantIds), '?'));
                $sql = "SELECT user_id FROM `user` WHERE user_id IN ($in) AND user_role_id IN (2,3)";
                $stmt = $this->pdo->prepare($sql);
                $stmt->execute($participantIds);
                $found = $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
                $foundIds = array_map('intval', $found);

                sort($foundIds);
                $expect = $participantIds;
                sort($expect);

                if ($foundIds !== $expect) {
                    json_response(['error' => true, 'message' => 'Invalid participant_user_ids (must be staff/admin users)'], 422);
                    return;
                }
            }

            $this->pdo->beginTransaction();

            $eventYearBE = $this->computeEventYearBE($startDt);
            $roundNo = $this->getNextEventRoundNo($eventYearBE);

            $eventModel = new EventModel($this->pdo);
            $eventId = $eventModel->create([
                'request_id' => null,
                'title' => $title,
                'detail' => $detail,
                'location' => $location,
                'province_id' => ($provinceId > 0 ? $provinceId : null),
                'meeting_link' => $meetingLink,
                'round_no' => $roundNo,
                'event_year' => $eventYearBE,
                'note' => $note,
                'event_status_id' => null,
                'start_datetime' => $startDt,
                'end_datetime' => $endDt,
            ]);

            $epModel = new EventParticipantModel($this->pdo);

            $dispatchUserIds = [];
            $dispatchMessage = '';

            if (!empty($participantIds)) {
                $epModel->insertMany($eventId, $participantIds, 1, 1);

                // Create notification for participants (internal event)
                // - request_id = null
                // - event_id = new event_id
                // - notification_type_id = 8
                // - schedule_at = null
                try {
                    // Ensure notification_type_id=8 exists (best effort)
                    $chkNt = $this->pdo->prepare('SELECT 1 FROM notification_type WHERE notification_type_id = 8 LIMIT 1');
                    $chkNt->execute();
                    $hasNt8 = (bool)$chkNt->fetchColumn();
                    if (!$hasNt8) {
                        $insNt = $this->pdo->prepare('
                            INSERT INTO notification_type (notification_type_id, notification_type, meaning)
                            VALUES (8, :t, :m)
                        ');
                        $insNt->execute([
                            ':t' => 'internal_event_participant',
                            ':m' => 'แจ้งเตือนผู้เข้าร่วมงานภายใน',
                        ]);
                    }
                } catch (Throwable $e) {
                    // ignore if cannot create master; will fail later if FK exists
                    error_log('[EVENTS] ensure notification_type 8 failed: ' . $e->getMessage());
                }

                $basePathRaw = (string)env('BASE_PATH', '/ict8');
                $basePathTrim = trim($basePathRaw);
                $basePath = ($basePathTrim !== '' ? $basePathTrim : '/ict8');
                if (!str_starts_with($basePath, '/')) {
                    $basePath = '/' . $basePath;
                }
                $basePath = rtrim($basePath, '/');

                $msg = "คุณมีส่วนร่วมกับงาน: {$title}\n";
                $url = $this->buildEventEditUrl($eventId);
                $msg .= ($url !== '')
                    ? ("แก้ไขรายละเอียดงานได้ที่: {$url}")
                    : ("แก้ไขรายละเอียดงานได้ที่: {$basePath}/schedule/event-edit.html?id={$eventId}");

                $notifModel = new NotificationModel($this->pdo);
                $notifModel->createEventNotification([
                    'event_id' => $eventId,
                    'notification_type_id' => 8,
                    'message' => $msg,
                ]);

                // prepare LINE dispatch (best effort) after commit
                $dispatchUserIds = $participantIds;
                $dispatchMessage = $msg;
            }

            $this->pdo->commit();

            // Dispatch LINE notifications (best effort) after commit
            $dispatchMeta = null;
            if (!empty($dispatchUserIds) && trim($dispatchMessage) !== '') {
                try {
                    $svc = new NotificationService($this->pdo);
                    $resp = $svc->dispatchToUsers($dispatchUserIds, $dispatchMessage);
                    $dispatchMeta = [
                        'ok' => (bool)($resp['ok'] ?? false),
                        'recipients' => (int)($resp['recipients'] ?? 0),
                        'sent_line' => (int)($resp['sent_line'] ?? 0),
                        'skipped' => (int)($resp['skipped'] ?? 0),
                        'errors_count' => is_array($resp['errors'] ?? null) ? count($resp['errors']) : 0,
                    ];

                    if (($resp['ok'] ?? false) !== true || !empty($resp['errors'])) {
                        error_log('[EVENTS] dispatchToUsers resp: ' . json_encode($resp, JSON_UNESCAPED_UNICODE));
                    }
                } catch (Throwable $e) {
                    error_log('[EVENTS] dispatchToUsers failed: ' . $e->getMessage());
                    $dispatchMeta = [
                        'ok' => false,
                        'error' => $e->getMessage(),
                    ];
                }
            }

            $fresh = $eventModel->findById($eventId);
            $participants = $epModel->listByEventId($eventId);

            json_response([
                'error' => false,
                'message' => 'Created',
                'data' => [
                    'event' => $fresh,
                    'participants' => $participants,
                    'notification_dispatch' => $dispatchMeta,
                ],
            ], 201);
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            json_response(['error' => true, 'message' => 'Failed to create internal event', 'detail' => $e->getMessage()], 500);
        }
    }

    private function buildEventEditUrl(int $eventId): string
    {
        $eventId = max(0, (int)$eventId);
        if ($eventId <= 0) return '';

        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host = (string)($_SERVER['HTTP_HOST'] ?? '');

        $basePath = env('BASE_PATH', '/ict8') ?: '/ict8';
        if ($basePath === '') $basePath = '/ict8';
        if ($basePath[0] !== '/') $basePath = '/' . $basePath;
        $basePath = rtrim($basePath, '/');

        // If host is missing (CLI etc.), return relative link
        if ($host === '') {
            return $basePath . '/schedule/event-edit.html?id=' . $eventId;
        }

        return $scheme . '://' . $host . $basePath . '/schedule/event-edit.html?id=' . $eventId;
    }

    /**
     * GET /events/{id}
     */
    public function show(int $id): void
    {
        try {
            $this->requireStaffAccess();

            $id = max(1, (int)$id);
            $m = new EventModel($this->pdo);
            $row = $m->findById($id);
            if (!$row) {
                json_response(['error' => true, 'message' => 'Event not found'], 404);
                return;
            }

            json_response(['error' => false, 'data' => $row]);
        } catch (Throwable $e) {
            json_response(['error' => true, 'message' => 'Failed to get event', 'detail' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /events/by-request/{requestId}
     */
    public function showByRequest(int $requestId): void
    {
        try {
            $this->requireStaffAccess();

            $requestId = max(1, (int)$requestId);
            $m = new EventModel($this->pdo);
            $row = $m->findByRequestId($requestId);
            if (!$row) {
                json_response(['error' => true, 'message' => 'Event not found for request'], 404);
                return;
            }

            json_response(['error' => false, 'data' => $row]);
        } catch (Throwable $e) {
            json_response(['error' => true, 'message' => 'Failed to get event', 'detail' => $e->getMessage()], 500);
        }
    }

    /**
     * PUT /events/{id}
     */
    public function update(int $id): void
    {
        try {
            $this->requireStaffAccess();

            $id = max(1, (int)$id);
            $body = read_json_body();

            $m = new EventModel($this->pdo);
            $existing = $m->findById($id);
            if (!$existing) {
                json_response(['error' => true, 'message' => 'Event not found'], 404);
                return;
            }

            $title = array_key_exists('title', $body) ? trim((string)($body['title'] ?? '')) : trim((string)($existing['title'] ?? ''));
            if ($title === '') {
                json_response(['error' => true, 'message' => 'title is required'], 422);
                return;
            }
            if (mb_strlen($title) > 255) {
                json_response(['error' => true, 'message' => 'title max length is 255'], 422);
                return;
            }

            $start = array_key_exists('start_datetime', $body) ? trim((string)($body['start_datetime'] ?? '')) : (string)($existing['start_datetime'] ?? '');
            $end = array_key_exists('end_datetime', $body) ? trim((string)($body['end_datetime'] ?? '')) : (string)($existing['end_datetime'] ?? '');

            $startVal = ($start === '' ? null : $start);
            $endVal = ($end === '' ? null : $end);

            if ($startVal !== null && !$this->isDateTime($startVal)) {
                json_response(['error' => true, 'message' => 'start_datetime must be YYYY-MM-DD HH:MM:SS'], 422);
                return;
            }
            if ($endVal !== null && !$this->isDateTime($endVal)) {
                json_response(['error' => true, 'message' => 'end_datetime must be YYYY-MM-DD HH:MM:SS'], 422);
                return;
            }
            if ($startVal !== null && $endVal !== null) {
                if (strtotime($endVal) <= strtotime($startVal)) {
                    json_response(['error' => true, 'message' => 'end_datetime must be later than start_datetime'], 422);
                    return;
                }
            }

            $provinceId = array_key_exists('province_id', $body) ? (int)($body['province_id'] ?? 0) : (int)($existing['province_id'] ?? 0);
            if ($provinceId <= 0) $provinceId = null;

            if ($provinceId !== null) {
                $chk = $this->pdo->prepare('SELECT 1 FROM province WHERE province_id = :id LIMIT 1');
                $chk->execute([':id' => $provinceId]);
                if (!$chk->fetchColumn()) {
                    json_response(['error' => true, 'message' => 'Invalid province_id'], 422);
                    return;
                }
            }

            $eventStatusId = array_key_exists('event_status_id', $body) ? (int)($body['event_status_id'] ?? 0) : (int)($existing['event_status_id'] ?? 0);
            if ($eventStatusId <= 0) $eventStatusId = null;

            // Validate event_status_id belongs to request_type (if the event is tied to a request)
            $reqId = (int)($existing['request_id'] ?? 0);
            if ($eventStatusId !== null && $reqId > 0) {
                $chk = $this->pdo->prepare('
                    SELECT 1
                    FROM event_status es
                    INNER JOIN request r ON r.request_id = :rid
                    WHERE es.event_status_id = :esid
                      AND es.request_type_id = r.request_type
                    LIMIT 1
                ');
                $chk->execute([':rid' => $reqId, ':esid' => $eventStatusId]);
                if (!$chk->fetchColumn()) {
                    json_response(['error' => true, 'message' => 'Invalid event_status_id for this request_type'], 422);
                    return;
                }
            }

            $data = [
                'title' => $title,
                'detail' => array_key_exists('detail', $body) ? (string)($body['detail'] ?? '') : (string)($existing['detail'] ?? ''),
                'location' => array_key_exists('location', $body) ? (string)($body['location'] ?? '') : (string)($existing['location'] ?? ''),
                'province_id' => $provinceId,
                'meeting_link' => array_key_exists('meeting_link', $body) ? (string)($body['meeting_link'] ?? '') : (string)($existing['meeting_link'] ?? ''),
                'note' => array_key_exists('note', $body) ? (string)($body['note'] ?? '') : (string)($existing['note'] ?? ''),
                'event_status_id' => $eventStatusId,
                'start_datetime' => $startVal,
                'end_datetime' => $endVal,
            ];

            $ok = $m->update($id, $data);

            // return fresh row
            $fresh = $m->findById($id);
            json_response([
                'error' => false,
                'message' => $ok ? 'Updated' : 'No changes',
                'data' => $fresh ?? ['event_id' => $id],
            ]);
        } catch (Throwable $e) {
            json_response(['error' => true, 'message' => 'Failed to update event', 'detail' => $e->getMessage()], 500);
        }
    }

    /**
     * DELETE /events/{id}
     */
    public function delete(int $id): void
    {
        try {
            $this->requireStaffAccess();

            $id = max(1, (int)$id);
            $m = new EventModel($this->pdo);
            $existing = $m->findById($id);
            if (!$existing) {
                json_response(['error' => true, 'message' => 'Event not found'], 404);
                return;
            }

            // Cleanup child rows that block FK deletes (at least notification)
            try {
                $stmt = $this->pdo->prepare('DELETE FROM event_participant WHERE event_id = :eid');
                $stmt->execute([':eid' => $id]);
            } catch (Throwable $e) {
                // best effort
                error_log('[EVENTS] delete participants failed: ' . $e->getMessage());
            }

            try {
                $stmt = $this->pdo->prepare('DELETE FROM notification WHERE event_id = :eid');
                $stmt->execute([':eid' => $id]);
            } catch (Throwable $e) {
                // best effort
                error_log('[EVENTS] delete notification failed: ' . $e->getMessage());
            }

            $ok = $m->delete($id);
            if (!$ok) {
                json_response(['error' => true, 'message' => 'Delete failed'], 409);
                return;
            }

            json_response(['error' => false, 'message' => 'Deleted']);
        } catch (Throwable $e) {
            json_response(['error' => true, 'message' => 'Failed to delete event', 'detail' => $e->getMessage()], 500);
        }
    }

    private function isDateTime(string $v): bool
    {
        return (bool)preg_match('/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/', $v);
    }

    private function isDate(string $v): bool
    {
        return (bool)preg_match('/^\d{4}-\d{2}-\d{2}$/', $v);
    }

    /**
     * Accepts YYYY-MM-DD or YYYY-MM-DD HH:MM:SS.
     * If date-only, appends 00:00:00 for start or 23:59:59 for end.
     */
    private function normalizeToDateTime(string $v, bool $isEnd): ?string
    {
        $v = trim($v);
        if ($v === '') return null;

        if ($this->isDateTime($v)) {
            return $v;
        }

        if ($this->isDate($v)) {
            return $isEnd ? ($v . ' 23:59:59') : ($v . ' 00:00:00');
        }

        return null;
    }

    /**
     * Compute Thai B.E. year (พ.ศ.) for event.
     */
    private function computeEventYearBE(?string $startDatetime): int
    {
        $y = 0;
        $startDatetime = $startDatetime !== null ? trim($startDatetime) : '';

        if ($startDatetime !== '') {
            try {
                $dt = new DateTimeImmutable($startDatetime);
                $y = (int)$dt->format('Y');
            } catch (Throwable $e) {
                $y = 0;
            }
        }

        if ($y <= 0) {
            $y = (int)date('Y');
        }

        return $y + 543;
    }

    /**
     * Get next round number for a given event year (B.E.).
     * IMPORTANT: call inside an existing transaction.
     */
    private function getNextEventRoundNo(int $eventYearBE): int
    {
        $eventYearBE = (int)$eventYearBE;
        if ($eventYearBE <= 0) {
            $eventYearBE = $this->computeEventYearBE(null);
        }

        $stmt = $this->pdo->prepare('
            SELECT MAX(round_no) AS max_round
            FROM event
            WHERE event_year = :y
            FOR UPDATE
        ');
        $stmt->execute([':y' => $eventYearBE]);
        $max = $stmt->fetchColumn();
        $maxNo = (is_numeric($max) ? (int)$max : 0);
        return max(0, $maxNo) + 1;
    }

    private function requireStaffAccess(): void
    {
        // 1) Token auth
        $hasToken = false;
        if (function_exists('get_bearer_token')) {
            $hasToken = (get_bearer_token() !== null);
        } else {
            $auth = (string)($_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
            $hasToken = stripos($auth, 'Bearer ') !== false;
        }

        if ($hasToken && function_exists('require_auth')) {
            require_auth($this->pdo);
            return;
        }

        // 2) dev key fallback
        if (function_exists('require_dev_staff')) {
            require_dev_staff();
            return;
        }

        fail('UNAUTHORIZED', 401, 'Unauthorized');
        exit;
    }
}

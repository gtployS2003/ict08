<?php
// backend/controllers/events.controller.php
declare(strict_types=1);

if (!function_exists('str_contains')) {
    function str_contains($haystack, $needle): bool
    {
        return $needle === '' || strpos((string) $haystack, (string) $needle) !== false;
    }
}

if (!function_exists('str_starts_with')) {
    function str_starts_with($haystack, $needle): bool
    {
        return $needle === '' || strpos((string) $haystack, (string) $needle) === 0;
    }
}

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../models/EventModel.php';
require_once __DIR__ . '/../models/EventParticipantModel.php';
require_once __DIR__ . '/../models/EventMediaModel.php';
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
    /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * GET /events/{id}/report
     * Ensure event_report exists for event, return report + pictures.
     */
    public function report(int $id): void
    {
        try {
            $me = $this->requireStaffAccess(true);

            $id = max(1, (int) $id);
            $m = new EventModel($this->pdo);
            $existing = $m->findById($id);
            if (!$existing) {
                json_response(['error' => true, 'message' => 'Event not found'], 404);
                return;
            }

            $uid = (int) ($me['user_id'] ?? 0);
            if ($uid <= 0)
                $uid = 0;

            $reportId = $this->ensureEventReport($id, $uid);

            $repStmt = $this->pdo->prepare('SELECT * FROM event_report WHERE event_report_id = :rid LIMIT 1');
            $repStmt->execute([':rid' => $reportId]);
            $report = $repStmt->fetch(PDO::FETCH_ASSOC) ?: null;

            $picStmt = $this->pdo->prepare('
                SELECT
                    event_report_picture_id AS attachment_id,
                    event_report_picture_id,
                    event_report_id,
                    filepath,
                    original_filename,
                    stored_filename,
                    file_size,
                    uploaded_by,
                    uploaded_at
                FROM event_report_picture
                WHERE event_report_id = :rid
                ORDER BY event_report_picture_id ASC
            ');
            $picStmt->execute([':rid' => $reportId]);
            $pics = $picStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

            json_response([
                'error' => false,
                'data' => [
                    'report' => $report,
                    'pictures' => $pics,
                ],
            ]);
        } catch (Throwable $e) {
            json_response(['error' => true, 'message' => 'Failed to get event report', 'detail' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /events/{id}/report/pictures
     * multipart/form-data: pictures[] (or attachments[])
     */
    public function uploadReportPictures(int $id): void
    {
        try {
            $me = $this->requireStaffAccess(true);

            $id = max(1, (int) $id);
            $m = new EventModel($this->pdo);
            $existing = $m->findById($id);
            if (!$existing) {
                json_response(['error' => true, 'message' => 'Event not found'], 404);
                return;
            }

            $uid = (int) ($me['user_id'] ?? 0);
            if ($uid <= 0)
                $uid = 0;

            $reportId = $this->ensureEventReport($id, $uid);

            $contentType = (string) ($_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '');
            $isMultipart = stripos($contentType, 'multipart/form-data') !== false;
            if (!$isMultipart) {
                json_response(['error' => true, 'message' => 'Expected multipart/form-data'], 415);
                return;
            }

            $files = $_FILES['pictures'] ?? $_FILES['attachments'] ?? null;
            if (!$files) {
                json_response(['error' => true, 'message' => 'No files uploaded (pictures[] expected)'], 422);
                return;
            }

            $flat = $this->flattenFilesArray($files);
            if (empty($flat)) {
                json_response(['error' => true, 'message' => 'No files uploaded'], 422);
                return;
            }

            foreach ($flat as $f) {
                $meta = $this->saveEventReportPictureFile($reportId, $uid, $f);
                if (!$meta)
                    continue;

                $ins = $this->pdo->prepare('
                    INSERT INTO event_report_picture (
                        event_report_id,
                        filepath,
                        original_filename,
                        stored_filename,
                        file_size,
                        uploaded_by,
                        uploaded_at
                    ) VALUES (
                        :rid,
                        :fp,
                        :orig,
                        :stored,
                        :sz,
                        :uby,
                        NOW()
                    )
                ');
                $ins->execute([
                    ':rid' => $reportId,
                    ':fp' => $meta['filepath'],
                    ':orig' => $meta['original_filename'],
                    ':stored' => $meta['stored_filename'],
                    ':sz' => (int) $meta['file_size'],
                    ':uby' => $uid,
                ]);
            }

            // return refreshed list
            $picStmt = $this->pdo->prepare('
                SELECT
                    event_report_picture_id AS attachment_id,
                    event_report_picture_id,
                    event_report_id,
                    filepath,
                    original_filename,
                    stored_filename,
                    file_size,
                    uploaded_by,
                    uploaded_at
                FROM event_report_picture
                WHERE event_report_id = :rid
                ORDER BY event_report_picture_id ASC
            ');
            $picStmt->execute([':rid' => $reportId]);
            $pics = $picStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

            json_response([
                'error' => false,
                'message' => 'Uploaded',
                'data' => [
                    'event_id' => $id,
                    'event_report_id' => $reportId,
                    'pictures' => $pics,
                ],
            ], 201);
        } catch (Throwable $e) {
            json_response(['error' => true, 'message' => 'Failed to upload pictures', 'detail' => $e->getMessage()], 500);
        }
    }

    /**
     * DELETE /events/{id}/report/pictures/{pictureId}
     */
    public function deleteReportPicture(int $id, int $pictureId): void
    {
        try {
            $this->requireStaffAccess();

            $id = max(1, (int) $id);
            $pictureId = max(1, (int) $pictureId);

            $stmt = $this->pdo->prepare('
                SELECT
                    erp.event_report_picture_id,
                    erp.filepath
                FROM event_report_picture erp
                INNER JOIN event_report er ON er.event_report_id = erp.event_report_id
                WHERE er.event_id = :eid
                  AND erp.event_report_picture_id = :pid
                LIMIT 1
            ');
            $stmt->execute([':eid' => $id, ':pid' => $pictureId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row) {
                json_response(['error' => true, 'message' => 'Picture not found'], 404);
                return;
            }

            // best-effort unlink file
            $fp = (string) ($row['filepath'] ?? '');
            $abs = $this->toPublicUploadAbsPath($fp);
            if ($abs && file_exists($abs)) {
                @unlink($abs);
            }

            $del = $this->pdo->prepare('DELETE FROM event_report_picture WHERE event_report_picture_id = :pid');
            $del->execute([':pid' => $pictureId]);

            json_response(['error' => false, 'message' => 'Deleted']);
        } catch (Throwable $e) {
            json_response(['error' => true, 'message' => 'Failed to delete picture', 'detail' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /events/{id}/media
     * Returns merged media for the event (event_media index).
     */
    public function media(int $id): void
    {
        try {
            $this->requireStaffAccess();

            $id = max(1, (int) $id);

            // ensure event exists
            $m = new EventModel($this->pdo);
            $existing = $m->findById($id);
            if (!$existing) {
                json_response(['error' => true, 'message' => 'Event not found'], 404);
                return;
            }

            $mm = new EventMediaModel($this->pdo);
            // Backfill index if missing
            $mm->ensureIndexForEvent($id);
            $rows = $mm->listByEventId($id);

            json_response(['error' => false, 'data' => $rows]);
        } catch (Throwable $e) {
            json_response(['error' => true, 'message' => 'Failed to get event media', 'detail' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /events/{id}/logs
     * Returns event_log rows for a specific event_id.
     */
    public function logs(int $id): void
    {
        try {
            $this->requireStaffAccess();

            $id = max(1, (int) $id);

            // ensure event exists
            $m = new EventModel($this->pdo);
            $existing = $m->findById($id);
            if (!$existing) {
                json_response(['error' => true, 'message' => 'Event not found'], 404);
                return;
            }

            $sql = '
                SELECT
                    el.event_log_id,
                    el.event_id,
                    el.title,
                    el.detail,
                    el.location,
                    el.note,
                    el.participant_user_ids,
                    el.updated_by,
                    u.user_role_id,
                    COALESCE(p.display_name, u.line_user_name, CONCAT("user#", el.updated_by)) AS updated_by_name
                FROM event_log el
                LEFT JOIN `user` u
                    ON u.user_id = el.updated_by
                LEFT JOIN person p
                    ON p.person_user_id = el.updated_by
                WHERE el.event_id = :eid
                ORDER BY el.event_log_id ASC
            ';

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([':eid' => $id]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

            json_response([
                'error' => false,
                'data' => $rows,
            ]);
        } catch (Throwable $e) {
            json_response(['error' => true, 'message' => 'Failed to list event logs', 'detail' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /events/table?page=&limit=&q=
     * List events for schedule/events.html table.
     */
    public function table(): void
    {
        try {
            $this->requireStaffAccess();

            $page = max(1, (int) ($_GET['page'] ?? 1));
            $limit = max(1, min(500, (int) ($_GET['limit'] ?? 200)));
            $q = trim((string) ($_GET['q'] ?? ''));

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
                    'totalPages' => (int) ceil($total / max(1, $limit)),
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

            $from = trim((string) ($_GET['from'] ?? ''));
            $to = trim((string) ($_GET['to'] ?? ''));

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
            $me = $this->requireStaffAccess(true);

            $body = read_json_body();

            $title = trim((string) ($body['title'] ?? ''));
            if ($title === '') {
                json_response(['error' => true, 'message' => 'title is required'], 422);
                return;
            }
            if (mb_strlen($title) > 255) {
                json_response(['error' => true, 'message' => 'title max length is 255'], 422);
                return;
            }

            $detail = (string) ($body['detail'] ?? '');
            $location = (string) ($body['location'] ?? '');
            $meetingLink = (string) ($body['meeting_link'] ?? '');
            $note = (string) ($body['note'] ?? '');

            $provinceId = (int) ($body['province_id'] ?? 0);
            if ($provinceId <= 0)
                $provinceId = 0;

            $startRaw = trim((string) ($body['start_datetime'] ?? $body['start_date'] ?? ''));
            $endRaw = trim((string) ($body['end_datetime'] ?? $body['end_date'] ?? ''));

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
            $participantIds = array_values(array_unique(array_filter(array_map('intval', $participantIds), function ($v) {
                return $v > 0;
            })));

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
                    json_response(['error' => true, 'message' => 'Invalid participant_user_ids (user_id not found)'], 422);
                    return;
                }
            }

            $updatedBy = (int) ($me['user_id'] ?? 0);
            if ($updatedBy <= 0 && function_exists('get_auth_user')) {
                $u = get_auth_user($this->pdo);
                if (is_array($u) && isset($u['user_id']) && is_numeric($u['user_id'])) {
                    $updatedBy = (int) $u['user_id'];
                }
            }
            // fallback dev: Bearer 123
            if ($updatedBy <= 0) {
                $auth = (string) ($_SERVER['HTTP_AUTHORIZATION'] ?? '');
                if (preg_match('/Bearer\s+(\d+)/i', $auth, $m)) {
                    $updatedBy = (int) $m[1];
                }
            }
            if ($updatedBy <= 0)
                $updatedBy = 0;

            $this->pdo->beginTransaction();

            $eventYearBE = $this->computeEventYearBE($startDt);
            // round_no will be assigned when event is finished (start from 1)
            $roundNo = 0;

            $participantIdsNorm = $participantIds;
            sort($participantIdsNorm);
            $participantUserIdsStr = implode(',', $participantIdsNorm);

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
                'participant_user_ids' => $participantUserIdsStr,
                'updated_by' => $updatedBy,
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
                    $hasNt8 = (bool) $chkNt->fetchColumn();
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

                $basePathRaw = (string) env('BASE_PATH', '/ict8');
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
                        'ok' => (bool) ($resp['ok'] ?? false),
                        'recipients' => (int) ($resp['recipients'] ?? 0),
                        'sent_line' => (int) ($resp['sent_line'] ?? 0),
                        'skipped' => (int) ($resp['skipped'] ?? 0),
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
        $eventId = max(0, (int) $eventId);
        if ($eventId <= 0)
            return '';

        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host = (string) ($_SERVER['HTTP_HOST'] ?? '');

        $basePath = env('BASE_PATH', '/ict8') ?: '/ict8';
        if ($basePath === '')
            $basePath = '/ict8';
        if ($basePath[0] !== '/')
            $basePath = '/' . $basePath;
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

            $id = max(1, (int) $id);
            $m = new EventModel($this->pdo);
            $row = $m->findById($id);
            if (!$row) {
                json_response(['error' => true, 'message' => 'Event not found'], 404);
                return;
            }

            // include participants for edit UI
            $ep = new EventParticipantModel($this->pdo);
            $participants = $ep->listByEventId($id);
            $participantUserIds = array_values(array_map(
                'intval',
                array_filter(array_column($participants, 'user_id'), function ($v) {
                    return is_numeric($v);
                })
            ));
            $row['participants'] = $participants;
            $row['participant_user_ids'] = $participantUserIds;

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

            $requestId = max(1, (int) $requestId);
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
            $me = $this->requireStaffAccess(true);

            $id = max(1, (int) $id);
            $body = read_json_body();

            $m = new EventModel($this->pdo);
            $existing = $m->findById($id);
            if (!$existing) {
                json_response(['error' => true, 'message' => 'Event not found'], 404);
                return;
            }

            $title = array_key_exists('title', $body) ? trim((string) ($body['title'] ?? '')) : trim((string) ($existing['title'] ?? ''));
            if ($title === '') {
                json_response(['error' => true, 'message' => 'title is required'], 422);
                return;
            }
            if (mb_strlen($title) > 255) {
                json_response(['error' => true, 'message' => 'title max length is 255'], 422);
                return;
            }

            $start = array_key_exists('start_datetime', $body) ? trim((string) ($body['start_datetime'] ?? '')) : (string) ($existing['start_datetime'] ?? '');
            $end = array_key_exists('end_datetime', $body) ? trim((string) ($body['end_datetime'] ?? '')) : (string) ($existing['end_datetime'] ?? '');

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

            $provinceId = array_key_exists('province_id', $body) ? (int) ($body['province_id'] ?? 0) : (int) ($existing['province_id'] ?? 0);
            if ($provinceId <= 0)
                $provinceId = null;

            if ($provinceId !== null) {
                $chk = $this->pdo->prepare('SELECT 1 FROM province WHERE province_id = :id LIMIT 1');
                $chk->execute([':id' => $provinceId]);
                if (!$chk->fetchColumn()) {
                    json_response(['error' => true, 'message' => 'Invalid province_id'], 422);
                    return;
                }
            }

            $eventStatusId = array_key_exists('event_status_id', $body) ? (int) ($body['event_status_id'] ?? 0) : (int) ($existing['event_status_id'] ?? 0);
            if ($eventStatusId <= 0)
                $eventStatusId = null;

            // Validate event_status_id belongs to request_type (if the event is tied to a request)
            $reqId = (int) ($existing['request_id'] ?? 0);
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

            // Conference meeting_link notification (type 10): detect when meeting_link is newly added.
            $requestTypeId = null;
            if ($reqId > 0) {
                try {
                    $q = $this->pdo->prepare('SELECT request_type FROM request WHERE request_id = :rid LIMIT 1');
                    $q->execute([':rid' => $reqId]);
                    $rt = $q->fetchColumn();
                    $requestTypeId = ($rt !== false && $rt !== null && is_numeric($rt)) ? (int) $rt : null;
                } catch (Throwable $e) {
                    // best effort
                }
            }

            $meetingLinkPayload = array_key_exists('meeting_link', $body);
            $prevMeetingLink = trim((string) ($existing['meeting_link'] ?? ''));
            $newMeetingLink = $meetingLinkPayload ? trim((string) ($body['meeting_link'] ?? '')) : '';
            $isConferenceRequest = ($reqId > 0 && (int) ($requestTypeId ?? 0) === 2);
            $meetingLinkJustAdded = ($isConferenceRequest && $meetingLinkPayload && $prevMeetingLink === '' && $newMeetingLink !== '');

            // If the only change is adding meeting_link, avoid sending duplicate "event_edit" notifications.
            $shouldSendEventEditNotif = true;
            if ($meetingLinkJustAdded) {
                $otherKeys = ['title', 'detail', 'location', 'note', 'province_id', 'event_status_id', 'start_datetime', 'end_datetime', 'participant_user_ids', 'participants'];
                $hasOther = false;
                foreach ($otherKeys as $k) {
                    if (array_key_exists($k, $body)) {
                        $hasOther = true;
                        break;
                    }
                }
                if (!$hasOther) {
                    $shouldSendEventEditNotif = false;
                }
            }

            $data = [
                'title' => $title,
                'detail' => array_key_exists('detail', $body) ? (string) ($body['detail'] ?? '') : (string) ($existing['detail'] ?? ''),
                'location' => array_key_exists('location', $body) ? (string) ($body['location'] ?? '') : (string) ($existing['location'] ?? ''),
                'province_id' => $provinceId,
                'meeting_link' => array_key_exists('meeting_link', $body) ? (string) ($body['meeting_link'] ?? '') : (string) ($existing['meeting_link'] ?? ''),
                'note' => array_key_exists('note', $body) ? (string) ($body['note'] ?? '') : (string) ($existing['note'] ?? ''),
                'event_status_id' => $eventStatusId,
                'start_datetime' => $startVal,
                'end_datetime' => $endVal,
            ];

            // For event_log snapshot on update
            $updatedBy = (int) ($me['user_id'] ?? 0);
            if ($updatedBy <= 0 && function_exists('get_auth_user')) {
                $u = get_auth_user($this->pdo);
                if (is_array($u) && isset($u['user_id']) && is_numeric($u['user_id'])) {
                    $updatedBy = (int) $u['user_id'];
                }
            }
            // fallback dev: Bearer 123
            if ($updatedBy <= 0) {
                $auth = (string) ($_SERVER['HTTP_AUTHORIZATION'] ?? '');
                if (preg_match('/Bearer\s+(\d+)/i', $auth, $m)) {
                    $updatedBy = (int) $m[1];
                }
            }
            if ($updatedBy <= 0)
                $updatedBy = 0;
            $data['updated_by'] = $updatedBy;

            // participants (optional): replace existing rows
            $participantIds = null;
            $prevActiveParticipantIds = [];
            $addedParticipantIds = [];
            $removedParticipantIds = [];
            if (array_key_exists('participant_user_ids', $body) || array_key_exists('participants', $body)) {
                $raw = $body['participant_user_ids'] ?? $body['participants'] ?? [];
                if (!is_array($raw)) {
                    json_response(['error' => true, 'message' => 'participant_user_ids must be an array'], 422);
                    return;
                }
                $participantIds = array_values(array_unique(array_filter(array_map('intval', $raw), function ($v) {
                    return $v > 0;
                })));

                // Snapshot current active participants for diff (added/removed)
                $epPrev = new EventParticipantModel($this->pdo);
                $prevRows = $epPrev->listByEventId($id);
                $prevActiveParticipantIds = array_values(array_unique(array_map(
                    'intval',
                    array_filter(array_column($prevRows, 'user_id'), function ($v) {
                        return is_numeric($v);
                    })
                )));

                $addedParticipantIds = array_values(array_diff($participantIds, $prevActiveParticipantIds));
                $removedParticipantIds = array_values(array_diff($prevActiveParticipantIds, $participantIds));

                // Provide participant snapshot to EventModel for event_log
                $p2 = $participantIds;
                sort($p2);
                $data['participant_user_ids'] = implode(',', $p2);
            }

            $this->pdo->beginTransaction();

            $eventChanged = $m->update($id, $data);

            // If status transitions to "เสร็จสิ้น", then:
            // - assign round_no (starting at 1) if not assigned yet
            // - ensure event_report exists and mark submitted_by/submitted_at
            $finalizeMeta = null;
            $prevStatusId = isset($existing['event_status_id']) && is_numeric($existing['event_status_id']) ? (int) $existing['event_status_id'] : 0;
            $prevIsFinished = $this->isFinishedStatusId($prevStatusId > 0 ? $prevStatusId : null);
            $newIsFinished = $this->isFinishedStatusId($eventStatusId);
            $existingRoundNo = isset($existing['round_no']) && is_numeric($existing['round_no']) ? (int) $existing['round_no'] : 0;
            $existingEventYear = isset($existing['event_year']) && is_numeric($existing['event_year']) ? (int) $existing['event_year'] : 0;

            // Assign/refresh round_no when status becomes finished.
            // - If transitioning to finished: always (re)assign round_no even if it already exists.
            //   (Supports legacy events that were assigned on create.)
            // - If already finished but round_no is missing: assign.
            $shouldAssignRoundNo = ($newIsFinished && !$prevIsFinished) || ($newIsFinished && $existingRoundNo <= 0);

            if ($shouldAssignRoundNo) {
                // compute event_year if missing
                $eventYearBE = $existingEventYear;
                if ($eventYearBE <= 0) {
                    $eventYearBE = $this->computeEventYearBE($startVal ?? (string) ($existing['start_datetime'] ?? ''));
                }

                // Always assign a new round number when finishing (or if missing while finished).
                $roundNo = $this->getNextEventRoundNo($eventYearBE);

                $stmtAssign = $this->pdo->prepare('
                    UPDATE event
                    SET
                        round_no = :r,
                        event_year = CASE WHEN event_year IS NULL OR event_year = 0 THEN :y ELSE event_year END,
                        updated_at = NOW()
                    WHERE event_id = :id
                    LIMIT 1
                ');
                $stmtAssign->execute([
                    ':r' => $roundNo,
                    ':y' => $eventYearBE,
                    ':id' => $id,
                ]);

                // ensure event_report exists
                $rid = $this->ensureEventReport($id, $updatedBy);

                $finalizeMeta = [
                    'event_year' => $eventYearBE,
                    'round_no' => $roundNo,
                    'event_report_id' => $rid,
                ];
            }

            // Pre-build notification messages (so they are consistent even if title changes)
            $eventTitleForMsg = $title;
            $eventUrl = $this->buildEventEditUrl($id);
            $eventLinkLine = $eventUrl !== '' ? ("\nดูรายละเอียด: " . $eventUrl) : '';

            $dispatchJobs = [];
            $notificationIds = [];

            if ($participantIds !== null) {
                // Validate user ids (internal: role 2,3 only; request-based: any existing user)
                if (!empty($participantIds)) {
                    $in = implode(',', array_fill(0, count($participantIds), '?'));

                    $reqId = (int) ($existing['request_id'] ?? 0);
                    $isInternal = ($reqId <= 0);

                    $sql = $isInternal
                        ? ("SELECT user_id FROM `user` WHERE user_id IN ($in) AND user_role_id IN (2,3)")
                        : ("SELECT user_id FROM `user` WHERE user_id IN ($in)");

                    $stmt = $this->pdo->prepare($sql);
                    $stmt->execute($participantIds);
                    $found = $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
                    $foundIds = array_map('intval', $found);

                    sort($foundIds);
                    $expect = $participantIds;
                    sort($expect);

                    if ($foundIds !== $expect) {
                        $this->pdo->rollBack();
                        json_response(['error' => true, 'message' => 'Invalid participant_user_ids (user_id not found)'], 422);
                        return;
                    }
                }

                // Sync participants by toggling is_active instead of deleting rows.
                $epModel = new EventParticipantModel($this->pdo);
                $epModel->syncByEventId($id, $participantIds, 1);

                $participantsChanged = (!empty($addedParticipantIds) || !empty($removedParticipantIds));

                // If only participants changed (event row unchanged), still write an event_log snapshot.
                if ($participantsChanged && $eventChanged !== true) {
                    $stmtCur = $this->pdo->prepare('SELECT title, detail, location, note FROM event WHERE event_id = :id LIMIT 1');
                    $stmtCur->bindValue(':id', $id, PDO::PARAM_INT);
                    $stmtCur->execute();
                    $cur = $stmtCur->fetch(PDO::FETCH_ASSOC) ?: [];

                    $titleLog = trim((string) ($cur['title'] ?? ''));
                    if (mb_strlen($titleLog) > 255) {
                        $titleLog = mb_substr($titleLog, 0, 255);
                    }

                    $stmtLog = $this->pdo->prepare('
                        INSERT INTO event_log (
                            event_id,
                            title,
                            detail,
                            location,
                            note,
                            participant_user_ids,
                            updated_by
                        ) VALUES (
                            :event_id,
                            :title,
                            :detail,
                            :location,
                            :note,
                            :participant_user_ids,
                            :updated_by
                        )
                    ');
                    $stmtLog->execute([
                        ':event_id' => $id,
                        ':title' => $titleLog,
                        ':detail' => (string) ($cur['detail'] ?? ''),
                        ':location' => (string) ($cur['location'] ?? ''),
                        ':note' => (string) ($cur['note'] ?? ''),
                        ':participant_user_ids' => (string) ($data['participant_user_ids'] ?? ''),
                        ':updated_by' => $updatedBy,
                    ]);
                }

                // Case (1): participants added -> notification_type_id=8, push LINE only to newly added userIds.
                if (!empty($addedParticipantIds)) {
                    // Ensure notification_type_id=8 exists (best effort)
                    try {
                        $chkNt = $this->pdo->prepare('SELECT 1 FROM notification_type WHERE notification_type_id = 8 LIMIT 1');
                        $chkNt->execute();
                        $hasNt8 = (bool) $chkNt->fetchColumn();
                        if (!$hasNt8) {
                            $insNt = $this->pdo->prepare('
                                INSERT INTO notification_type (notification_type_id, notification_type, meaning)
                                VALUES (8, :t, :m)
                            ');
                            $insNt->execute([
                                ':t' => 'event_participation',
                                ':m' => 'การมีส่วนร่วมในกิจกรรม',
                            ]);
                        }
                    } catch (Throwable $e) {
                        error_log('[EVENTS] ensure notification_type 8 failed: ' . $e->getMessage());
                    }

                    // DB notification message (general)
                    $msg = "มีการเพิ่มผู้เข้าร่วมกิจกรรม: {$eventTitleForMsg}{$eventLinkLine}";
                    try {
                        $notifModel = new NotificationModel($this->pdo);
                        $notificationIds[] = $notifModel->createEventNotification([
                            'event_id' => $id,
                            'notification_type_id' => 8,
                            'message' => $msg,
                        ]);
                    } catch (Throwable $e) {
                        error_log('[EVENTS] create type8 notification failed: ' . $e->getMessage());
                    }

                    // LINE dispatch message: role-based
                    $addedStaffIds = [];
                    $addedRole1Ids = [];
                    try {
                        $in = implode(',', array_fill(0, count($addedParticipantIds), '?'));
                        $stmtRole = $this->pdo->prepare("SELECT user_id, user_role_id FROM `user` WHERE user_id IN ($in)");
                        $stmtRole->execute($addedParticipantIds);
                        $rows = $stmtRole->fetchAll(PDO::FETCH_ASSOC) ?: [];
                        foreach ($rows as $r) {
                            $uid = (int) ($r['user_id'] ?? 0);
                            $rid = (int) ($r['user_role_id'] ?? 1);
                            if ($uid <= 0)
                                continue;
                            if (in_array($rid, [2, 3], true))
                                $addedStaffIds[] = $uid;
                            else
                                $addedRole1Ids[] = $uid;
                        }
                    } catch (Throwable $e) {
                        // fallback: treat all as staff-like
                        $addedStaffIds = $addedParticipantIds;
                    }

                    $addedStaffIds = array_values(array_unique(array_map('intval', $addedStaffIds)));
                    $addedRole1Ids = array_values(array_unique(array_map('intval', $addedRole1Ids)));

                    if (!empty($addedStaffIds)) {
                        $msgStaff = "คุณถูกเพิ่มเป็นผู้เข้าร่วมงาน: {$eventTitleForMsg}";
                        $msgStaff .= $eventUrl !== ''
                            ? ("\nแก้ไขรายละเอียดงานได้ที่: {$eventUrl}")
                            : $eventLinkLine;
                        $dispatchJobs[] = ['user_ids' => $addedStaffIds, 'message' => $msgStaff];
                    }

                    if (!empty($addedRole1Ids)) {
                        $msgUser = "คุณถูกเพิ่มให้เข้าร่วมกิจกรรม: {$eventTitleForMsg}{$eventLinkLine}";
                        $dispatchJobs[] = ['user_ids' => $addedRole1Ids, 'message' => $msgUser];
                    }
                }
            }

            // Case (conference): meeting_link added -> notification_type_id=10, push LINE to participants.
            if ($meetingLinkJustAdded) {
                // Determine recipients: current active participant list
                $recipients = [];
                if ($participantIds !== null) {
                    $recipients = $participantIds;
                } else {
                    $epNow = new EventParticipantModel($this->pdo);
                    $nowRows = $epNow->listByEventId($id);
                    $recipients = array_values(array_unique(array_map(
                        'intval',
                        array_filter(array_column($nowRows, 'user_id'), function ($v) {
                            return is_numeric($v);
                        })
                    )));
                }

                // Exclude editor
                $recipients = array_values(array_filter($recipients, function ($uid) use ($updatedBy) {
                    return (int) $uid > 0 && (int) $uid !== (int) $updatedBy;
                }));

                // Ensure notification_type_id=10 exists (best effort)
                try {
                    $chkNt = $this->pdo->prepare('SELECT 1 FROM notification_type WHERE notification_type_id = 10 LIMIT 1');
                    $chkNt->execute();
                    $hasNt10 = (bool) $chkNt->fetchColumn();
                    if (!$hasNt10) {
                        $insNt = $this->pdo->prepare('
                            INSERT INTO notification_type (notification_type_id, notification_type, meaning)
                            VALUES (10, :t, :m)
                        ');
                        $insNt->execute([
                            ':t' => 'conference_meeting_link',
                            ':m' => 'ได้รับลิงก์เข้าร่วมประชุม',
                        ]);
                    }
                } catch (Throwable $e) {
                    error_log('[EVENTS] ensure notification_type 10 failed: ' . $e->getMessage());
                }

                $msg = "ได้รับ link เข้าร่วมประชุม: {$eventTitleForMsg}\nลิงก์: {$newMeetingLink}{$eventLinkLine}";
                try {
                    $notifModel = new NotificationModel($this->pdo);
                    $notificationIds[] = $notifModel->createEventNotification([
                        'event_id' => $id,
                        'notification_type_id' => 10,
                        'message' => $msg,
                    ]);
                } catch (Throwable $e) {
                    error_log('[EVENTS] create type10 notification failed: ' . $e->getMessage());
                }

                if (!empty($recipients)) {
                    $dispatchJobs[] = ['user_ids' => $recipients, 'message' => $msg];
                }
            }

            // Case (2): event detail edited -> notification_type_id=9, push LINE to active participants.
            // Trigger only when event row actually changed.
            if ($eventChanged === true && $shouldSendEventEditNotif) {
                // Determine recipients: current active participant list
                $recipients = [];
                if ($participantIds !== null) {
                    $recipients = $participantIds;
                } else {
                    // no participant payload: use current active participants from DB
                    $epNow = new EventParticipantModel($this->pdo);
                    $nowRows = $epNow->listByEventId($id);
                    $recipients = array_values(array_unique(array_map(
                        'intval',
                        array_filter(array_column($nowRows, 'user_id'), function ($v) {
                            return is_numeric($v);
                        })
                    )));
                }

                // Exclude editor (optional, but reduces noise)
                $recipients = array_values(array_filter($recipients, function ($uid) use ($updatedBy) {
                    return (int) $uid > 0 && (int) $uid !== (int) $updatedBy;
                }));

                // Ensure notification_type_id=9 exists (best effort)
                try {
                    $chkNt = $this->pdo->prepare('SELECT 1 FROM notification_type WHERE notification_type_id = 9 LIMIT 1');
                    $chkNt->execute();
                    $hasNt9 = (bool) $chkNt->fetchColumn();
                    if (!$hasNt9) {
                        $insNt = $this->pdo->prepare('
                            INSERT INTO notification_type (notification_type_id, notification_type, meaning)
                            VALUES (9, :t, :m)
                        ');
                        $insNt->execute([
                            ':t' => 'event_edit',
                            ':m' => 'มีการแก้ไขรายละเอียดกิจกรรม',
                        ]);
                    }
                } catch (Throwable $e) {
                    error_log('[EVENTS] ensure notification_type 9 failed: ' . $e->getMessage());
                }

                $msg = "มีการแก้ไขรายละเอียดกิจกรรม: {$eventTitleForMsg}{$eventLinkLine}";
                try {
                    $notifModel = new NotificationModel($this->pdo);
                    $notificationIds[] = $notifModel->createEventNotification([
                        'event_id' => $id,
                        'notification_type_id' => 9,
                        'message' => $msg,
                    ]);
                } catch (Throwable $e) {
                    error_log('[EVENTS] create type9 notification failed: ' . $e->getMessage());
                }

                if (!empty($recipients)) {
                    $dispatchJobs[] = ['user_ids' => $recipients, 'message' => $msg];
                }
            }

            $this->pdo->commit();

            // Dispatch LINE notifications (best effort) after commit
            $dispatchResults = [];
            if (!empty($dispatchJobs)) {
                try {
                    $svc = new NotificationService($this->pdo);
                    foreach ($dispatchJobs as $job) {
                        $uids = $job['user_ids'] ?? [];
                        $msg = (string) ($job['message'] ?? '');
                        if (!is_array($uids) || trim($msg) === '')
                            continue;
                        $resp = $svc->dispatchToUsers($uids, $msg);

                        // Keep lightweight debug info for API response when APP_DEBUG=1
                        $dispatchResults[] = [
                            'recipients' => (int) ($resp['recipients'] ?? 0),
                            'sent_line' => (int) ($resp['sent_line'] ?? 0),
                            'skipped' => (int) ($resp['skipped'] ?? 0),
                            'errors' => $resp['errors'] ?? [],
                        ];

                        // Log errors for easier debugging (similar to RequestsController)
                        if (($resp['ok'] ?? false) !== true) {
                            error_log('[EVENTS] dispatchToUsers not ok: ' . json_encode($resp, JSON_UNESCAPED_UNICODE));
                        } elseif (!empty($resp['errors'])) {
                            error_log('[EVENTS] dispatchToUsers errors: ' . json_encode($resp, JSON_UNESCAPED_UNICODE));
                        }
                    }
                } catch (Throwable $e) {
                    error_log('[EVENTS] dispatchToUsers failed: ' . $e->getMessage());
                }
            }

            // return fresh row
            $fresh = $m->findById($id);
            if ($fresh) {
                $ep = new EventParticipantModel($this->pdo);
                $participants = $ep->listByEventId($id);
                $participantUserIds = array_values(array_map(
                    'intval',
                    array_filter(array_column($participants, 'user_id'), function ($v) {
                        return is_numeric($v);
                    })
                ));
                $fresh['participants'] = $participants;
                $fresh['participant_user_ids'] = $participantUserIds;
            }
            json_response([
                'error' => false,
                'message' => ($eventChanged === true || !empty($addedParticipantIds) || !empty($removedParticipantIds)) ? 'Updated' : 'No changes',
                'data' => $fresh ?? ['event_id' => $id],
                // Helpful for debugging why LINE didn't send (only when APP_DEBUG=1)
                'dispatch' => (env('APP_DEBUG') === '1' ? $dispatchResults : null),
                'finalize' => (env('APP_DEBUG') === '1' ? $finalizeMeta : null),
            ]);
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
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

            $id = max(1, (int) $id);
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

            // event_report_picture + event_report (best effort)
            try {
                $stmt = $this->pdo->prepare('SELECT event_report_id FROM event_report WHERE event_id = :eid');
                $stmt->execute([':eid' => $id]);
                $repIds = $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
                foreach ($repIds as $rid) {
                    $rid = (int) $rid;
                    if ($rid <= 0)
                        continue;

                    try {
                        $q = $this->pdo->prepare('SELECT filepath FROM event_report_picture WHERE event_report_id = :rid');
                        $q->execute([':rid' => $rid]);
                        $fps = $q->fetchAll(PDO::FETCH_COLUMN) ?: [];
                        foreach ($fps as $fp) {
                            $abs = $this->toPublicUploadAbsPath((string) $fp);
                            if ($abs && file_exists($abs)) {
                                @unlink($abs);
                            }
                        }
                    } catch (Throwable $e) {
                        // ignore
                    }

                    try {
                        $d1 = $this->pdo->prepare('DELETE FROM event_report_picture WHERE event_report_id = :rid');
                        $d1->execute([':rid' => $rid]);
                    } catch (Throwable $e) {
                        error_log('[EVENTS] delete report pictures failed: ' . $e->getMessage());
                    }

                    try {
                        $d2 = $this->pdo->prepare('DELETE FROM event_report WHERE event_report_id = :rid');
                        $d2->execute([':rid' => $rid]);
                    } catch (Throwable $e) {
                        error_log('[EVENTS] delete report failed: ' . $e->getMessage());
                    }
                }
            } catch (Throwable $e) {
                error_log('[EVENTS] delete report chain failed: ' . $e->getMessage());
            }

            // event_log (best effort)
            try {
                $stmt = $this->pdo->prepare('DELETE FROM event_log WHERE event_id = :eid');
                $stmt->execute([':eid' => $id]);
            } catch (Throwable $e) {
                error_log('[EVENTS] delete event_log failed: ' . $e->getMessage());
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
        return (bool) preg_match('/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/', $v);
    }

    private function isDate(string $v): bool
    {
        return (bool) preg_match('/^\d{4}-\d{2}-\d{2}$/', $v);
    }

    /**
     * Accepts YYYY-MM-DD or YYYY-MM-DD HH:MM:SS.
     * If date-only, appends 00:00:00 for start or 23:59:59 for end.
     */
    private function normalizeToDateTime(string $v, bool $isEnd): ?string
    {
        $v = trim($v);
        if ($v === '')
            return null;

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
                $y = (int) $dt->format('Y');
            } catch (Throwable $e) {
                $y = 0;
            }
        }

        if ($y <= 0) {
            $y = (int) date('Y');
        }

        return $y + 543;
    }

    /**
     * Get next round number for a given event year (B.E.).
     * IMPORTANT: call inside an existing transaction.
     */
    private function getNextEventRoundNo(int $eventYearBE): int
    {
        $eventYearBE = (int) $eventYearBE;
        if ($eventYearBE <= 0) {
            $eventYearBE = $this->computeEventYearBE(null);
        }

        $stmt = $this->pdo->prepare('
            SELECT MAX(round_no) AS max_round
            FROM event
            WHERE event_year = :y
              AND round_no > 0
            FOR UPDATE
        ');
        $stmt->execute([':y' => $eventYearBE]);
        $max = $stmt->fetchColumn();
        $maxNo = (is_numeric($max) ? (int) $max : 0);
        return max(0, $maxNo) + 1;
    }

    private function isFinishedStatusId(?int $eventStatusId): bool
    {
        $eventStatusId = $eventStatusId !== null ? (int) $eventStatusId : 0;
        if ($eventStatusId <= 0)
            return false;

        try {
            $stmt = $this->pdo->prepare('SELECT status_code, status_name FROM event_status WHERE event_status_id = :id LIMIT 1');
            $stmt->execute([':id' => $eventStatusId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
            $code = strtoupper(trim((string) ($row['status_code'] ?? '')));
            $name = trim((string) ($row['status_name'] ?? ''));

            if ($name !== '' && mb_strpos($name, 'เสร็จสิ้น') !== false)
                return true;
            if ($code !== '') {
                if (str_contains($code, 'DONE') || str_contains($code, 'FINISH') || str_contains($code, 'FINISHED') || str_contains($code, 'COMPLETE')) {
                    return true;
                }
            }
        } catch (Throwable $e) {
            // best effort
        }

        return false;
    }

    /**
     * Ensure a single event_report exists for the event.
     */
    private function ensureEventReport(int $eventId, int $userId): int
    {
        $eventId = max(1, (int) $eventId);
        $userId = max(0, (int) $userId);

        $stmt = $this->pdo->prepare('SELECT event_report_id, submitted_by_id, submitted_at FROM event_report WHERE event_id = :eid LIMIT 1');
        $stmt->execute([':eid' => $eventId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        if ($row && is_numeric($row['event_report_id'] ?? null) && (int) $row['event_report_id'] > 0) {
            $rid = (int) $row['event_report_id'];

            // If report already exists (e.g. created for internal picture uploads),
            // but submission fields are missing, set them when finishing.
            $submittedBy = isset($row['submitted_by_id']) && is_numeric($row['submitted_by_id']) ? (int) $row['submitted_by_id'] : 0;
            $submittedAt = trim((string) ($row['submitted_at'] ?? ''));

            if ($userId > 0 && ($submittedBy <= 0 || $submittedAt === '')) {
                try {
                    $up = $this->pdo->prepare('
                        UPDATE event_report
                        SET
                            submitted_by_id = CASE WHEN submitted_by_id IS NULL OR submitted_by_id = 0 THEN :sid ELSE submitted_by_id END,
                            submitted_at = CASE WHEN submitted_at IS NULL THEN NOW() ELSE submitted_at END,
                            updated_at = NOW()
                        WHERE event_report_id = :rid
                        LIMIT 1
                    ');
                    $up->execute([':sid' => $userId, ':rid' => $rid]);
                } catch (Throwable $e) {
                    // best effort
                }
            }

            return $rid;
        }

        $ins = $this->pdo->prepare('
            INSERT INTO event_report (
                event_id,
                summary_text,
                submitted_by_id,
                created_at,
                submitted_at
            ) VALUES (
                :eid,
                :sum,
                :sid,
                NOW(),
                NOW()
            )
        ');
        $ins->execute([
            ':eid' => $eventId,
            ':sum' => '',
            ':sid' => $userId,
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    /**
     * Flatten $_FILES multi structure to list of file entries.
     * @return array<int,array<string,mixed>>
     */
    private function flattenFilesArray(array $files): array
    {
        // single upload
        if (!isset($files['name']) || !is_array($files['name'])) {
            return [$files];
        }

        $out = [];
        $count = count($files['name']);
        for ($i = 0; $i < $count; $i++) {
            $out[] = [
                'name' => $files['name'][$i] ?? null,
                'type' => $files['type'][$i] ?? null,
                'tmp_name' => $files['tmp_name'][$i] ?? null,
                'error' => $files['error'][$i] ?? null,
                'size' => $files['size'][$i] ?? null,
            ];
        }
        return $out;
    }

    private function saveEventReportPictureFile(int $reportId, int $uploadedBy, array $file): ?array
    {
        $tmp = $file['tmp_name'] ?? '';
        $original = (string) ($file['name'] ?? 'file');
        $size = (int) ($file['size'] ?? 0);
        $err = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);

        if ($err !== UPLOAD_ERR_OK) {
            throw new RuntimeException('Upload error code: ' . $err);
        }

        if ($tmp === '' || !is_uploaded_file($tmp)) {
            throw new RuntimeException('Invalid uploaded temp file');
        }

        $ext = strtolower(pathinfo($original, PATHINFO_EXTENSION));
        $safeExt = preg_match('/^[a-z0-9]{1,10}$/', $ext) ? $ext : 'bin';

        $stamp = date('Ymd_His');
        $rand = bin2hex(random_bytes(3));
        $stored = "er_{$reportId}_u{$uploadedBy}_{$stamp}_{$rand}." . $safeExt;

        $dir = __DIR__ . '/../public/uploads/event_reports';
        if (!is_dir($dir)) {
            if (!@mkdir($dir, 0775, true) && !is_dir($dir)) {
                throw new RuntimeException('Cannot create directory: ' . $dir);
            }
        }
        if (!is_writable($dir)) {
            throw new RuntimeException('Upload directory not writable: ' . $dir);
        }

        $dest = $dir . '/' . $stored;
        if (!@move_uploaded_file($tmp, $dest)) {
            throw new RuntimeException('move_uploaded_file failed to: ' . $dest);
        }

        $filepath = 'uploads/event_reports/' . $stored;

        return [
            'filepath' => $filepath,
            'original_filename' => $original,
            'stored_filename' => $stored,
            'file_size' => $size,
        ];
    }

    private function toPublicUploadAbsPath(string $filepath): ?string
    {
        $fp = trim($filepath);
        if ($fp === '')
            return null;
        $fp = ltrim($fp, '/');
        if (!str_starts_with($fp, 'uploads/'))
            return null;
        if (str_contains($fp, '..'))
            return null;
        return __DIR__ . '/../public/' . $fp;
    }

    /**
     * Used by staff/admin endpoints: supports both Bearer token and dev API key (APP_ENV=dev).
     * @return array<string,mixed>|null user payload if using token
     */
    private function requireStaffAccess(bool $returnUser = false): ?array
    {
        // 1) Token auth
        $hasToken = false;
        if (function_exists('get_bearer_token')) {
            $hasToken = (get_bearer_token() !== null);
        } else {
            $auth = (string) ($_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
            $hasToken = stripos($auth, 'Bearer ') !== false;
        }

        if ($hasToken && function_exists('require_auth')) {
            $u = require_auth($this->pdo);
            return $returnUser ? $u : $u;
        }

        // 2) dev key fallback
        if (function_exists('require_dev_staff')) {
            require_dev_staff();
            return null;
        }

        // 3) fallback: require_auth if available
        if (function_exists('require_auth')) {
            $u = require_auth($this->pdo);
            return $returnUser ? $u : $u;
        }

        fail('UNAUTHORIZED', 401, 'Unauthorized');
        exit;
    }
}
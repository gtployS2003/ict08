<?php
// backend/controllers/events.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../models/EventModel.php';

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

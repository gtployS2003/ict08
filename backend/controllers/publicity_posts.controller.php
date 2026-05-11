<?php
// backend/controllers/publicity_posts.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../models/EventModel.php';
require_once __DIR__ . '/../models/PublicityPostModel.php';
require_once __DIR__ . '/../models/EventMediaModel.php';
require_once __DIR__ . '/../models/PublicityPostMediaModel.php';
require_once __DIR__ . '/../models/ActivityModel.php';

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

final class PublicityPostsController
{
        /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * POST /publicity-posts/{eventId}/publish
     * Publish publicity_post to website by inserting into activity table.
     */
    public function publish(int $eventId): void
    {
        try {
            $this->requireStaffAccess();

            $eventId = max(1, (int)$eventId);
            $pm = new PublicityPostModel($this->pdo);
            $post = $pm->findByEventId($eventId);
            if (!$post) {
                json_response(['error' => true, 'message' => 'Publicity post not found'], 404);
                return;
            }

            $postId = (int)($post['publicity_post_id'] ?? 0);
            if ($postId <= 0) {
                json_response(['error' => true, 'message' => 'Invalid publicity_post_id'], 500);
                return;
            }

            $am = new ActivityModel($this->pdo);
            $res = $am->publishByPublicityPostId($postId);

            json_response([
                'error' => false,
                'data' => [
                    'event_id' => $eventId,
                    'publicity_post_id' => $postId,
                    'activity_id' => (int)($res['activity_id'] ?? 0),
                    'already_published' => (bool)($res['already_published'] ?? false),
                ],
            ]);
        } catch (Throwable $e) {
            json_response(['error' => true, 'message' => 'Failed to publish activity', 'detail' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /publicity-posts?page=&limit=&q=
     */
    public function index(): void
    {
        try {
            $this->requireStaffAccess();

            $page = max(1, (int)($_GET['page'] ?? 1));
            $limit = max(1, min(500, (int)($_GET['limit'] ?? 200)));
            $q = trim((string)($_GET['q'] ?? ''));

            $m = new PublicityPostModel($this->pdo);
            $rows = $m->list($q, $page, $limit);
            $total = $m->count($q);

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
            json_response(['error' => true, 'message' => 'Failed to list publicity posts', 'detail' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /publicity-posts/{eventId}
     */
    public function show(int $eventId): void
    {
        try {
            $this->requireStaffAccess();

            $eventId = max(1, (int)$eventId);
            $m = new PublicityPostModel($this->pdo);
            $row = $m->findByEventId($eventId);
            if (!$row) {
                json_response(['error' => true, 'message' => 'Publicity post not found'], 404);
                return;
            }

            json_response(['error' => false, 'data' => $row]);
        } catch (Throwable $e) {
            json_response(['error' => true, 'message' => 'Failed to get publicity post', 'detail' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /publicity-posts
     * body: { event_id }
     */
    public function create(): void
    {
        try {
            $me = $this->requireStaffAccess(true);

            $body = read_json_body();
            $eventId = (int)($body['event_id'] ?? 0);
            if ($eventId <= 0) {
                json_response(['error' => true, 'message' => 'event_id is required'], 422);
                return;
            }

            $createBy = (int)($me['user_id'] ?? 0);
            if ($createBy <= 0) $createBy = 0;

            $m = new PublicityPostModel($this->pdo);

            try {
                $row = $m->createFromEvent($eventId, $createBy);
            } catch (RuntimeException $re) {
                $code = $re->getMessage();
                if ($code === 'PUBLICITY_POST_ALREADY_EXISTS') {
                    json_response(['error' => true, 'message' => 'Publicity post already exists for this event'], 409);
                    return;
                }
                if ($code === 'EVENT_NOT_FOUND') {
                    json_response(['error' => true, 'message' => 'Event not found'], 404);
                    return;
                }
                throw $re;
            }

            // Ensure event_media is populated for this event (used by poster editor)
            try {
                $mm = new EventMediaModel($this->pdo);
                $mm->ensureIndexForEvent($eventId);
            } catch (Throwable $e) {
                // Don't fail creation if media indexing fails; caller can retry via /events/{id}/media
            }

            json_response(['error' => false, 'data' => $row], 201);
        } catch (Throwable $e) {
            json_response(['error' => true, 'message' => 'Failed to create publicity post', 'detail' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /publicity-posts/direct-event
     * multipart/form-data:
     * - title, detail?, location?, province_id?, start_datetime?, end_datetime?, request_type_id?
     * - pictures[] (required)
     *
     * Creates an internal event that is already finished, its event_report,
     * uploaded event_report_picture rows, event_media index, publicity_post,
     * and publicity_post_media selection in one workflow.
     */
    public function createDirectEvent(): void
    {
        $savedAbsPaths = [];

        try {
            $me = $this->requireStaffAccess(true);

            $contentType = (string)($_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '');
            if (stripos($contentType, 'multipart/form-data') === false) {
                json_response(['error' => true, 'message' => 'Expected multipart/form-data'], 415);
                return;
            }

            $title = trim((string)($_POST['title'] ?? ''));
            if ($title === '') {
                json_response(['error' => true, 'message' => 'title is required'], 422);
                return;
            }
            if (function_exists('mb_strlen') && mb_strlen($title) > 255) {
                json_response(['error' => true, 'message' => 'title max length is 255'], 422);
                return;
            }

            $files = $_FILES['pictures'] ?? $_FILES['attachments'] ?? null;
            if (!$files) {
                json_response(['error' => true, 'message' => 'No files uploaded (pictures[] expected)'], 422);
                return;
            }

            $flatFiles = array_values(array_filter($this->flattenFilesArray($files), function ($f) {
                return (int)($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE;
            }));
            if (empty($flatFiles)) {
                json_response(['error' => true, 'message' => 'No files uploaded'], 422);
                return;
            }

            $uid = (int)($me['user_id'] ?? 0);
            if ($uid <= 0) $uid = 0;

            $detail = (string)($_POST['detail'] ?? '');
            $location = trim((string)($_POST['location'] ?? ''));
            $provinceId = (int)($_POST['province_id'] ?? 0);
            $requestTypeId = (int)($_POST['request_type_id'] ?? 0);
            $startDt = $this->normalizeDateTimeInput((string)($_POST['start_datetime'] ?? ''));
            $endDt = $this->normalizeDateTimeInput((string)($_POST['end_datetime'] ?? ''));
            if ($startDt === null) $startDt = date('Y-m-d 00:00:00');
            if ($endDt === null) $endDt = date('Y-m-d 23:59:59');

            $statusId = $this->findCompletedEventStatusId($requestTypeId);
            if ($statusId <= 0) {
                json_response(['error' => true, 'message' => 'Completed event status not found'], 422);
                return;
            }

            $this->pdo->beginTransaction();

            $eventYearBE = $this->computeEventYearBE($startDt);
            $roundNo = $this->getNextEventRoundNo($eventYearBE);

            $eventModel = new EventModel($this->pdo);
            $eventId = $eventModel->create([
                'request_id' => null,
                'title' => $title,
                'detail' => $detail,
                'location' => ($location !== '' ? $location : null),
                'province_id' => ($provinceId > 0 ? $provinceId : null),
                'meeting_link' => null,
                'round_no' => $roundNo,
                'event_year' => $eventYearBE,
                'note' => null,
                'event_status_id' => $statusId,
                'start_datetime' => $startDt,
                'end_datetime' => $endDt,
                'participant_user_ids' => '',
                'updated_by' => $uid,
            ]);

            $reportId = $this->insertEventReport($eventId, $uid);

            $pictureIds = [];
            $insPic = $this->pdo->prepare('
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

            foreach ($flatFiles as $file) {
                $meta = $this->saveEventReportPictureFile($reportId, $uid, $file);
                $savedAbsPaths[] = $meta['abs_path'];

                $insPic->execute([
                    ':rid' => $reportId,
                    ':fp' => $meta['filepath'],
                    ':orig' => $meta['original_filename'],
                    ':stored' => $meta['stored_filename'],
                    ':sz' => (int)$meta['file_size'],
                    ':uby' => $uid,
                ]);
                $pictureIds[] = (int)$this->pdo->lastInsertId();
            }

            $pm = new PublicityPostModel($this->pdo);
            $post = $pm->createFromEvent($eventId, $uid);
            $postId = (int)($post['publicity_post_id'] ?? 0);
            if ($postId <= 0) {
                throw new RuntimeException('CREATE_PUBLICITY_POST_FAILED');
            }

            $eventMediaIds = [];
            $insMedia = $this->pdo->prepare('
                INSERT INTO event_media
                    (event_id, source_type, source_id, sort_order, is_cover)
                VALUES
                    (:eid, "event_report_picture", :sid, :sort, :cover)
            ');
            foreach ($pictureIds as $idx => $pictureId) {
                $insMedia->execute([
                    ':eid' => $eventId,
                    ':sid' => $pictureId,
                    ':sort' => $idx + 1,
                    ':cover' => $idx === 0 ? 1 : 0,
                ]);
                $eventMediaIds[] = (int)$this->pdo->lastInsertId();
            }

            $insPostMedia = $this->pdo->prepare('
                INSERT INTO publicity_post_media
                    (post_id, event_media_id, sort_order, is_cover, created_at)
                VALUES
                    (:pid, :mid, :sort, :cover, NOW())
            ');
            foreach ($eventMediaIds as $idx => $mediaId) {
                $insPostMedia->execute([
                    ':pid' => $postId,
                    ':mid' => (int)$mediaId,
                    ':sort' => $idx + 1,
                    ':cover' => $idx === 0 ? 1 : 0,
                ]);
            }

            $this->pdo->commit();

            $row = $pm->findByEventId($eventId) ?: $post;
            json_response([
                'error' => false,
                'data' => [
                    'event_id' => $eventId,
                    'event_report_id' => $reportId,
                    'publicity_post' => $row,
                    'picture_count' => count($pictureIds),
                    'event_media_count' => count($eventMediaIds),
                ],
            ], 201);
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            foreach ($savedAbsPaths as $path) {
                if (is_string($path) && $path !== '' && is_file($path)) {
                    @unlink($path);
                }
            }
            json_response(['error' => true, 'message' => 'Failed to create direct event publicity post', 'detail' => $e->getMessage()], 500);
        }
    }

    /**
     * PUT /publicity-posts/{eventId}
     * body: { is_banner?, title?, content? }
     */
    public function update(int $eventId): void
    {
        try {
            $this->requireStaffAccess();

            $eventId = max(1, (int)$eventId);
            $body = read_json_body();

            $fields = [];

            if (array_key_exists('is_banner', $body)) {
                $fields['is_banner'] = (int)($body['is_banner'] ?? 0) ? 1 : 0;
            }

            if (array_key_exists('title', $body)) {
                $title = trim((string)($body['title'] ?? ''));
                if ($title === '') {
                    json_response(['error' => true, 'message' => 'title cannot be empty'], 422);
                    return;
                }
                if (mb_strlen($title) > 255) {
                    json_response(['error' => true, 'message' => 'title max length is 255'], 422);
                    return;
                }
                $fields['title'] = $title;
            }

            if (array_key_exists('content', $body)) {
                $fields['content'] = (string)($body['content'] ?? '');
            }

            $m = new PublicityPostModel($this->pdo);

            try {
                $row = $m->updateByEventId($eventId, $fields);
            } catch (RuntimeException $re) {
                if ($re->getMessage() === 'PUBLICITY_POST_NOT_FOUND') {
                    json_response(['error' => true, 'message' => 'Publicity post not found'], 404);
                    return;
                }
                throw $re;
            }

            json_response(['error' => false, 'data' => $row]);
        } catch (Throwable $e) {
            json_response(['error' => true, 'message' => 'Failed to update publicity post', 'detail' => $e->getMessage()], 500);
        }
    }

    /**
     * DELETE /publicity-posts/{eventId}
     */
    public function delete(int $eventId): void
    {
        try {
            $this->requireStaffAccess();

            $eventId = max(1, (int)$eventId);
            $m = new PublicityPostModel($this->pdo);
            $row = $m->findByEventId($eventId);
            if (!$row) {
                json_response(['error' => true, 'message' => 'Publicity post not found'], 404);
                return;
            }

            $m->deleteByEventId($eventId);
            json_response([
                'error' => false,
                'message' => 'Deleted',
                'data' => [
                    'event_id' => $eventId,
                    'publicity_post_id' => (int)($row['publicity_post_id'] ?? 0),
                ],
            ]);
        } catch (Throwable $e) {
            json_response(['error' => true, 'message' => 'Failed to delete publicity post', 'detail' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /publicity-posts/eligible-events?province_id=&request_type_id=&request_sub_type_id=&q=&limit=
     * Returns only finished events, and excludes ones that already have publicity_post.
     */
    public function eligibleEvents(): void
    {
        try {
            $this->requireStaffAccess();

            $limit = max(1, min(500, (int)($_GET['limit'] ?? 200)));
            $provinceId = (int)($_GET['province_id'] ?? 0);
            $requestTypeId = (int)($_GET['request_type_id'] ?? 0);
            $requestSubTypeId = (int)($_GET['request_sub_type_id'] ?? 0);
            $q = trim((string)($_GET['q'] ?? ''));

            $where = [];
            $params = [];

            // finished status heuristic (same idea as EventsController::isFinishedStatusId)
            $where[] = "(
                es.status_name LIKE '%เสร็จสิ้น%'
                OR UPPER(COALESCE(es.status_code,'')) LIKE '%DONE%'
                OR UPPER(COALESCE(es.status_code,'')) LIKE '%FINISH%'
                OR UPPER(COALESCE(es.status_code,'')) LIKE '%FINISHED%'
                OR UPPER(COALESCE(es.status_code,'')) LIKE '%COMPLETE%'
                OR UPPER(COALESCE(es.status_code,'')) LIKE '%COMPLETED%'
            )";

            // exclude already created
            $where[] = 'pp.event_id IS NULL';

            if ($provinceId > 0) {
                $where[] = 'e.province_id = :province_id';
                $params[':province_id'] = $provinceId;
            }
            if ($requestTypeId > 0) {
                $where[] = 'r.request_type = :request_type_id';
                $params[':request_type_id'] = $requestTypeId;
            }
            if ($requestSubTypeId > 0) {
                $where[] = 'r.request_sub_type = :request_sub_type_id';
                $params[':request_sub_type_id'] = $requestSubTypeId;
            }
            if ($q !== '') {
                $where[] = '(
                    CAST(e.event_id AS CHAR) LIKE :q
                    OR e.title LIKE :q
                    OR e.detail LIKE :q
                    OR COALESCE(prov.nameTH, prov.nameEN) LIKE :q
                    OR COALESCE(rt.type_name, "") LIKE :q
                    OR COALESCE(rst.name, "") LIKE :q
                )';
                $params[':q'] = '%' . $q . '%';
            }

            $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

            $sql = "
                SELECT
                    e.event_id,
                    e.title,
                    e.detail,
                    e.province_id,
                    e.start_datetime,
                    e.end_datetime,
                    e.event_status_id,

                    prov.nameTH AS province_name_th,
                    prov.nameEN AS province_name_en,

                    r.request_type AS request_type_id,
                    rt.type_name AS request_type_name,

                    r.request_sub_type AS request_sub_type_id,
                    rst.name AS request_sub_type_name,

                    es.status_code AS event_status_code,
                    es.status_name AS event_status_name
                FROM event e
                LEFT JOIN request r
                    ON r.request_id = e.request_id
                LEFT JOIN province prov
                    ON prov.province_id = e.province_id
                LEFT JOIN request_type rt
                    ON rt.request_type_id = r.request_type
                LEFT JOIN request_sub_type rst
                    ON rst.request_sub_type_id = r.request_sub_type
                LEFT JOIN event_status es
                    ON es.event_status_id = e.event_status_id
                   AND (r.request_type IS NULL OR es.request_type_id = r.request_type)
                LEFT JOIN publicity_post pp
                    ON pp.event_id = e.event_id
                {$whereSql}
                ORDER BY COALESCE(e.end_datetime, e.start_datetime) DESC, e.event_id DESC
                LIMIT :limit
            ";

            $stmt = $this->pdo->prepare($sql);
            foreach ($params as $k => $v) {
                $stmt->bindValue($k, $v, is_int($v) ? PDO::PARAM_INT : PDO::PARAM_STR);
            }
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->execute();

            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

            json_response(['error' => false, 'data' => $rows]);
        } catch (Throwable $e) {
            json_response(['error' => true, 'message' => 'Failed to list eligible events', 'detail' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /publicity-posts/{eventId}/media
     * Returns:
     * - available: all images from event_media for this event
     * - selected: mappings from publicity_post_media for this post
     */
    public function media(int $eventId): void
    {
        try {
            $this->requireStaffAccess();

            $eventId = max(1, (int)$eventId);
            $pm = new PublicityPostModel($this->pdo);
            $post = $pm->findByEventId($eventId);
            if (!$post) {
                json_response(['error' => true, 'message' => 'Publicity post not found'], 404);
                return;
            }

            $postId = (int)($post['publicity_post_id'] ?? 0);
            if ($postId <= 0) {
                json_response(['error' => true, 'message' => 'Invalid publicity_post_id'], 500);
                return;
            }

            $mm = new EventMediaModel($this->pdo);
            $mm->ensureIndexForEvent($eventId);
            $available = $mm->listByEventId($eventId);

            $selM = new PublicityPostMediaModel($this->pdo);
            $selected = $selM->listByPostId($postId);

            json_response([
                'error' => false,
                'data' => [
                    'post_id' => $postId,
                    'event_id' => $eventId,
                    'available' => $available,
                    'selected' => $selected,
                ],
            ]);
        } catch (Throwable $e) {
            json_response(['error' => true, 'message' => 'Failed to get publicity post media', 'detail' => $e->getMessage()], 500);
        }
    }

    /**
     * PUT /publicity-posts/{eventId}/media
     * body: { items: [{ event_media_id, sort_order?, is_cover? }] }
     * Replaces all rows in publicity_post_media for that post.
     */
    public function updateMedia(int $eventId): void
    {
        try {
            $this->requireStaffAccess();

            $eventId = max(1, (int)$eventId);
            $pm = new PublicityPostModel($this->pdo);
            $post = $pm->findByEventId($eventId);
            if (!$post) {
                json_response(['error' => true, 'message' => 'Publicity post not found'], 404);
                return;
            }

            $postId = (int)($post['publicity_post_id'] ?? 0);
            if ($postId <= 0) {
                json_response(['error' => true, 'message' => 'Invalid publicity_post_id'], 500);
                return;
            }

            $body = read_json_body();
            $items = $body['items'] ?? [];
            if (!is_array($items)) $items = [];

            // Validate that selected media belongs to this event.
            $mm = new EventMediaModel($this->pdo);
            $mm->ensureIndexForEvent($eventId);
            $available = $mm->listByEventId($eventId);
            $allowedIds = [];
            foreach ($available as $r) {
                $mid = (int)($r['event_media_id'] ?? 0);
                if ($mid > 0) $allowedIds[$mid] = true;
            }

            $normalized = [];
            $seen = [];
            $coverId = 0;

            foreach ($items as $idx => $it) {
                if (!is_array($it)) continue;
                $mid = (int)($it['event_media_id'] ?? 0);
                if ($mid <= 0) continue;
                if (!isset($allowedIds[$mid])) continue;
                if (isset($seen[$mid])) continue;
                $seen[$mid] = true;

                $isCover = (int)($it['is_cover'] ?? 0) ? 1 : 0;
                if ($isCover && $coverId === 0) {
                    $coverId = $mid;
                }

                $normalized[] = [
                    'event_media_id' => $mid,
                    'sort_order' => (int)($it['sort_order'] ?? ($idx + 1)),
                    'is_cover' => $isCover,
                ];
            }

            // Reassign sort order sequentially and enforce a single cover.
            $out = [];
            foreach ($normalized as $i => $it) {
                $mid = (int)$it['event_media_id'];
                $out[] = [
                    'event_media_id' => $mid,
                    'sort_order' => $i + 1,
                    'is_cover' => ($coverId > 0 && $mid === $coverId) ? 1 : 0,
                ];
            }
            if ($coverId === 0 && !empty($out)) {
                $out[0]['is_cover'] = 1;
            }

            $selM = new PublicityPostMediaModel($this->pdo);
            $selM->replaceForPostId($postId, $out);
            $selected = $selM->listByPostId($postId);

            json_response([
                'error' => false,
                'data' => [
                    'post_id' => $postId,
                    'event_id' => $eventId,
                    'selected' => $selected,
                ],
            ]);
        } catch (Throwable $e) {
            json_response(['error' => true, 'message' => 'Failed to update publicity post media', 'detail' => $e->getMessage()], 500);
        }
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
            $auth = (string)($_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
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

    private function insertEventReport(int $eventId, int $userId): int
    {
        $stmt = $this->pdo->prepare('
            INSERT INTO event_report (
                event_id,
                summary_text,
                submitted_by_id,
                created_at,
                submitted_at
            ) VALUES (
                :eid,
                :summary,
                :uid,
                NOW(),
                NOW()
            )
        ');
        $stmt->execute([
            ':eid' => $eventId,
            ':summary' => '',
            ':uid' => max(0, $userId),
        ]);
        return (int)$this->pdo->lastInsertId();
    }

    private function findCompletedEventStatusId(int $requestTypeId = 0): int
    {
        $where = "(
            status_name LIKE '%เสร็จสิ้น%'
            OR UPPER(COALESCE(status_code,'')) LIKE '%DONE%'
            OR UPPER(COALESCE(status_code,'')) LIKE '%FINISH%'
            OR UPPER(COALESCE(status_code,'')) LIKE '%FINISHED%'
            OR UPPER(COALESCE(status_code,'')) LIKE '%COMPLETE%'
            OR UPPER(COALESCE(status_code,'')) LIKE '%COMPLETED%'
        )";

        if ($requestTypeId > 0) {
            $stmt = $this->pdo->prepare("SELECT event_status_id FROM event_status WHERE request_type_id = :rt AND {$where} ORDER BY sort_order DESC, event_status_id DESC LIMIT 1");
            $stmt->execute([':rt' => $requestTypeId]);
            $id = (int)($stmt->fetchColumn() ?: 0);
            if ($id > 0) return $id;
        }

        $stmt = $this->pdo->query("SELECT event_status_id FROM event_status WHERE {$where} ORDER BY sort_order DESC, event_status_id DESC LIMIT 1");
        return (int)($stmt ? ($stmt->fetchColumn() ?: 0) : 0);
    }

    private function computeEventYearBE(?string $startDatetime): int
    {
        $year = 0;
        $startDatetime = $startDatetime !== null ? trim($startDatetime) : '';
        if ($startDatetime !== '') {
            try {
                $dt = new DateTimeImmutable($startDatetime);
                $year = (int)$dt->format('Y');
            } catch (Throwable $e) {
                $year = 0;
            }
        }
        if ($year <= 0) $year = (int)date('Y');
        return $year + 543;
    }

    private function getNextEventRoundNo(int $eventYearBE): int
    {
        if ($eventYearBE <= 0) $eventYearBE = $this->computeEventYearBE(null);

        $stmt = $this->pdo->prepare('
            SELECT MAX(round_no) AS max_round
            FROM event
            WHERE event_year = :y
              AND round_no > 0
            FOR UPDATE
        ');
        $stmt->execute([':y' => $eventYearBE]);
        $max = $stmt->fetchColumn();
        return max(0, is_numeric($max) ? (int)$max : 0) + 1;
    }

    private function normalizeDateTimeInput(string $value): ?string
    {
        $value = trim($value);
        if ($value === '') return null;
        $value = str_replace('T', ' ', $value);
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return $value . ' 00:00:00';
        }
        if (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/', $value)) {
            return $value . ':00';
        }
        if (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $value)) {
            return $value;
        }
        return null;
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    private function flattenFilesArray(array $files): array
    {
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

    /**
     * @return array{filepath:string,original_filename:string,stored_filename:string,file_size:int,abs_path:string}
     */
    private function saveEventReportPictureFile(int $reportId, int $uploadedBy, array $file): array
    {
        $tmp = (string)($file['tmp_name'] ?? '');
        $original = (string)($file['name'] ?? 'file');
        $size = (int)($file['size'] ?? 0);
        $err = (int)($file['error'] ?? UPLOAD_ERR_NO_FILE);

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

        return [
            'filepath' => 'uploads/event_reports/' . $stored,
            'original_filename' => $original,
            'stored_filename' => $stored,
            'file_size' => $size,
            'abs_path' => $dest,
        ];
    }
}

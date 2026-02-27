<?php
// backend/controllers/publicity_posts.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
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
}

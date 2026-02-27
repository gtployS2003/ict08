<?php
// backend/controllers/user_notification_channel.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../models/UserNotificationChannelModel.php';
require_once __DIR__ . '/../middleware/auth.php';

final class UserNotificationChannelController
{
        /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Resolve acting user:
     * - If admin and user_id query provided -> act on that user
     * - Else act on current authenticated user
     *
     * @return array{user_id:int, user_role_id:int, is_admin:bool}
     */
    private function resolveActorAndTargetUserId(): array
    {
        // ต้องมี require_auth ที่คืนข้อมูล user
        $me = require_auth($this->pdo); // e.g. ['user_id'=>1,'user_role_id'=>1,...]
        $myId = (int)($me['user_id'] ?? 0);
        $myRoleId = (int)($me['user_role_id'] ?? 0);

        if ($myId <= 0) {
            // เผื่อ middleware ของคุณ throw อยู่แล้ว ก็ไม่ถึงบรรทัดนี้
            json_response(['error' => true, 'message' => 'Unauthorized'], 401);
            exit;
        }

        $isAdmin = ($myRoleId === 1);

        $targetUserId = (int)($_GET['user_id'] ?? 0);
        if (!$isAdmin || $targetUserId <= 0) {
            $targetUserId = $myId; // user ทั่วไปบังคับเป็นของตัวเอง
        }

        return [
            'user_id' => $targetUserId,
            'user_role_id' => $myRoleId,
            'is_admin' => $isAdmin,
        ];
    }

    /**
     * Ensure default rows exist (idempotent)
     * - if table empty for that user -> bootstrap from role
     */
    private function ensureDefaultsIfMissing(int $userId, int $roleId): void
    {
        $model = new UserNotificationChannelModel($this->pdo);

        // ถ้ามีแล้วไม่ต้องทำอะไร
        $cnt = $model->countByUser($userId);
        if ($cnt > 0) return;

        // roleId ที่ส่งเข้ามาเป็น role ของ user เป้าหมาย
        // ถ้าหน้านี้เรียกโดย admin แต่ target เป็น user อื่น
        // เราจะ resolve role ของ target จาก DB เพื่อความถูกต้อง
        $resolvedRole = $this->resolveRoleIdFromUserTable($userId);
        if ($resolvedRole > 0) $roleId = $resolvedRole;

        // ถ้ายัง resolve ไม่ได้จริง ๆ ก็ fallback เป็น 1
        if ($roleId <= 0) $roleId = 1;

        $model->bootstrapDefaults($userId, $roleId);
    }

    private function resolveRoleIdFromUserTable(int $userId): int
    {
        $stmt = $this->pdo->prepare("
            SELECT user_role_id
            FROM `user`
            WHERE user_id = :uid
            LIMIT 1
        ");
        $stmt->bindValue(':uid', $userId, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
        return (int)($row['user_role_id'] ?? 0);
    }

    /**
     * GET /user-notification-channels?user_id=&page=&limit=
     * - ถ้าไม่ส่ง user_id -> ใช้ของตัวเอง
     * - ถ้ายังไม่มี mapping -> bootstrap ให้อัตโนมัติ
     */
    public function index(): void
    {
        try {
            $ctx = $this->resolveActorAndTargetUserId();
            $userId = (int)$ctx['user_id'];

            $page = (int)($_GET['page'] ?? 1);
            $limit = (int)($_GET['limit'] ?? 50);

            if ($userId <= 0) {
                json_response(['error' => true, 'message' => 'Missing user_id'], 400);
                return;
            }

            // ✅ ensure default channels exist for that user
            $this->ensureDefaultsIfMissing($userId, (int)$ctx['user_role_id']);

            $model = new UserNotificationChannelModel($this->pdo);
            $items = $model->listByUser($userId, $page, $limit);
            $total = $model->countByUser($userId);

            json_response([
                'error' => false,
                'data' => $items,
                'pagination' => [
                    'page' => max(1, $page),
                    'limit' => max(1, min(200, $limit)),
                    'total' => $total,
                    'totalPages' => (int)ceil($total / max(1, min(200, $limit))),
                ],
            ]);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to get user notification channels',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /user-notification-channels/users?q=&limit=
     * - เอาไว้ให้ admin ค้น user (ถ้าหน้า UI admin ต้องเลือก user)
     * - ถ้าหน้า UI ของคุณ "ไม่ต้องเลือก user" คุณปิด endpoint นี้ได้
     */
    public function users(): void
    {
        try {
            // ✅ ให้ admin เท่านั้น
            require_admin($this->pdo);

            $q = trim((string)($_GET['q'] ?? ''));
            $limit = (int)($_GET['limit'] ?? 200);

            $model = new UserNotificationChannelModel($this->pdo);
            $items = $model->listUsers($q, $limit);

            json_response([
                'error' => false,
                'data' => $items,
            ]);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to get users for notification channels',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /user-notification-channels/{id}
     * - user ต้องเป็นเจ้าของ record หรือ admin เท่านั้น
     */
    public function show(int $id): void
    {
        try {
            $me = require_auth($this->pdo);
            $myId = (int)($me['user_id'] ?? 0);
            $myRole = (int)($me['user_role_id'] ?? 0);
            $isAdmin = ($myRole === 1);

            if ($id <= 0) {
                json_response(['error' => true, 'message' => 'Invalid id'], 400);
                return;
            }

            $model = new UserNotificationChannelModel($this->pdo);
            $item = $model->getById($id);

            if (!$item) {
                json_response(['error' => true, 'message' => 'User notification channel not found'], 404);
                return;
            }

            $ownerId = (int)($item['user_id'] ?? 0);
            if (!$isAdmin && $ownerId !== $myId) {
                json_response(['error' => true, 'message' => 'Forbidden'], 403);
                return;
            }

            json_response(['error' => false, 'data' => $item]);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to get user notification channel',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PUT /user-notification-channels/{id}
     * body: { enable } or { is_enabled }
     * - user แก้ได้เฉพาะ record ของตัวเอง
     * - admin แก้ได้ทุกคน
     */
    public function update(int $id): void
    {
        try {
            error_log("[UNC-UPDATE] Method: " . $_SERVER['REQUEST_METHOD']);
            error_log("[UNC-UPDATE] Content-Type: " . ($_SERVER['CONTENT_TYPE'] ?? 'none'));
            
            $me = require_auth($this->pdo);
            $myId = (int)($me['user_id'] ?? 0);
            $myRole = (int)($me['user_role_id'] ?? 0);
            $isAdmin = ($myRole === 1);

            if ($id <= 0) {
                json_response(['error' => true, 'message' => 'Invalid id'], 400);
                return;
            }

            $raw = (string)file_get_contents('php://input');
            error_log("[UNC-DEBUG] raw input length: " . strlen($raw));
            error_log("[UNC-DEBUG] raw input: " . $raw);
            error_log("[UNC-DEBUG] raw type: " . gettype($raw));
            
            $body = json_decode($raw, true);
            
            error_log("[UNC-DEBUG] json_decode result type: " . gettype($body));
            if (is_array($body)) {
                error_log("[UNC-DEBUG] body is array with keys: " . implode(',', array_keys($body)));
                error_log("[UNC-DEBUG] body content: " . print_r($body, true));
            } else {
                error_log("[UNC-DEBUG] body NOT array, value: " . var_export($body, true));
            }
            error_log("[UNC-DEBUG] json_last_error: " . json_last_error() . " msg: " . json_last_error_msg());
            
            if (!is_array($body)) {
                json_response(['error' => true, 'message' => 'Invalid JSON body: ' . json_last_error_msg()], 400);
                return;
            }

            $enableRaw = $body['enable'] ?? ($body['is_enabled'] ?? null);
            if ($enableRaw === null) {
                json_response(['error' => true, 'message' => 'Missing enable'], 400);
                return;
            }

            // รองรับ: 1/0, true/false, "1"/"0"
            $enableBool = filter_var($enableRaw, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            $enable = ($enableBool === null) ? (int)$enableRaw : ($enableBool ? 1 : 0);
            $enable = $enable ? 1 : 0;

            $model = new UserNotificationChannelModel($this->pdo);
            $item = $model->getById($id);
            if (!$item) {
                json_response(['error' => true, 'message' => 'User notification channel not found'], 404);
                return;
            }

            $ownerId = (int)($item['user_id'] ?? 0);
            if (!$isAdmin && $ownerId !== $myId) {
                json_response(['error' => true, 'message' => 'Forbidden'], 403);
                return;
            }

            // ✅ บังคับ line ต้องเปิดเสมอ (ถ้าคุณต้องการ rule นี้จริง)
            // ถ้า "ไม่บังคับ" ให้คอมเมนต์บล็อคนี้ออก
            $channelName = strtolower((string)($item['channel_name'] ?? ''));
            if ($channelName === 'line') {
                $enable = 1;
            }

            $ok = $model->updateEnable($id, $enable);
            if (!$ok) {
                json_response(['error' => true, 'message' => 'No changes'], 200);
                return;
            }

            json_response(['error' => false, 'message' => 'Updated']);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to update user notification channel',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /user-notification-channels/bootstrap
     * body: { user_id, role_id? }
     * - ให้ admin เท่านั้น (maintenance)
     */
    public function bootstrap(): void
    {
        try {
            require_admin($this->pdo);

            $body = json_decode((string)file_get_contents('php://input'), true);
            if (!is_array($body)) $body = $_POST;

            $userId = (int)($body['user_id'] ?? 0);
            $roleId = (int)($body['role_id'] ?? 0);

            if ($userId <= 0) {
                json_response(['error' => true, 'message' => 'Missing user_id'], 400);
                return;
            }

            if ($roleId <= 0) {
                $roleId = $this->resolveRoleIdFromUserTable($userId);
            }

            if ($roleId <= 0) {
                json_response([
                    'error' => true,
                    'message' => 'Missing role_id (and cannot resolve from user table)',
                ], 400);
                return;
            }

            $model = new UserNotificationChannelModel($this->pdo);
            $result = $model->bootstrapDefaults($userId, $roleId);

            json_response([
                'error' => false,
                'message' => 'Bootstrapped defaults',
                'data' => $result,
            ], 201);

        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to bootstrap user notification channels',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }
}

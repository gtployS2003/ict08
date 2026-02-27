<?php
// backend/controllers/notifications.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../config/env.php';

env_load(__DIR__ . '/../.env');

require_once __DIR__ . '/../models/NotificationModel.php';
require_once __DIR__ . '/../models/NotificationTypeStaffModel.php';
require_once __DIR__ . '/../models/UserNotificationChannelModel.php';

final class NotificationsController
{
        /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * GET /notifications?page=&limit=
     * - คืนเฉพาะ notification_type_id ที่ user ถูกเปิดรับ (notification_type_staff.is_enabled=1)
     * - ถ้า user ปิดช่องทาง web -> คืน []
     */
    public function index(): void
    {
        try {
            $me = require_auth($this->pdo);
            $userId = (int)($me['user_id'] ?? 0);
            $roleId = (int)($me['user_role_id'] ?? 0);

            $page = max(1, (int)($_GET['page'] ?? 1));
            $limit = max(1, min(200, (int)($_GET['limit'] ?? 50)));
            $offset = ($page - 1) * $limit;

            $unc = new UserNotificationChannelModel($this->pdo);

            // ensure defaults exist (idempotent)
            if ($userId > 0 && $unc->countByUser($userId) <= 0) {
                $unc->bootstrapDefaults($userId, $roleId > 0 ? $roleId : 1);
            }

            $channels = $unc->listEnabledChannelNamesByUser($userId);
            if (!in_array('web', $channels, true)) {
                json_response([
                    'error' => false,
                    'data' => [],
                    'pagination' => [
                        'page' => $page,
                        'limit' => $limit,
                        'total' => 0,
                        'totalPages' => 0,
                    ],
                ]);
                return;
            }

            $nts = new NotificationTypeStaffModel($this->pdo);
            $typeIds = $nts->listEnabledTypeIdsByUser($userId);

            $nm = new NotificationModel($this->pdo);
            $items = $nm->listForUser($userId, $typeIds, $limit, $offset);
            $total = $nm->countForUser($userId, $typeIds);

            // ✅ เพิ่ม link ไปหน้า check_request.html สำหรับ notification ที่ผูกกับ request_id
            $basePathRaw = (string)env('BASE_PATH', '/ict8');
            $basePathTrim = trim($basePathRaw);
            $basePath = ($basePathTrim !== '' ? $basePathTrim : '/ict8');
            if (!str_starts_with($basePath, '/')) {
                $basePath = '/' . $basePath;
            }
            $basePath = rtrim($basePath, '/');

            foreach ($items as &$it) {
                $rid = (int)($it['request_id'] ?? 0);
                $eid = (int)($it['event_id'] ?? 0);
                $ntid = (int)($it['notification_type_id'] ?? 0);

                // For accepted notifications, prefer linking to event edit when event_id is present
                if (($ntid === 7 || $ntid === 8) && $eid > 0) {
                    $it['link_url'] = $basePath . "/schedule/event-edit.html?event_id=" . $eid;
                    continue;
                }

                // Default: if notification is tied to a request, link to check_request
                if ($rid > 0) {
                    $it['link_url'] = $basePath . "/check_request.html?request_id=" . $rid;
                }
            }
            unset($it);

            json_response([
                'error' => false,
                'data' => $items,
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
                'message' => 'Failed to get notifications',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }
}

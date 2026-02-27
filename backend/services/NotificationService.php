<?php
// backend/services/NotificationService.php
declare(strict_types=1);

require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/../models/NotificationModel.php';
require_once __DIR__ . '/../models/NotificationTypeModel.php';
require_once __DIR__ . '/../models/NotificationTypeStaffModel.php';
require_once __DIR__ . '/../models/UserNotificationChannelModel.php';
require_once __DIR__ . '/LineService.php';

final class NotificationService
{
        /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    // notification_type_id ที่คุณต้องการใช้ (ปรับได้)
    public const NOTIF_TYPE_REQUEST_REPAIR = 5;
    public const NOTIF_TYPE_REQUEST_OTHER = 6;
    // IMPORTANT: DB uses id=4 for request_conferance_pending, while id=7 is request_accepted
    public const NOTIF_TYPE_REQUEST_CONFERENCE = 4;


    /**
     * Create notification row for a newly created request.
     * Returns: ['notification_id' => int, 'notification_type_id' => int, 'message' => string]
     *
     * @return array{notification_id:int, notification_type_id:int, message:string}
     */
    public function createNewRequestNotification(int $requestId, int $requestTypeId, string $subject = ''): array
    {
        $requestId = max(0, $requestId);
        if ($requestId <= 0) {
            throw new InvalidArgumentException('requestId is required');
        }

        $typeId = $this->resolveRequestNotificationTypeId($requestTypeId);

        $message = $this->buildRequestMessage($requestTypeId, $requestId, $subject);

        $notificationModel = new NotificationModel($this->pdo);
        $notificationId = $notificationModel->createRequestPending([
            'request_id' => $requestId,
            'notification_type_id' => $typeId,
            'message' => $message,
        ]);

        return [
            'notification_id' => $notificationId,
            'notification_type_id' => $typeId,
            'message' => $message,
        ];
    }

    /**
     * Dispatch notification to enabled staff via enabled channels.
     * - LINE: push message if recipient has channel 'line' enabled
     * - WEB: no-op (notification already saved in DB)
     */
    public function dispatchToStaff(int $notificationTypeId, string $message): array
    {
        $notificationTypeId = max(1, $notificationTypeId);
        $message = trim($message);
        if ($message === '') {
            return ['ok' => false, 'error' => 'Empty message'];
        }

        $recipientsModel = new NotificationTypeStaffModel($this->pdo);
        $recipients = $recipientsModel->listEnabledRecipientsByType($notificationTypeId);

        $uncModel = new UserNotificationChannelModel($this->pdo);

        $token = env('LINE_CHANNEL_ACCESS_TOKEN');
        $line = ($token !== null && $token !== '') ? new LineService($token) : null;

        $sentLine = 0;
        $skipped = 0;
        $errors = [];

        foreach ($recipients as $r) {
            $uid = (int) ($r['user_id'] ?? 0);
            if ($uid <= 0) {
                $skipped++;
                continue;
            }

            // Ensure default channel rows exist (idempotent)
            try {
                if ($uncModel->countByUser($uid) <= 0) {
                    $roleId = $this->getUserRoleId($uid);
                    $uncModel->bootstrapDefaults($uid, $roleId);
                }
            } catch (Throwable $e) {
                // ถ้าสร้าง default ไม่ได้ ก็ยังพยายาม dispatch ต่อ (best effort)
                $errors[] = ['user_id' => $uid, 'step' => 'bootstrapDefaults', 'error' => $e->getMessage()];
            }

            $enabledChannels = [];
            try {
                $enabledChannels = $uncModel->listEnabledChannelNamesByUser($uid);
            } catch (Throwable $e) {
                $errors[] = ['user_id' => $uid, 'step' => 'listEnabledChannels', 'error' => $e->getMessage()];
                $skipped++;
                continue;
            }

            // LINE
            if (in_array('line', $enabledChannels, true)) {
                $lineUserId = trim((string) ($r['line_user_id'] ?? ''));
                if ($line && $lineUserId !== '') {
                    try {
                        $resp = $line->pushMessage($lineUserId, [
                            ['type' => 'text', 'text' => $message]
                        ]);
                        if (($resp['ok'] ?? false) === true) {
                            $sentLine++;
                        } else {
                            $errors[] = ['user_id' => $uid, 'step' => 'linePush', 'resp' => $resp];
                        }
                    } catch (Throwable $e) {
                        $errors[] = ['user_id' => $uid, 'step' => 'linePush', 'error' => $e->getMessage()];
                    }
                } else {
                    $skipped++;
                }
            }

            // WEB: no-op (stored in notification table already)
        }

        return [
            'ok' => true,
            'recipients' => count($recipients),
            'sent_line' => $sentLine,
            'skipped' => $skipped,
            'errors' => $errors,
        ];
    }

    /**
     * Dispatch a message to specific user IDs (best effort).
     * - Respects user_notification_channel.enable
     * - LINE: push message if enabled and user has line_user_id
     * - WEB: no-op (caller may have already inserted notification rows)
     *
     * @param array<int,int> $userIds
     */
    public function dispatchToUsers(array $userIds, string $message): array
    {
        $message = trim($message);
        if ($message === '') {
            return ['ok' => false, 'error' => 'Empty message'];
        }

        $clean = [];
        foreach ($userIds as $id) {
            $id = (int) $id;
            if ($id > 0)
                $clean[] = $id;
        }
        $clean = array_values(array_unique($clean));
        if (empty($clean)) {
            return ['ok' => true, 'recipients' => 0, 'sent_line' => 0, 'skipped' => 0, 'errors' => []];
        }

        $uncModel = new UserNotificationChannelModel($this->pdo);

        $token = env('LINE_CHANNEL_ACCESS_TOKEN');
        $line = ($token !== null && $token !== '') ? new LineService($token) : null;

        $sentLine = 0;
        $skipped = 0;
        $errors = [];

        if ($line === null) {
            return [
                'ok' => true,
                'recipients' => count($clean),
                'sent_line' => 0,
                'skipped' => count($clean),
                'errors' => [
                    ['step' => 'token', 'error' => 'Missing LINE_CHANNEL_ACCESS_TOKEN'],
                ],
            ];
        }

        foreach ($clean as $uid) {
            // Ensure default channel rows exist (idempotent)
            try {
                if ($uncModel->countByUser($uid) <= 0) {
                    $roleId = $this->getUserRoleId($uid);
                    $uncModel->bootstrapDefaults($uid, $roleId);
                }
            } catch (Throwable $e) {
                $errors[] = ['user_id' => $uid, 'step' => 'bootstrapDefaults', 'error' => $e->getMessage()];
            }

            $enabledChannels = [];
            try {
                $enabledChannels = $uncModel->listEnabledChannelNamesByUser($uid);
            } catch (Throwable $e) {
                $errors[] = ['user_id' => $uid, 'step' => 'listEnabledChannels', 'error' => $e->getMessage()];
                $skipped++;
                continue;
            }

            if (in_array('line', $enabledChannels, true)) {
                $lineUserId = $this->getLineUserId($uid);
                if ($lineUserId === '') {
                    $errors[] = ['user_id' => $uid, 'step' => 'lineUserId', 'error' => 'Missing line_user_id'];
                    $skipped++;
                    continue;
                }

                try {
                    $resp = $line->pushMessage($lineUserId, [
                        ['type' => 'text', 'text' => $message]
                    ]);
                    if (($resp['ok'] ?? false) === true) {
                        $sentLine++;
                    } else {
                        $errors[] = ['user_id' => $uid, 'step' => 'linePush', 'resp' => $resp];
                    }
                } catch (Throwable $e) {
                    $errors[] = ['user_id' => $uid, 'step' => 'linePush', 'error' => $e->getMessage()];
                }
            } else {
                // LINE channel disabled for this user
                $skipped++;
            }
        }

        return [
            'ok' => true,
            'recipients' => count($clean),
            'sent_line' => $sentLine,
            'skipped' => $skipped,
            'errors' => $errors,
        ];
    }

    /* ===================== internal helpers ===================== */

    private function getUserRoleId(int $userId): int
    {
        $stmt = $this->pdo->prepare("SELECT user_role_id FROM `user` WHERE user_id = :uid LIMIT 1");
        $stmt->bindValue(':uid', $userId, PDO::PARAM_INT);
        $stmt->execute();
        $role = $stmt->fetchColumn();
        return $role ? (int) $role : 1;
    }

    private function getLineUserId(int $userId): string
    {
        $stmt = $this->pdo->prepare('SELECT line_user_id FROM `user` WHERE user_id = :uid LIMIT 1');
        $stmt->bindValue(':uid', $userId, PDO::PARAM_INT);
        $stmt->execute();
        return trim((string) ($stmt->fetchColumn() ?? ''));
    }

    private function resolveRequestNotificationTypeId(int $requestTypeId): int
    {
        // default mapping ตาม requirement
        $desired = 0;
        switch ($requestTypeId) {
            case 3: // repair
                $desired = self::NOTIF_TYPE_REQUEST_REPAIR;
                break;
            case 4: // other
                $desired = self::NOTIF_TYPE_REQUEST_OTHER;
                break;
            case 2: // conference
                $desired = self::NOTIF_TYPE_REQUEST_CONFERENCE;
                break;
            default:
                $desired = 0;
        }

        $typeModel = new NotificationTypeModel($this->pdo);

        // 1) ถ้า desired มีจริงใน DB ก็ใช้เลย
        if ($desired > 0 && $typeModel->existsById($desired)) {
            return $desired;
        }

        // 2) fallback by known names (รองรับ typo: conferance)
        $fallbackNames = [];
        if ($requestTypeId === 3) {
            $fallbackNames = ['request_repair_pending'];
        } elseif ($requestTypeId === 4) {
            $fallbackNames = ['request_other_pending'];
        } elseif ($requestTypeId === 2) {
            $fallbackNames = ['request_conference_pending', 'request_conferance_pending'];
        }

        foreach ($fallbackNames as $name) {
            $row = $typeModel->findByName($name);
            if ($row && isset($row['notification_type_id']) && is_numeric($row['notification_type_id'])) {
                return (int) $row['notification_type_id'];
            }
        }

        // 3) fallback hard-coded (เผื่อ DB ใช้ id เดิม)
        if ($requestTypeId === 2 && $typeModel->existsById(4)) {
            return 4;
        }

        throw new RuntimeException('Cannot resolve notification_type_id for request_type=' . $requestTypeId);
    }

    private function buildRequestMessage(int $requestTypeId, int $requestId, string $subject = ''): string
    {
        $subject = trim($subject);
        $suffix = $subject !== '' ? (" — " . $subject) : '';

        // สร้างลิงก์สำหรับตรวจสอบ/อนุมัติคำขอ
        $link = $this->buildCheckRequestUrl($requestId);
        $linkLine = $link !== '' ? ("\nตรวจสอบ/อนุมัติ: " . $link) : '';

        if ($requestTypeId === 3) {
            return "แจ้งเสีย (#{$requestId}){$suffix}{$linkLine}";
        }
        if ($requestTypeId === 4) {
            return "คำร้องอื่น ๆ (#{$requestId}){$suffix}{$linkLine}";
        }
        if ($requestTypeId === 2) {
            return "ขอใช้ห้องประชุม (#{$requestId}){$suffix}{$linkLine}";
        }

        return "มีคำขอใหม่เข้ามา (#{$requestId}){$suffix}{$linkLine}";
    }

    private function buildCheckRequestUrl(int $requestId): string
    {
        $requestId = max(0, $requestId);
        if ($requestId <= 0)
            return '';

        // ถ้ามี API_BASE ใน env (เช่น ngrok) ให้ derive base url จาก host ของ request ณ runtime จะดีกว่า
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host = (string) ($_SERVER['HTTP_HOST'] ?? '');
        if ($host === '')
            return '';

        $basePath = env('BASE_PATH', '/ict8') ?: '/ict8';
        if ($basePath === '')
            $basePath = '/ict8';
        if ($basePath[0] !== '/')
            $basePath = '/' . $basePath;

        return $scheme . '://' . $host . rtrim($basePath, '/') . '/check_request.html?request_id=' . $requestId;
    }
}

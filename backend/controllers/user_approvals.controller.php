<?php
// backend/controllers/user_approvals.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../services/LineService.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../middleware/auth.php';

require_once __DIR__ . '/../models/PersonModel.php';
require_once __DIR__ . '/../models/UserModel.php';
require_once __DIR__ . '/../models/UserRoleModel.php';
require_once __DIR__ . '/../models/OrganizationModel.php';

class UserApprovalsController
{
    private PersonModel $personModel;
    private UserModel $userModel;
    private UserRoleModel $userRoleModel;
    private OrganizationModel $orgModel;

    public function __construct(private PDO $pdo)
    {
        $this->personModel = new PersonModel($pdo);
        $this->userModel = new UserModel($pdo);
        $this->userRoleModel = new UserRoleModel($pdo);
        $this->orgModel = new OrganizationModel($pdo);
    }

    /**
     * GET /user-approvals/pending
     * - สำหรับ admin ดูรายการผู้ใช้ที่รออนุมัติ (person.is_active = 0)
     * Response: { items: [...], page, limit, total, totalPages }
     */
    public function pending(): void
    {
        try {
            require_admin($this->pdo);

            $q = isset($_GET['q']) ? trim((string)$_GET['q']) : '';
            $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
            $limit = isset($_GET['limit']) ? max(1, (int)$_GET['limit']) : 50;

            $result = $this->personModel->getPendingApprovals($q, $page, $limit);

            ok([
                'items' => $result['items'] ?? [],
                'page' => $result['page'] ?? $page,
                'limit' => $result['limit'] ?? $limit,
                'total' => $result['total'] ?? 0,
                'totalPages' => $result['totalPages'] ?? 1,
            ]);
        } catch (Throwable $e) {
            fail('SERVER_ERROR', 500, $e->getMessage());
        }
    }

    /**
     * POST /user-approvals/approve
     * body (json):
     *  - user_id (required)
     *  - role_id (optional)  // ถ้าส่งมา จะอัปเดต user.user_role_id ก่อน
     *
     * Flow:
     *  - (optional) update user_role_id
     *  - set person.is_active = 1
     *  - (after commit) switch LINE richmenu ตาม internal/external
     */
    public function approve(): void
    {
        try {
            require_admin($this->pdo);

            $body = read_json_body();
            $userId = isset($body['user_id']) ? (int)$body['user_id'] : 0;
            $roleId = isset($body['role_id']) ? (int)$body['role_id'] : 0;

            if ($userId <= 0) {
                fail('VALIDATION_ERROR', 422, 'user_id is required');
                return;
            }

            // ตรวจ user มีจริง
            $user = $this->userModel->findById($userId);
            if (!$user) {
                fail('NOT_FOUND', 404, 'user not found');
                return;
            }

            // ตรวจ person มีจริง (กัน approve user ที่ไม่มี person)
            $person0 = $this->personModel->findByUserId($userId);
            if (!$person0) {
                fail('NOT_FOUND', 404, 'person not found for this user');
                return;
            }

            // ถ้าส่ง role_id มา → ตรวจ role มีจริงก่อน
            if ($roleId > 0) {
                try {
                    $this->userRoleModel->getById($roleId); // ถ้าไม่เจอจะ throw
                } catch (Throwable $e) {
                    fail('VALIDATION_ERROR', 422, 'role_id not found');
                    return;
                }
            }

            $this->pdo->beginTransaction();

            // (optional) เปลี่ยน role ก่อน
            if ($roleId > 0) {
                $ok = $this->userModel->updateUserRole($userId, $roleId);
                if (!$ok) {
                    $this->pdo->rollBack();
                    fail('UPDATE_FAILED', 500, 'cannot update user role');
                    return;
                }
            }

            // อนุมัติ person (ทำให้ idempotent: approve ซ้ำไม่พัง)
            $ok2 = $this->personModel->setActiveByUserId($userId, 1);
            if (!$ok2) {
                $pNow = $this->personModel->findByUserId($userId);
                if ($pNow && (int)($pNow['is_active'] ?? 0) === 1) {
                    $ok2 = true;
                }
            }

            if (!$ok2) {
                $this->pdo->rollBack();
                fail('UPDATE_FAILED', 500, 'cannot approve person');
                return;
            }

            $this->pdo->commit();

            // ===== หลังอนุมัติ: สลับ Rich Menu ตาม internal/external =====
            $richMenuDebug = null;
            $userLatest = $user; // default เผื่ออ่านล่าสุดไม่ได้

            try {
                $userLatest = $this->userModel->findById($userId) ?: $user;

                $person = $this->personModel->findByUserId($userId); // อ่านล่าสุดเพื่อเอา organization_id
                $lineUserId = (string)($userLatest['line_user_id'] ?? '');

                if ($lineUserId !== '' && $person) {
                    $RM_INTERNAL = getenv('LINE_RICHMENU_INTERNAL') ?: '';
                    $RM_EXTERNAL = getenv('LINE_RICHMENU_EXTERNAL') ?: '';

                    $ctx = $this->detectInternalExternalByPerson($person);
                    $targetRichMenuId = $ctx['is_internal'] ? $RM_INTERNAL : $RM_EXTERNAL;

                    $rmRes = $this->trySetRichMenu($lineUserId, $targetRichMenuId);

                    if ($this->isDebug()) {
                        $richMenuDebug = [
                            'line_user_id' => $lineUserId,
                            'target_richmenu_id' => $targetRichMenuId,
                            'is_internal' => (bool)$ctx['is_internal'],
                            'organization_type_id' => (int)$ctx['organization_type_id'],
                            'internal_type_id' => (int)$ctx['internal_type_id'],
                            'result' => $rmRes
                        ];
                    }
                } else {
                    if ($this->isDebug()) {
                        $richMenuDebug = [
                            'ok' => false,
                            'error' => 'missing line_user_id or person not found'
                        ];
                    }
                }
            } catch (Throwable $e) {
                if ($this->isDebug()) {
                    $richMenuDebug = [
                        'ok' => false,
                        'error' => $e->getMessage()
                    ];
                }
            }

            $finalRoleId = $roleId > 0
                ? $roleId
                : (int)($userLatest['user_role_id'] ?? ($user['user_role_id'] ?? 0));

            $payload = [
                'user_id' => $userId,
                'approved' => true,
                'role_id' => $finalRoleId,
            ];

            if ($this->isDebug() && $richMenuDebug !== null) {
                $payload['rich_menu'] = $richMenuDebug;
            }

            ok($payload);

        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            fail('SERVER_ERROR', 500, $e->getMessage());
        }
    }

    private function isDebug(): bool
    {
        $v = getenv('APP_DEBUG') ?: '';
        return $v === '1' || strtolower($v) === 'true';
    }

    /**
     * ตัดสิน internal/external จาก organization_type_id
     * - ตั้งค่า internal type id ได้ใน .env: ORG_TYPE_INTERNAL_ID=1
     */
    private function detectInternalExternalByPerson(array $person): array
    {
        $internalTypeId = (int)(getenv('ORG_TYPE_INTERNAL_ID') ?: 1);

        $orgTypeId = 0;
        $isInternal = false;

        $organizationId = (int)($person['organization_id'] ?? 0);
        if ($organizationId > 0) {
            try {
                $org = $this->orgModel->findById($organizationId);
                $orgTypeId = (int)($org['organization_type_id'] ?? 0);
                $isInternal = ($orgTypeId === $internalTypeId);
            } catch (Throwable $e) {
                $isInternal = false;
            }
        }

        return [
            'is_internal' => $isInternal,
            'organization_type_id' => $orgTypeId,
            'internal_type_id' => $internalTypeId,
        ];
    }

    /**
     * สลับ richmenu ให้ user โดยไม่ทำให้ flow หลักล้ม
     */
    private function trySetRichMenu(string $lineUserId, string $targetRichMenuId): array
    {
        $ACCESS_TOKEN = getenv('LINE_CHANNEL_ACCESS_TOKEN') ?: '';
        if ($ACCESS_TOKEN === '' || $targetRichMenuId === '') {
            return [
                'ok' => false,
                'http' => 0,
                'error' => 'Missing LINE_CHANNEL_ACCESS_TOKEN or target richmenu id in .env',
            ];
        }

        try {
            $lineService = new LineService($ACCESS_TOKEN);

            // unlink อาจได้ 404 ถ้ายังไม่มีเมนูเดิม (ถือว่าโอเค)
            $unlink = $lineService->unlinkRichMenuFromUser($lineUserId);
            $link = $lineService->linkRichMenuToUser($lineUserId, $targetRichMenuId);

            return [
                'ok' => ($link['ok'] ?? false),
                'unlink' => $unlink,
                'link' => $link,
            ];
        } catch (Throwable $e) {
            return [
                'ok' => false,
                'http' => 0,
                'error' => $e->getMessage(),
            ];
        }
    }
}

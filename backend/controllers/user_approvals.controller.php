<?php
// backend/controllers/user_approvals.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../middleware/auth.php';

require_once __DIR__ . '/../models/PersonModel.php';
require_once __DIR__ . '/../models/UserModel.php';
require_once __DIR__ . '/../models/UserRoleModel.php';

class UserApprovalsController
{
    private PersonModel $personModel;
    private UserModel $userModel;
    private UserRoleModel $userRoleModel;

    public function __construct(private PDO $pdo)
    {
        $this->personModel   = new PersonModel($pdo);
        $this->userModel     = new UserModel($pdo);
        $this->userRoleModel = new UserRoleModel($pdo);
    }

    /**
     * GET /user-approvals/pending
     * - สำหรับ admin ดูรายการผู้ใช้ที่รออนุมัติ (person.is_active = 0)
     * Response: { items: [...] }
     */
    public function pending(): void
    {
        try {
            // ต้องเป็น admin (role_id=3)
            // หมายเหตุ: ฟังก์ชันจริงอาจชื่อ require_auth() / auth_required() ตามที่คุณมีใน auth.php
            // ปรับชื่อให้ตรงกับของคุณได้ทันที
            require_admin($this->pdo);


            $q = isset($_GET['q']) ? trim((string)$_GET['q']) : '';
            $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
            $limit = isset($_GET['limit']) ? max(1, (int)$_GET['limit']) : 50;

            // method นี้เราจะไปเพิ่มใน PersonModel.php ขั้นถัดไป
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
     */
    public function approve(): void
    {
        try {
            // ต้องเป็น admin (role_id=3)
            require_admin($this->pdo);


            $body = read_json_body(); // helper ใน validator.php (ถ้าชื่อไม่ตรง เปลี่ยนได้)
            $userId = isset($body['user_id']) ? (int)$body['user_id'] : 0;
            $roleId = isset($body['role_id']) ? (int)$body['role_id'] : 0;

            if ($userId <= 0) {
                fail('VALIDATION_ERROR', 422, 'user_id is required');
                return;
            }

            // ตรวจ user มีจริง
            $user = $this->userModel->findById($userId);
            if (!$user) {
                fail('NOT_FOUND', 404, 'user not found' );
                return;
            }

            // ถ้าส่ง role_id มา → ตรวจ role มีจริงก่อน
            if ($roleId > 0) {
                $role = $this->userRoleModel->getById($roleId);
                if (!$role) {
                    fail('VALIDATION_ERROR', 422, 'role_id not found');
                    return;
                }
            }

            $this->pdo->beginTransaction();

            // (optional) เปลี่ยน role ก่อน
            if ($roleId > 0) {
                // method นี้เราจะไปเพิ่มใน UserModel.php ขั้นถัดไป
                $ok = $this->userModel->updateUserRole($userId, $roleId);
                if (!$ok) {
                    $this->pdo->rollBack();
                    fail('UPDATE_FAILED', 500, 'cannot update user role');
                    return;
                }
            }

            // อนุมัติ person
            // method นี้เราจะไปเพิ่มใน PersonModel.php ขั้นถัดไป
            $ok2 = $this->personModel->setActiveByUserId($userId, 1);
            if (!$ok2) {
                $this->pdo->rollBack();
                fail('UPDATE_FAILED', 500, 'cannot approve person');
                return;
            }

            $this->pdo->commit();

            ok([
                'user_id' => $userId,
                'approved' => true,
                'role_id' => $roleId > 0 ? $roleId : (int)($user['user_role_id'] ?? 0),
            ]);
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            fail('SERVER_ERROR', 500, $e->getMessage());
        }
    }
}

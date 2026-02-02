<?php
// backend/controllers/auth.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../services/LineService.php';


require_once __DIR__ . '/../models/UserModel.php';

require_once __DIR__ . '/../models/PersonModel.php';
require_once __DIR__ . '/../models/NotificationModel.php';
require_once __DIR__ . '/../models/UserRoleModel.php';
require_once __DIR__ . '/../models/OrganizationModel.php';


class AuthController
{
    public function __construct(private PDO $pdo)
    {
    }

    /**
     * POST /auth/line-login
     * body: { line_user_id, line_user_name }
     *
     * Response:
     * - status=active  -> มี user + person.is_active=1 => ออก token
     * - status=pending -> มี user แต่ person.is_active=0 => รออนุมัติ
     * - status=register-> ไม่พบ user => ไปสมัครสมาชิก
     */
    public function lineLogin(): void
    {
        $body = read_json_body();
        $missing = require_fields($body, ['line_user_id', 'line_user_name']);
        if ($missing)
            fail("Missing fields", 422, $missing);

        $lineUserId = trim((string) $body['line_user_id']);
        $lineUserName = trim((string) $body['line_user_name']);
        if ($lineUserId === '')
            fail("Invalid line_user_id", 422);

        $userModel = new UserModel($this->pdo);
        $user = $userModel->findByLineUserId($lineUserId);

        // ไม่พบ user -> ให้ไป register
        if (!$user) {
            ok(["status" => "register"], "User not found, registration required");
            return;
        }

        $userId = (int) $user['user_id'];

        // เช็คสถานะอนุมัติจาก person.is_active
        $personModel = new PersonModel($this->pdo);
        $person = $personModel->findByUserId($userId);

        $isActive = (int) ($person['is_active'] ?? 0);

        if ($isActive !== 1) {
            // pending -> ให้ใช้เมนู BEFORE (หรือคุณจะทำเมนู PENDING แยกก็ได้)
            $RM_BEFORE = getenv('LINE_RICHMENU_BEFORE') ?: '';
            $lineService = new LineService(getenv('LINE_CHANNEL_ACCESS_TOKEN') ?: '');
            $rmRes = $lineService->setUserRichMenu($lineUserId, $RM_BEFORE);


            $payload = [
                "status" => "pending",
                "user" => [
                    "user_id" => $userId,
                    "line_user_id" => $lineUserId,
                    "line_user_name" => $lineUserName,
                ]
            ];

            if ($this->isDebug()) {
                $payload["rich_menu"] = [
                    "target_richmenu_id" => $RM_BEFORE,
                    "result" => $rmRes
                ];
            }

            ok($payload, "Pending approval");
            return;
        }


        // ===============================
        // อนุมัติแล้ว -> ออก token
        // ===============================
        $token = auth_sign((string) $userId);

        // ===============================
        // สลับ Rich Menu ตาม internal/external
        // เกณฑ์: organization_type_id === 1 => internal (STAFF)
        // ===============================
        $richMenuResult = null;

        // อ่านค่าจาก env
        $RM_BEFORE = getenv('LINE_RICHMENU_BEFORE') ?: '';
        $RM_INTERNAL = getenv('LINE_RICHMENU_INTERNAL') ?: '';
        $RM_EXTERNAL = getenv('LINE_RICHMENU_EXTERNAL') ?: '';

        $ACCESS_TOKEN = getenv('LINE_CHANNEL_ACCESS_TOKEN') ?: '';

        // ตัดสิน internal/external จาก organization_type_id
        $isInternal = false;
        $orgTypeId = 0;

        $organizationId = (int) ($person['organization_id'] ?? 0);
        if ($organizationId > 0) {
            try {
                $orgModel = new OrganizationModel($this->pdo);
                $org = $orgModel->findById($organizationId);
                $orgTypeId = (int) ($org['organization_type_id'] ?? 0);

                // internal = type 1 (ตามที่คุณใช้ใน register)
                if ($orgTypeId === 1)
                    $isInternal = true;
            } catch (Throwable $e) {
                // ถ้าอ่าน org ไม่ได้ ให้ถือว่า external ไปก่อน
                $isInternal = false;
            }
        }

        // เลือก richmenu id
        $targetRichMenuId = $isInternal ? $RM_INTERNAL : $RM_EXTERNAL;

        // ยิง LINE API เพื่อ link rich menu (ถ้าตั้งค่า env ครบ)
        if ($ACCESS_TOKEN !== '' && $targetRichMenuId !== '') {
            try {
                $lineService = new LineService($ACCESS_TOKEN);
                $richMenuResult = $lineService->setUserRichMenu($lineUserId, $targetRichMenuId);

                // ✅ เช็คซ้ำว่าตอนนี้ user ได้ richmenu อะไรจริง (debug โหดมาก)
                $check = $lineService->getUserRichMenuId($lineUserId);

            } catch (Throwable $e) {
                // ไม่ให้ login fail เพราะเมนูเปลี่ยนไม่ได้
                $richMenuResult = [
                    'ok' => false,
                    'http' => 0,
                    'error' => $e->getMessage(),
                ];
            }
        } else {
            $richMenuResult = [
                'ok' => false,
                'http' => 0,
                'error' => 'Missing LINE_CHANNEL_ACCESS_TOKEN or target richmenu id in .env',
            ];
        }

        $ctx = $this->detectInternalExternal($person);

        $payload = [
            "status" => "active",
            "token" => $token,
            "user" => [
                "user_id" => $userId,
                "line_user_id" => $lineUserId,
                "line_user_name" => $lineUserName,
            ],
            "person" => $person,
        ];

        if ($this->isDebug()) {
            $payload["rich_menu"] = [
                "is_internal" => $isInternal,
                "organization_type_id" => $orgTypeId,
                "internal_type_id" => (int) $ctx['internal_type_id'],
                "target_richmenu_id" => $targetRichMenuId,
                "result" => $richMenuResult,
                "check" => $check,
            ];
        }

        ok($payload, "Login with LINE success");

    }


    /**
     * POST /auth/login
     * LINE-only login (alias ไปที่ lineLogin)
     * body: { line_user_id, line_user_name }
     */
    public function login(): void
    {
        // ใช้ logic เดียวกับ lineLogin เพื่อไม่ซ้ำซ้อน
        $this->lineLogin();
    }


    /**
     * POST /auth/register
     * body:
     * {
     *   line_user_id, line_user_name,
     *   first_name_th, last_name_th,
     *   position_title_id, department_id, organization_id (ถ้าใช้)
     * }
     *
     * ต้องบันทึก:
     * - user (role=user อัตโนมัติ)
     * - person (is_active=0)
     * - notification (notification_type_id=1)
     */
    public function register(): void
    {
        $body = read_json_body();

        $missing = require_fields($body, [
            'line_user_id',
            'line_user_name',
            'first_name_th',
            'last_name_th',
            'person_prefix_id',
            'position_title_id',
            'department_id',
            'organization_id'
        ]);
        if ($missing)
            fail("Missing fields", 422, $missing);

        $lineUserId = trim((string) $body['line_user_id']);
        $lineUserName = trim((string) $body['line_user_name']);
        $firstNameTh = trim((string) $body['first_name_th']);
        $lastNameTh = trim((string) $body['last_name_th']);

        $personPrefixId = (int) ($body['person_prefix_id'] ?? 0);
        $positionTitleId = (int) ($body['position_title_id'] ?? 0);
        $departmentId = (int) ($body['department_id'] ?? 0);

        $organizationId = null;
        if (isset($body['organization_id']) && ctype_digit((string) $body['organization_id'])) {
            $organizationId = (int) $body['organization_id'];
        }

        if ($lineUserId === '' || $firstNameTh === '' || $lastNameTh === '') {
            fail("Invalid fields", 422);
        }
        if ($personPrefixId <= 0)
            fail("Invalid person_prefix_id", 422);
        if ($positionTitleId <= 0)
            fail("Invalid position_title_id", 422);
        if ($departmentId <= 0)
            fail("Invalid department_id", 422);
        if ($organizationId === null || $organizationId <= 0)
            fail("Invalid organization_id", 422);

        $userModel = new UserModel($this->pdo);

        // หา role id ของ 'user'
        // ===== กำหนด role จาก organization_type =====
        $userRoleModel = new UserRoleModel($this->pdo);

        // default = USER
        $roleUserId = 1;
        $roleStaffId = 2;

        // พยายาม map จาก code ใน DB (กรณี code เป็น USER/STAFF)
        try {
            $r1 = $userRoleModel->findByCode('USER');
            if ($r1 && isset($r1['user_role_id']))
                $roleUserId = (int) $r1['user_role_id'];

            $r2 = $userRoleModel->findByCode('STAFF');
            if ($r2 && isset($r2['user_role_id']))
                $roleStaffId = (int) $r2['user_role_id'];
        } catch (Throwable $e) {
            // ถ้าหาไม่เจอ ก็ใช้ค่า default 1/2 ตามตาราง
        }

        $roleId = $roleUserId; // เริ่มต้นเป็น USER

        // ถ้าเลือก organization มาแล้ว ให้ตัดสิน role
        if ($organizationId !== null) {
            $orgModel = new OrganizationModel($this->pdo);
            $org = $orgModel->findById($organizationId);

            $orgTypeId = (int) ($org['organization_type_id'] ?? 0);

            // internal user => STAFF
            if ($orgTypeId === 1) {
                $roleId = $roleStaffId;
            } else {
                $roleId = $roleUserId;
            }
        }

        // กันสมัครซ้ำ
        $existing = $userModel->findByLineUserId($lineUserId);
        if ($existing) {
            $existingUserId = (int) $existing['user_id'];

            // อัปเดต role ตามหน่วยงานที่เลือก (กันเคสเดิมเคยเป็น USER แล้วไม่เปลี่ยน)
            try {
                $userModel->updateRole($existingUserId, $roleId);
            } catch (Throwable $e) {
                // ไม่ต้อง fail ก็ได้ แต่อยาก strict ก็ fail ได้
            }

            ok([
                "status" => "exists",
                "user_id" => $existingUserId,
                "updated_role_id" => $roleId
            ], "User already exists");
        }


        $this->pdo->beginTransaction();
        try {
            // 1) insert user
            $newUserId = $userModel->createFromLine($lineUserId, $lineUserName, $roleId);

            // 2) insert person (is_active=0)
            $personModel = new PersonModel($this->pdo);
            $personModel->create([
                "person_user_id" => $newUserId,
                "person_prefix_id" => $personPrefixId,
                "first_name_th" => $firstNameTh,
                "last_name_th" => $lastNameTh,
                "department_id" => $departmentId,
                "position_title_id" => $positionTitleId,
                "organization_id" => $organizationId,
                "is_active" => 0,
            ]);

            // 3) insert notification
            $notificationModel = new NotificationModel($this->pdo);
            $message = "มีคำขอสมัครสมาชิกใหม่ รอการอนุมัติ: {$firstNameTh} {$lastNameTh} (LINE: {$lineUserName})";
            $notificationId = $notificationModel->createUserRegistrationPending([
                "message" => $message
            ]);

            $this->pdo->commit();

            ok([
                "status" => "pending",
                "user_id" => $newUserId,
                "notification_id" => $notificationId
            ], "Register success, pending approval");
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            fail("Register failed", 500, [
                'message' => 'Register failed',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }

    private function isDebug(): bool
    {
        $v = getenv('APP_DEBUG') ?: '';
        return $v === '1' || strtolower($v) === 'true';
    }

    /**
     * เปลี่ยน richmenu ให้ user โดยไม่ทำให้ flow หลักล้ม
     * คืน array ผลลัพธ์ไว้สำหรับ debug เท่านั้น
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

            // เคลียร์ก่อนลิงก์ (กันค้าง)
            $lineService->unlinkRichMenuFromUser($lineUserId);

            return $lineService->linkRichMenuToUser($lineUserId, $targetRichMenuId);
        } catch (Throwable $e) {
            return [
                'ok' => false,
                'http' => 0,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * ตัดสิน internal/external จาก user_role (แนะนำ)
     * - STAFF => internal
     * - USER  => external
     */
    private function detectIsInternal(array $user): bool
    {
        $userRoleId = (int) ($user['user_role_id'] ?? 0);

        // map จาก code ใน DB เพื่อกัน ID เปลี่ยน
        $roleStaffId = 2;
        try {
            $urm = new UserRoleModel($this->pdo);
            $r = $urm->findByCode('STAFF');
            if ($r && isset($r['user_role_id'])) {
                $roleStaffId = (int) $r['user_role_id'];
            }
        } catch (Throwable $e) {
            // fallback ใช้ 2
        }

        return $userRoleId === $roleStaffId;
    }

    /**
     * ตัดสิน internal/external จาก organization_type_id
     * - ตั้งค่า internal type id ได้ใน .env: ORG_TYPE_INTERNAL_ID=1
     */
    private function detectInternalExternal(array $person): array
    {
        $internalTypeId = (int) (getenv('ORG_TYPE_INTERNAL_ID') ?: 1);

        $orgTypeId = 0;
        $isInternal = false;

        $organizationId = (int) ($person['organization_id'] ?? 0);
        if ($organizationId > 0) {
            try {
                $orgModel = new OrganizationModel($this->pdo);
                $org = $orgModel->findById($organizationId);
                $orgTypeId = (int) ($org['organization_type_id'] ?? 0);
                $isInternal = ($orgTypeId === $internalTypeId);
            } catch (Throwable $e) {
                // อ่าน org ไม่ได้ -> ถือว่า external
                $isInternal = false;
            }
        }

        return [
            'is_internal' => $isInternal,
            'organization_type_id' => $orgTypeId,
            'internal_type_id' => $internalTypeId,
        ];
    }



}
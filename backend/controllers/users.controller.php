<?php
// backend/controllers/users.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';

require_once __DIR__ . '/../models/UsersModel.php';
require_once __DIR__ . '/../models/PersonModel.php';

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

class UsersController
{
    /** @var UsersModel */
    private $model;

    /** @var PDO */
    private $pdo;



    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
        $this->model = new UsersModel($pdo);
    }

    /**
     * GET /users/participants
     * Returns list of users eligible as event participants (role_id 2,3).
     */
    public function participants(): void
    {
        try {
            $this->requireStaffAccess();

            $stmt = $this->pdo->query("SELECT user_id, line_user_id, line_user_name, user_role_id FROM `user` WHERE user_role_id IN (2,3) ORDER BY user_role_id DESC, line_user_name ASC, user_id ASC");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

            json_response(['error' => false, 'data' => $rows], 200);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to list participants',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /users/options
     * Returns lightweight user options for checkbox/select usage.
     * Requirement: allow listing users of all roles (staff/admin/user/etc.).
     */
    public function options(): void
    {
        try {
            $this->requireStaffAccess();

            $sql = "
                SELECT
                    u.user_id,
                    u.user_role_id,
                    u.line_user_id,
                    u.line_user_name,
                    p.display_name,
                    p.first_name_th,
                    p.last_name_th
                FROM `user` u
                LEFT JOIN person p
                    ON p.person_user_id = u.user_id
                ORDER BY
                    u.user_role_id DESC,
                    COALESCE(p.display_name, u.line_user_name, '') ASC,
                    u.user_id ASC
            ";
            $stmt = $this->pdo->query($sql);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

            json_response(['error' => false, 'data' => $rows], 200);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to list user options',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    private function requireStaffAccess(): void
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

    /**
     * GET /users?q=&organization_id=&department_id=&position_title_id=&page=&limit=
     */
    public function list(): void
    {
        try {
            $params = [
                'q' => isset($_GET['q']) ? (string) $_GET['q'] : '',
                'organization_id' => isset($_GET['organization_id']) ? (string) $_GET['organization_id'] : null,
                'department_id' => isset($_GET['department_id']) ? (string) $_GET['department_id'] : null,
                'position_title_id' => isset($_GET['position_title_id']) ? (string) $_GET['position_title_id'] : null,
                'page' => isset($_GET['page']) ? (int) $_GET['page'] : 1,
                'limit' => isset($_GET['limit']) ? (int) $_GET['limit'] : 50,
            ];

            $data = $this->model->list($params);
            json_response($data, 200);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to list users',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /users/{person_id}
     */
    public function get(int $personId): void
    {
        try {
            if ($personId <= 0) {
                json_response(['error' => true, 'message' => 'Invalid person_id'], 400);
                return;
            }

            $row = $this->model->findDetail($personId);
            if (!$row) {
                json_response(['error' => true, 'message' => 'User not found'], 404);
                return;
            }

            json_response($row, 200);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to get user',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /users
     * body (JSON):
     * - line_user_id?, line_user_name?
     * - user_role_id (required)
     * - person_prefix_id (required)
     * - first_name_th (required)
     * - last_name_th (required)
     * - first_name_en?, last_name_en?, display_name?
     * - organization_id (required)
     * - department_id (required)
     * - position_title_id (required)
     * - photo_path?, is_active?, start_date?, end_date?
     */
    public function create(): void
    {
        try {
            $body = read_json_body();

            // validate required
            $errors = [];

            if (!isset($body['user_role_id']) || !is_numeric($body['user_role_id']))
                $errors[] = 'user_role_id is required';
            if (!isset($body['person_prefix_id']) || !is_numeric($body['person_prefix_id']))
                $errors[] = 'person_prefix_id is required';
            if (!isset($body['first_name_th']) || trim((string) $body['first_name_th']) === '')
                $errors[] = 'first_name_th is required';
            if (!isset($body['last_name_th']) || trim((string) $body['last_name_th']) === '')
                $errors[] = 'last_name_th is required';
            if (!isset($body['organization_id']) || !is_numeric($body['organization_id']))
                $errors[] = 'organization_id is required';
            if (!isset($body['department_id']) || !is_numeric($body['department_id']))
                $errors[] = 'department_id is required';
            if (!isset($body['position_title_id']) || !is_numeric($body['position_title_id']))
                $errors[] = 'position_title_id is required';

            if (!empty($errors)) {
                json_response([
                    'error' => true,
                    'message' => 'Validation failed',
                    'errors' => $errors
                ], 422);
                return;
            }

            $payload = [
                'line_user_id' => (string) ($body['line_user_id'] ?? ''),
                'line_user_name' => (string) ($body['line_user_name'] ?? ''),
                'user_role_id' => (int) $body['user_role_id'],

                'person_prefix_id' => (int) $body['person_prefix_id'],
                'first_name_th' => (string) ($body['first_name_th'] ?? ''),
                'last_name_th' => (string) ($body['last_name_th'] ?? ''),
                'first_name_en' => (string) ($body['first_name_en'] ?? ''),
                'last_name_en' => (string) ($body['last_name_en'] ?? ''),
                'display_name' => (string) ($body['display_name'] ?? ''),

                'organization_id' => (int) $body['organization_id'],
                'department_id' => (int) $body['department_id'],
                'position_title_id' => (int) $body['position_title_id'],

                'photo_path' => (string) ($body['photo_path'] ?? ''),
                'is_active' => isset($body['is_active']) ? (int) $body['is_active'] : 0,
                'start_date' => $body['start_date'] ?? null,
                'end_date' => $body['end_date'] ?? null,
            ];

            $personId = $this->model->create($payload);

            json_response([
                'ok' => true,
                'person_id' => $personId
            ], 201);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to create user',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PUT /users/{person_id}
     * body (JSON): ฟิลด์เดียวกับ create (ส่งเฉพาะที่แก้ก็ได้)
     */
    public function update(int $personId): void
    {
        try {
            if ($personId <= 0) {
                json_response(['error' => true, 'message' => 'Invalid person_id'], 400);
                return;
            }

            $old = $this->model->findDetail($personId);
            if (!$old) {
                json_response(['error' => true, 'message' => 'User not found'], 404);
                return;
            }

            $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
            $isMultipart = stripos($contentType, 'multipart/form-data') !== false;

            if ($isMultipart) {
                $body = $_POST; // multipart จะมาอยู่ใน $_POST
            } else {
                $body = read_json_body(); // json
            }

            $body = read_json_body();

            // อนุญาต partial update แต่ถ้าส่งมาแล้วต้องถูกชนิด
            $errors = [];

            $intFields = [
                'user_role_id',
                'person_prefix_id',
                'organization_id',
                'department_id',
                'position_title_id',
                'is_active',
            ];
            foreach ($intFields as $f) {
                if (array_key_exists($f, $body) && $body[$f] !== null && $body[$f] !== '' && !is_numeric($body[$f])) {
                    $errors[] = "$f must be a number";
                }
            }

            if (array_key_exists('first_name_th', $body) && trim((string) $body['first_name_th']) === '')
                $errors[] = 'first_name_th cannot be empty';
            if (array_key_exists('last_name_th', $body) && trim((string) $body['last_name_th']) === '')
                $errors[] = 'last_name_th cannot be empty';

            if (!empty($errors)) {
                json_response([
                    'error' => true,
                    'message' => 'Validation failed',
                    'errors' => $errors
                ], 422);
                return;
            }

            $payload = [];

            // user table
            if (array_key_exists('line_user_id', $body))
                $payload['line_user_id'] = (string) $body['line_user_id'];
            if (array_key_exists('line_user_name', $body))
                $payload['line_user_name'] = (string) $body['line_user_name'];
            if (array_key_exists('user_role_id', $body))
                $payload['user_role_id'] = (int) $body['user_role_id'];

            // person table
            if (array_key_exists('person_prefix_id', $body))
                $payload['person_prefix_id'] = (int) $body['person_prefix_id'];
            if (array_key_exists('first_name_th', $body))
                $payload['first_name_th'] = (string) $body['first_name_th'];
            if (array_key_exists('last_name_th', $body))
                $payload['last_name_th'] = (string) $body['last_name_th'];
            if (array_key_exists('first_name_en', $body))
                $payload['first_name_en'] = (string) $body['first_name_en'];
            if (array_key_exists('last_name_en', $body))
                $payload['last_name_en'] = (string) $body['last_name_en'];
            if (array_key_exists('display_name', $body))
                $payload['display_name'] = (string) $body['display_name'];

            if (array_key_exists('organization_id', $body))
                $payload['organization_id'] = (int) $body['organization_id'];
            if (array_key_exists('department_id', $body))
                $payload['department_id'] = (int) $body['department_id'];
            if (array_key_exists('position_title_id', $body))
                $payload['position_title_id'] = (int) $body['position_title_id'];

            if (array_key_exists('photo_path', $body))
                $payload['photo_path'] = (string) $body['photo_path'];
            if (array_key_exists('is_active', $body))
                $payload['is_active'] = (int) $body['is_active'];
            if (array_key_exists('start_date', $body))
                $payload['start_date'] = $body['start_date'];
            if (array_key_exists('end_date', $body))
                $payload['end_date'] = $body['end_date'];

            // ✅ ล้างรูป (จาก flag)
            $wantClear = isset($body['photo_clear']) && (string) $body['photo_clear'] === '1';
            if ($wantClear) {
                $this->deleteOldProfileIfLocal($old['photo_path'] ?? null);
                $payload['photo_path'] = '';
            }

            // ✅ อัปโหลดรูปใหม่ (field name: photo_file)
            if ($isMultipart && isset($_FILES['photo_file']) && ($_FILES['photo_file']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
                // ลบรูปเก่าก่อน (ถ้ามี)
                $this->deleteOldProfileIfLocal($old['photo_path'] ?? null);

                $newPath = $this->saveProfileUpload($personId, $_FILES['photo_file']);
                if ($newPath) {
                    $payload['photo_path'] = $newPath;
                }
            }

            $ok = $this->model->update($personId, $payload);
            if (!$ok) {
                json_response(['error' => true, 'message' => 'User not found'], 404);
                return;
            }

            $fresh = $this->model->findDetail($personId);

            json_response(['ok' => true], 200);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to update user',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /users/{person_id}
     */
    public function delete(int $personId): void
    {
        try {
            if ($personId <= 0) {
                json_response(['error' => true, 'message' => 'Invalid person_id'], 400);
                return;
            }

            $ok = $this->model->delete($personId);
            if (!$ok) {
                json_response(['error' => true, 'message' => 'User not found'], 404);
                return;
            }

            json_response(['ok' => true], 200);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to delete user',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    private function saveProfileUpload(int $personId, array $file): ?string
    {
        if (!isset($file['error']) || $file['error'] !== UPLOAD_ERR_OK)
            return null;
        if (!is_uploaded_file($file['tmp_name']))
            return null;

        // จำกัดชนิดไฟล์ (ปลอดภัย)
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        $allow = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
        ];
        if (!isset($allow[$mime])) {
            throw new RuntimeException('รูปต้องเป็น .jpg .png .webp เท่านั้น');
        }

        // จำกัดขนาด (ตัวอย่าง 3MB)
        $max = 3 * 1024 * 1024;
        if (($file['size'] ?? 0) > $max) {
            throw new RuntimeException('ไฟล์รูปใหญ่เกิน 3MB');
        }

        $ext = $allow[$mime];

        // โฟลเดอร์ปลายทาง: backend/public/uploads/profiles
        $dir = __DIR__ . '/../public/uploads/profiles';
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }

        $name = 'u_' . $personId . '_' . date('Ymd_His') . '.' . $ext;
        $dest = $dir . '/' . $name;

        if (!move_uploaded_file($file['tmp_name'], $dest)) {
            throw new RuntimeException('อัปโหลดรูปไม่สำเร็จ');
        }

        // ✅ ค่าที่เก็บลง DB (แนะนำเก็บเป็น path ที่เรียกได้จาก backend/public)
        // เข้าถึงได้ที่: /ict/backend/public/uploads/profiles/xxxx.png (ตามโครงของคุณ)
        return '/uploads/profiles/' . $name;
    }

    private function deleteOldProfileIfLocal(?string $photoPath): void
    {
        if (!$photoPath)
            return;
        // เก็บแบบ /uploads/profiles/xxx -> ลบได้
        if (strpos($photoPath, '/uploads/profiles/') !== 0)
            return;

        $full = __DIR__ . '/../public' . $photoPath; // /public + /uploads/...
        if (is_file($full))
            @unlink($full);
    }

}

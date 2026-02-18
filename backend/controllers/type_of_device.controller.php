<?php
// backend/controllers/type_of_device.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../models/TypeOfDeviceModel.php';

final class TypeOfDeviceController
{
    public function __construct(private PDO $pdo)
    {
    }

    /**
     * GET /type-of-device?q=&page=&limit=
     */
    public function index(): void
    {
        try {
            $q = trim((string)($_GET['q'] ?? ''));
            $page = (int)($_GET['page'] ?? 1);
            $limit = (int)($_GET['limit'] ?? 50);

            $model = new TypeOfDeviceModel($this->pdo);

            $items = $model->list($q, $page, $limit);
            $total = $model->count($q);

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
                'message' => 'Failed to get type of device',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /type-of-device/{id}
     */
    public function show(int $id): void
    {
        try {
            $model = new TypeOfDeviceModel($this->pdo);
            $row = $model->find($id);

            if (!$row) {
                json_response([
                    'error' => true,
                    'message' => 'Type of device not found',
                ], 404);
            }

            json_response([
                'error' => false,
                'data' => $row,
            ]);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to get type of device',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /type-of-device
     * Body JSON:
     * {
     *   "type_of_device_title": "Router",
     *   "has_network": 1,
     *   "icon_path_online": "...",
     *   "icon_path_offline": "..."
     * }
     */
    public function create(): void
    {
        try {
            $body = $this->readJsonBody();

            $title = trim((string)($body['type_of_device_title'] ?? ''));
            $hasNetwork = $this->normalizeBool01($body['has_network'] ?? 0);
            $iconOnline = $this->normalizeNullableText($body['icon_path_online'] ?? '');
            $iconOffline = $this->normalizeNullableText($body['icon_path_offline'] ?? '');

            $errors = [];
            if ($title === '') $errors['type_of_device_title'] = 'required';

            if (!empty($errors)) {
                json_response([
                    'error' => true,
                    'message' => 'Validation failed',
                    'fields' => $errors,
                ], 422);
            }

            $model = new TypeOfDeviceModel($this->pdo);
            $newId = $model->create([
                'type_of_device_title' => $title,
                'has_network' => $hasNetwork,
                'icon_path_online' => $iconOnline,
                'icon_path_offline' => $iconOffline,
            ]);

            $row = $model->find($newId);

            json_response([
                'error' => false,
                'message' => 'Created',
                'data' => $row,
            ], 201);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to create type of device',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PUT /type-of-device/{id}
     */
    public function update(int $id): void
    {
        try {
            $model = new TypeOfDeviceModel($this->pdo);
            $exists = $model->find($id);

            if (!$exists) {
                json_response([
                    'error' => true,
                    'message' => 'Type of device not found',
                ], 404);
            }

            $body = $this->readJsonBody();

            $title = trim((string)($body['type_of_device_title'] ?? ''));
            $hasNetwork = $this->normalizeBool01($body['has_network'] ?? 0);
            $iconOnline = $this->normalizeNullableText($body['icon_path_online'] ?? '');
            $iconOffline = $this->normalizeNullableText($body['icon_path_offline'] ?? '');

            $errors = [];
            if ($title === '') $errors['type_of_device_title'] = 'required';

            if (!empty($errors)) {
                json_response([
                    'error' => true,
                    'message' => 'Validation failed',
                    'fields' => $errors,
                ], 422);
            }

            $ok = $model->update($id, [
                'type_of_device_title' => $title,
                'has_network' => $hasNetwork,
                'icon_path_online' => $iconOnline,
                'icon_path_offline' => $iconOffline,
            ]);

            // ถ้า rowCount=0 (ส่งค่าเดิม) ก็ยังถือว่า ok
            $row = $model->find($id);

            json_response([
                'error' => false,
                'message' => $ok ? 'Updated' : 'No changes',
                'data' => $row,
            ]);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to update type of device',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /type-of-device/{id}
     */
    public function delete(int $id): void
    {
        try {
            $model = new TypeOfDeviceModel($this->pdo);

            $exists = $model->find($id);
            if (!$exists) {
                json_response([
                    'error' => true,
                    'message' => 'Type of device not found',
                ], 404);
            }

            $ok = $model->delete($id);

            json_response([
                'error' => false,
                'message' => $ok ? 'Deleted' : 'Delete failed',
            ]);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to delete type of device',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /type-of-device/upload-icon
     * multipart/form-data:
     * - file: (image)
     *
     * Response:
     * { error: false, data: { path: "/uploads/device_icon/xxx.png", filename: "xxx.png" } }
     */
    public function uploadIcon(): void
    {
        try {
            if (!isset($_FILES['file'])) {
                json_response([
                    'error' => true,
                    'message' => 'Missing file',
                ], 400);
            }

            $file = $_FILES['file'];
            if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
                $code = (int)($file['error'] ?? UPLOAD_ERR_NO_FILE);
                json_response([
                    'error' => true,
                    'message' => 'Upload failed',
                    'code' => $code,
                ], 400);
            }

            if (!is_uploaded_file((string)($file['tmp_name'] ?? ''))) {
                json_response([
                    'error' => true,
                    'message' => 'Invalid upload',
                ], 400);
            }

            // จำกัดชนิดไฟล์ (ปลอดภัย)
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mime = finfo_file($finfo, (string)$file['tmp_name']);
            finfo_close($finfo);

            $allow = [
                'image/jpeg' => 'jpg',
                'image/png' => 'png',
                'image/webp' => 'webp',
            ];
            if (!isset($allow[$mime])) {
                json_response([
                    'error' => true,
                    'message' => 'File must be .jpg .png .webp only',
                    'mime' => $mime,
                ], 422);
            }

            // จำกัดขนาด (ตัวอย่าง 2MB)
            $max = 2 * 1024 * 1024;
            if (((int)($file['size'] ?? 0)) > $max) {
                json_response([
                    'error' => true,
                    'message' => 'File too large (max 2MB)',
                ], 422);
            }

            $ext = $allow[$mime];

            // โฟลเดอร์ปลายทาง: backend/public/uploads/device_icon
            $dir = __DIR__ . '/../public/uploads/device_icon';
            if (!is_dir($dir)) {
                mkdir($dir, 0775, true);
            }

            $rand = bin2hex(random_bytes(8));
            $name = 'device_' . date('Ymd_His') . '_' . $rand . '.' . $ext;
            $dest = $dir . '/' . $name;

            if (!move_uploaded_file((string)$file['tmp_name'], $dest)) {
                json_response([
                    'error' => true,
                    'message' => 'Could not move uploaded file',
                ], 500);
            }

            $path = '/uploads/device_icon/' . $name;
            json_response([
                'error' => false,
                'message' => 'Uploaded',
                'data' => [
                    'path' => $path,
                    'filename' => $name,
                ],
            ], 201);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to upload icon',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    // --------------------
    // Helpers
    // --------------------

    /**
     * @return array<string,mixed>
     */
    private function readJsonBody(): array
    {
        $raw = (string)file_get_contents('php://input');
        $raw = trim($raw);

        if ($raw === '') return [];

        $data = json_decode($raw, true);
        if (!is_array($data)) {
            json_response([
                'error' => true,
                'message' => 'Invalid JSON body',
            ], 400);
        }

        /** @var array<string,mixed> $data */
        return $data;
    }

    private function normalizeBool01(mixed $v): int
    {
        // รองรับ 1/"1"/true/"true"/"on"
        if (is_bool($v)) return $v ? 1 : 0;
        $s = strtolower(trim((string)$v));
        if ($s === '1' || $s === 'true' || $s === 'on' || $s === 'yes') return 1;
        return 0;
    }

    private function normalizeNullableText(mixed $v): string
    {
        // ถ้าอยากให้ null ก็ปรับได้ แต่ตอนนี้เก็บเป็น string ให้ชัวร์
        return trim((string)$v);
    }
}

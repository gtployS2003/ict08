<?php
// backend/controllers/template_types.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../models/TemplateTypeModel.php';

final class TemplateTypesController
{
    public function __construct(private PDO $pdo)
    {
    }

    /**
     * GET /template-types?q=&page=&limit=
     */
    public function index(): void
    {
        try {
            $q = trim((string)($_GET['q'] ?? ''));
            $page = (int)($_GET['page'] ?? 1);
            $limit = (int)($_GET['limit'] ?? 50);

            $model = new TemplateTypeModel($this->pdo);
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
                'message' => 'Failed to get template types',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /template-types/{id}
     */
    public function show(int $id): void
    {
        try {
            $model = new TemplateTypeModel($this->pdo);
            $row = $model->find($id);

            if (!$row) {
                json_response([
                    'error' => true,
                    'message' => 'Template type not found',
                ], 404);
            }

            json_response([
                'error' => false,
                'data' => $row,
            ]);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to get template type',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /template-types
     * JSON body
     */
    public function create(): void
    {
        try {
            $body = $this->readJsonBody();

            $name = trim((string)($body['template_name'] ?? ''));
            $detail = (string)($body['detail'] ?? '');

            if ($name === '') {
                json_response([
                    'error' => true,
                    'message' => 'Validation failed',
                    'fields' => ['template_name' => 'required'],
                ], 422);
            }

            // If canvas not provided, try compute from bg
            $bgFilepath = (string)($body['bg_filepath'] ?? '');
            $cw = (int)($body['canvas_width'] ?? 0);
            $ch = (int)($body['canvas_height'] ?? 0);

            if (($cw <= 0 || $ch <= 0) && $bgFilepath !== '') {
                $dims = $this->tryGetImageDimsFromPublicPath($bgFilepath);
                if ($dims) {
                    $cw = $dims['width'];
                    $ch = $dims['height'];
                }
            }

            $uid = $this->getAuthUserId();

            $model = new TemplateTypeModel($this->pdo);
            $newId = $model->create([
                'template_name' => $name,
                'detail' => $detail,

                'bg_filepath' => (string)($body['bg_filepath'] ?? ''),
                'bg_original_filename' => (string)($body['bg_original_filename'] ?? ''),
                'bg_stored_filename' => (string)($body['bg_stored_filename'] ?? ''),
                'bg_file_size' => (int)($body['bg_file_size'] ?? 0),
                'bg_uploaded_by' => (int)($body['bg_uploaded_by'] ?? $uid),
                // allow client pass an ISO-ish string; if empty use NOW from DB columns? here keep string
                'bg_uploaded_at' => (string)($body['bg_uploaded_at'] ?? ''),

                'canvas_width' => $cw,
                'canvas_height' => $ch,
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
                'message' => 'Failed to create template type',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PUT /template-types/{id}
     */
    public function update(int $id): void
    {
        try {
            $model = new TemplateTypeModel($this->pdo);
            $exists = $model->find($id);
            if (!$exists) {
                json_response([
                    'error' => true,
                    'message' => 'Template type not found',
                ], 404);
            }

            $body = $this->readJsonBody();

            $name = trim((string)($body['template_name'] ?? ''));
            $detail = (string)($body['detail'] ?? '');

            if ($name === '') {
                json_response([
                    'error' => true,
                    'message' => 'Validation failed',
                    'fields' => ['template_name' => 'required'],
                ], 422);
            }

            $bgFilepath = (string)($body['bg_filepath'] ?? ($exists['bg_filepath'] ?? ''));
            $cw = (int)($body['canvas_width'] ?? ($exists['canvas_width'] ?? 0));
            $ch = (int)($body['canvas_height'] ?? ($exists['canvas_height'] ?? 0));

            if (($cw <= 0 || $ch <= 0) && $bgFilepath !== '') {
                $dims = $this->tryGetImageDimsFromPublicPath($bgFilepath);
                if ($dims) {
                    $cw = $dims['width'];
                    $ch = $dims['height'];
                }
            }

            $uid = $this->getAuthUserId();

            $ok = $model->update($id, [
                'template_name' => $name,
                'detail' => $detail,

                'bg_filepath' => $bgFilepath,
                'bg_original_filename' => (string)($body['bg_original_filename'] ?? ($exists['bg_original_filename'] ?? '')),
                'bg_stored_filename' => (string)($body['bg_stored_filename'] ?? ($exists['bg_stored_filename'] ?? '')),
                'bg_file_size' => (int)($body['bg_file_size'] ?? ($exists['bg_file_size'] ?? 0)),
                'bg_uploaded_by' => (int)($body['bg_uploaded_by'] ?? ($exists['bg_uploaded_by'] ?? $uid)),
                'bg_uploaded_at' => (string)($body['bg_uploaded_at'] ?? ($exists['bg_uploaded_at'] ?? '')),

                'canvas_width' => $cw,
                'canvas_height' => $ch,
            ]);

            $row = $model->find($id);

            json_response([
                'error' => false,
                'message' => $ok ? 'Updated' : 'No changes',
                'data' => $row,
            ]);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to update template type',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /template-types/{id}
     */
    public function delete(int $id): void
    {
        try {
            $model = new TemplateTypeModel($this->pdo);
            $row = $model->find($id);
            if (!$row) {
                json_response([
                    'error' => true,
                    'message' => 'Template type not found',
                ], 404);
            }

            // best-effort delete file
            $fp = (string)($row['bg_filepath'] ?? '');
            $abs = $this->toPublicUploadAbsPath($fp);
            if ($abs && is_file($abs)) {
                @unlink($abs);
            }

            $ok = $model->delete($id);

            json_response([
                'error' => false,
                'message' => $ok ? 'Deleted' : 'Delete failed',
            ]);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to delete template type',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /template-types/upload-bg
     * multipart/form-data: file
     */
    public function uploadBg(): void
    {
        try {
            $uid = $this->getAuthUserId();

            if (!isset($_FILES['file'])) {
                json_response(['error' => true, 'message' => 'Missing file'], 400);
            }

            $file = $_FILES['file'];
            if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
                $code = (int)($file['error'] ?? UPLOAD_ERR_NO_FILE);
                json_response(['error' => true, 'message' => 'Upload failed', 'code' => $code], 400);
            }

            $tmp = (string)($file['tmp_name'] ?? '');
            if ($tmp === '' || !is_uploaded_file($tmp)) {
                json_response(['error' => true, 'message' => 'Invalid upload'], 400);
            }

            $original = (string)($file['name'] ?? '');
            $size = (int)($file['size'] ?? 0);

            $max = 10 * 1024 * 1024; // 10MB
            if ($size <= 0 || $size > $max) {
                json_response(['error' => true, 'message' => 'File too large (max 10MB)'], 422);
            }

            $allow = [
                'image/jpeg' => 'jpg',
                'image/png' => 'png',
                'image/webp' => 'webp',
            ];

            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mime = $tmp !== '' ? (string)finfo_file($finfo, $tmp) : '';
            finfo_close($finfo);

            if (!isset($allow[$mime])) {
                json_response([
                    'error' => true,
                    'message' => 'File must be .jpg .png .webp only',
                    'mime' => $mime,
                ], 422);
            }

            $ext = $allow[$mime];

            $rand = bin2hex(random_bytes(8));
            $stored = 'tplbg_' . date('Ymd_His') . '_' . $rand . '.' . $ext;

            $dir = __DIR__ . '/../public/uploads/template_bg';
            if (!is_dir($dir)) {
                if (!@mkdir($dir, 0775, true) && !is_dir($dir)) {
                    throw new RuntimeException('Cannot create directory: ' . $dir);
                }
            }
            @chmod($dir, 0775);
            if (!is_writable($dir)) {
                throw new RuntimeException('Upload directory not writable: ' . $dir);
            }

            $dest = $dir . '/' . $stored;
            if (!@move_uploaded_file($tmp, $dest)) {
                throw new RuntimeException('move_uploaded_file failed to: ' . $dest);
            }

            $dims = @getimagesize($dest);
            if (!is_array($dims) || empty($dims[0]) || empty($dims[1])) {
                @unlink($dest);
                json_response([
                    'error' => true,
                    'message' => 'Cannot read image dimensions',
                ], 422);
            }

            $width = (int)$dims[0];
            $height = (int)$dims[1];

            $path = '/uploads/template_bg/' . $stored;

            json_response([
                'error' => false,
                'message' => 'Uploaded',
                'data' => [
                    'path' => $path,
                    'original_filename' => $original,
                    'stored_filename' => $stored,
                    'file_size' => $size,
                    'uploaded_by' => $uid,
                    'uploaded_at' => date('Y-m-d H:i:s'),
                    'canvas_width' => $width,
                    'canvas_height' => $height,
                ],
            ], 201);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to upload background',
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
            json_response(['error' => true, 'message' => 'Invalid JSON body'], 400);
        }

        /** @var array<string,mixed> $data */
        return $data;
    }

    private function getAuthUserId(): int
    {
        try {
            if (function_exists('get_auth_user')) {
                $u = get_auth_user($this->pdo);
                if (is_array($u) && isset($u['user_id'])) {
                    $id = (int)$u['user_id'];
                    return $id > 0 ? $id : 0;
                }
            }
        } catch (Throwable) {
            // best-effort only
        }
        return 0;
    }

    /**
     * @return array{width:int,height:int}|null
     */
    private function tryGetImageDimsFromPublicPath(string $filepath): ?array
    {
        $abs = $this->toPublicUploadAbsPath($filepath);
        if (!$abs || !is_file($abs)) return null;

        $dims = @getimagesize($abs);
        if (!is_array($dims) || empty($dims[0]) || empty($dims[1])) return null;

        return ['width' => (int)$dims[0], 'height' => (int)$dims[1]];
    }

    private function toPublicUploadAbsPath(string $filepath): ?string
    {
        $fp = trim($filepath);
        if ($fp === '') return null;
        $fp = ltrim($fp, '/');
        if (!str_starts_with($fp, 'uploads/')) return null;
        if (str_contains($fp, '..')) return null;
        return __DIR__ . '/../public/' . $fp;
    }
}

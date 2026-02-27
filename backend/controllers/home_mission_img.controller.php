<?php
// backend/controllers/home_mission_img.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../models/HomeMissionImgModel.php';

final class HomeMissionImgController
{
    public function __construct(private PDO $pdo)
    {
    }

    /**
     * GET /home-mission-img?q=&page=&limit=&public=1
     * - public=1 -> no auth, return max 3 images for homepage
     * - otherwise -> admin list with search/pagination
     */
    public function index(): void
    {
        $public = (int)($_GET['public'] ?? 0) === 1;
        $model = new HomeMissionImgModel($this->pdo);

        if ($public) {
            $limit = (int)($_GET['limit'] ?? 3);
            $items = $model->listPublic($limit);
            ok([
                'items' => $items,
                'pagination' => [
                    'limit' => max(1, min(3, $limit)),
                    'total' => count($items),
                ],
            ]);
            return;
        }

        require_admin($this->pdo);

        $q = trim((string)($_GET['q'] ?? ''));
        $page = (int)($_GET['page'] ?? 1);
        $limit = (int)($_GET['limit'] ?? 50);

        $items = $model->listWithSearch($page, $limit, $q);
        $total = $model->countWithSearch($q);

        ok([
            'items' => $items,
            'pagination' => [
                'page' => max(1, $page),
                'limit' => max(1, min(200, $limit)),
                'total' => $total,
                'total_pages' => (int)ceil($total / max(1, min(200, $limit))),
            ],
        ]);
    }

    /**
     * POST /home-mission-img/upload
     * multipart/form-data:
     * - file
     *
     * Constraint: table may contain at most 3 rows.
     */
    public function upload(): void
    {
        require_admin($this->pdo);

        $model = new HomeMissionImgModel($this->pdo);
        $count = $model->countAll();
        if ($count >= 3) {
            fail('Validation failed', 422, ['สามารถมีรูปภารกิจหน้าหลักได้ไม่เกิน 3 รูป (กรุณาลบรูปเดิมก่อน)']);
        }

        if (!isset($_FILES['file'])) {
            fail('Missing file', 400);
        }

        $file = $_FILES['file'];
        if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            $code = (int)($file['error'] ?? UPLOAD_ERR_NO_FILE);
            fail('Upload failed', 400, ['code' => $code]);
        }

        $tmp = (string)($file['tmp_name'] ?? '');
        if ($tmp === '' || !is_uploaded_file($tmp)) {
            fail('Invalid upload', 400);
        }

        $original = trim((string)($file['name'] ?? ''));
        $size = (int)($file['size'] ?? 0);

        $max = 10 * 1024 * 1024; // 10MB
        if ($size <= 0 || $size > $max) {
            fail('File too large (max 10MB)', 422);
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
            fail('File must be .jpg .png .webp only', 422, ['mime' => $mime]);
        }

        $ext = $allow[$mime];
        $rand = bin2hex(random_bytes(8));
        $stored = 'mission_' . date('Ymd_His') . '_' . $rand . '.' . $ext;

        $dir = __DIR__ . '/../public/uploads/home_mission_img';
        if (!is_dir($dir)) {
            $ok = @mkdir($dir, 0775, true);
            if (!$ok && !is_dir($dir)) {
                $last = error_get_last();
                fail('Upload directory cannot be created', 500, ['dir' => $dir, 'detail' => $last['message'] ?? null]);
            }
        }
        @chmod($dir, 0775);
        if (!is_writable($dir)) {
            fail('Upload directory is not writable', 500, [
                'dir' => $dir,
                'perms' => substr(sprintf('%o', @fileperms($dir) ?: 0), -4),
            ]);
        }

        $dest = $dir . '/' . $stored;
        if (!@move_uploaded_file($tmp, $dest)) {
            $last = error_get_last();
            fail('Could not move uploaded file', 500, ['dest' => $dest, 'detail' => $last['message'] ?? null]);
        }

        $path = '/uploads/home_mission_img/' . $stored;

        $newId = $model->create($path);
        $row = $model->find($newId);

        ok([
            'row' => $row,
            'file' => [
                'path' => $path,
                'original_filename' => $original,
                'stored_filename' => $stored,
                'file_size' => (int)@filesize($dest) ?: $size,
            ],
        ], 'Uploaded', 201);
    }

    /**
     * DELETE /home-mission-img/{id}
     */
    public function delete(int $id): void
    {
        require_admin($this->pdo);

        $model = new HomeMissionImgModel($this->pdo);
        $row = $model->find($id);
        if (!$row) fail('Not found', 404);

        $path = (string)($row['path'] ?? '');
        $abs = $this->toUploadAbsPath($path);

        $ok = $model->delete($id);
        if ($ok && $abs && is_file($abs)) {
            @unlink($abs);
        }

        ok(['deleted' => $ok, 'home_mission_img_id' => $id], 'Deleted');
    }

    private function toUploadAbsPath(string $path): ?string
    {
        $path = trim($path);
        if ($path === '') return null;
        if (!str_starts_with($path, '/uploads/')) return null;

        return __DIR__ . '/../public' . $path;
    }
}

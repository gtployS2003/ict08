<?php
// backend/controllers/history_image_page.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../models/HistoryImagePageModel.php';

final class HistoryImagePageController
{
        /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * GET /history-image-page?q=&page=&limit=
     * (admin) list all images
     */
    public function index(): void
    {
        require_admin($this->pdo);

        $q = trim((string)($_GET['q'] ?? ''));
        $page = (int)($_GET['page'] ?? 1);
        $limit = (int)($_GET['limit'] ?? 50);

        $model = new HistoryImagePageModel($this->pdo);
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
     * GET /history-image-page/active?public=1
     * public=1 -> no auth
     * otherwise -> admin
     */
    public function active(): void
    {
        $public = (int)($_GET['public'] ?? 0) === 1;
        if (!$public) {
            require_admin($this->pdo);
        }

        $model = new HistoryImagePageModel($this->pdo);
        $row = $model->getActive();

        ok($row);
    }

    /**
     * POST /history-image-page/upload
     * multipart/form-data:
     * - file
     * - (optional) set_active=1
     */
    public function upload(): void
    {
        require_admin($this->pdo);

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
        $stored = 'history_' . date('Ymd_His') . '_' . $rand . '.' . $ext;

        $dir = __DIR__ . '/../public/uploads/history_image_page';
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

        $path = '/uploads/history_image_page/' . $stored;

        $model = new HistoryImagePageModel($this->pdo);

        // insert as inactive first
        $newId = $model->create($path, 0);

        $setActive = (int)($_POST['set_active'] ?? 0) === 1;
        $hasActive = $model->getActive() !== null;

        // If requested OR there was no active before, set newly uploaded as active
        if ($setActive || !$hasActive) {
            $model->setActive($newId);
        }

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
     * PUT /history-image-page/{id}/activate
     */
    public function activate(int $id): void
    {
        require_admin($this->pdo);

        $model = new HistoryImagePageModel($this->pdo);
        $row = $model->find($id);
        if (!$row) fail('Not found', 404);

        $model->setActive($id);
        ok($model->find($id), 'Activated');
    }

    /**
     * DELETE /history-image-page/{id}
     */
    public function delete(int $id): void
    {
        require_admin($this->pdo);

        $model = new HistoryImagePageModel($this->pdo);
        $row = $model->find($id);
        if (!$row) fail('Not found', 404);

        $path = (string)($row['path'] ?? '');
        $abs = $this->toUploadAbsPath($path);

        $ok = $model->delete($id);

        if ($ok && $abs && is_file($abs)) {
            @unlink($abs);
        }

        ok(['deleted' => $ok, 'history_image_page_id' => $id], 'Deleted');
    }

    private function toUploadAbsPath(string $path): ?string
    {
        $path = trim($path);
        if ($path === '') return null;
        if (!str_starts_with($path, '/uploads/')) return null;

        return __DIR__ . '/../public' . $path;
    }
}

<?php
// backend/controllers/site_mission.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../models/SiteMissionModel.php';

final class SiteMissionController
{
    public function __construct(private PDO $pdo)
    {
    }

    /**
     * GET /site-missions?q=&page=&limit=&public=1
     * - public=1: no auth (for site)
     * - otherwise: admin only
     */
    public function index(): void
    {
        $public = (int)($_GET['public'] ?? 0) === 1;
        if (!$public) {
            require_admin($this->pdo);
        }

        $q = trim((string)($_GET['q'] ?? ''));
        $page = (int)($_GET['page'] ?? 1);
        $limit = (int)($_GET['limit'] ?? 50);

        $model = new SiteMissionModel($this->pdo);
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
     * POST /site-missions
     * multipart/form-data:
     * - title (required)
     * - discription (required)  (column name is "discription")
     * - sort_order (optional)
     * - file (optional)
     */
    public function create(): void
    {
        require_admin($this->pdo);

        $title = trim((string)($_POST['title'] ?? ''));
        // accept both "discription" and "description" from UI
        $discription = trim((string)($_POST['discription'] ?? ($_POST['description'] ?? '')));

        $sortOrder = null;
        if (isset($_POST['sort_order']) && trim((string)$_POST['sort_order']) !== '' && is_numeric((string)$_POST['sort_order'])) {
            $sortOrder = (int)$_POST['sort_order'];
            if ($sortOrder <= 0) $sortOrder = null;
        }

        if ($title === '' || $discription === '') {
            fail('Missing required fields', 422, ['required' => ['title', 'discription']]);
        }

        $imgPath = null;
        if (isset($_FILES['file']) && is_array($_FILES['file']) && (int)($_FILES['file']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
            $imgPath = $this->handleUpload($_FILES['file']);
        }

        $model = new SiteMissionModel($this->pdo);
        $sort = $sortOrder ?? $model->nextSortOrder();

        $newId = $model->create($title, $discription, $imgPath, $sort);
        ok(['row' => $model->find($newId)], 'Created', 201);
    }

    /**
     * PUT/PATCH /site-missions/{id}
     * multipart/form-data (partial update supported):
     * - title (optional)
     * - discription (optional)
     * - sort_order (optional)
     * - file (optional)
     * - remove_photo=1 (optional) -> set img_path NULL
     */
    public function update(int $id): void
    {
        require_admin($this->pdo);

        $model = new SiteMissionModel($this->pdo);
        $existing = $model->findRaw($id);
        if (!$existing) {
            fail('Not found', 404);
        }

        $title = array_key_exists('title', $_POST)
            ? trim((string)($_POST['title'] ?? ''))
            : trim((string)($existing['title'] ?? ''));

        $discription = array_key_exists('discription', $_POST) || array_key_exists('description', $_POST)
            ? trim((string)($_POST['discription'] ?? ($_POST['description'] ?? '')))
            : trim((string)($existing['discription'] ?? ''));

        $sortOrder = null;
        if (array_key_exists('sort_order', $_POST)) {
            $raw = trim((string)($_POST['sort_order'] ?? ''));
            if ($raw === '' || $raw === '0') {
                $sortOrder = null;
            } elseif (is_numeric($raw)) {
                $n = (int)$raw;
                $sortOrder = $n > 0 ? $n : null;
            }
        } else {
            $tmp = $existing['sort_order'] ?? null;
            $sortOrder = ($tmp === null || $tmp === '') ? null : (int)$tmp;
        }

        if ($title === '' || $discription === '') {
            fail('Missing required fields', 422, ['required' => ['title', 'discription']]);
        }

        $removePhoto = (int)($_POST['remove_photo'] ?? 0) === 1;
        $imgPath = trim((string)($existing['img_path'] ?? ''));
        $imgPath = $imgPath !== '' ? $imgPath : null;

        $oldAbs = $imgPath ? $this->toUploadAbsPath($imgPath) : null;

        if ($removePhoto) {
            $imgPath = null;
        }

        if (isset($_FILES['file']) && is_array($_FILES['file']) && (int)($_FILES['file']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
            $imgPath = $this->handleUpload($_FILES['file']);
            if ($oldAbs && is_file($oldAbs)) {
                @unlink($oldAbs);
            }
        } elseif ($removePhoto) {
            if ($oldAbs && is_file($oldAbs)) {
                @unlink($oldAbs);
            }
        }

        $model->update($id, $title, $discription, $imgPath, $sortOrder);
        ok(['row' => $model->find($id)], 'Updated');
    }

    /**
     * DELETE /site-missions/{id}
     */
    public function delete(int $id): void
    {
        require_admin($this->pdo);

        $model = new SiteMissionModel($this->pdo);
        $row = $model->findRaw($id);
        if (!$row) {
            fail('Not found', 404);
        }

        $path = trim((string)($row['img_path'] ?? ''));
        $abs = $this->toUploadAbsPath($path);

        $okDel = $model->delete($id);
        if ($okDel && $abs && is_file($abs)) {
            @unlink($abs);
        }

        ok(['deleted' => $okDel, 'site_mission_id' => $id], 'Deleted');
    }

    /**
     * PATCH /site-missions/reorder
     * body (JSON): { ids: [3,1,2] }
     */
    public function reorder(): void
    {
        require_admin($this->pdo);

        $ids = [];

        // JSON body
        $raw = file_get_contents('php://input') ?: '';
        if ($raw !== '') {
            $json = json_decode($raw, true);
            if (is_array($json) && isset($json['ids']) && is_array($json['ids'])) {
                $ids = $json['ids'];
            }
        }

        // fallback: form data
        if (!$ids && isset($_POST['ids'])) {
            $ids = $_POST['ids'];
        }

        if (is_string($ids)) {
            // allow comma-separated
            $ids = array_map('trim', explode(',', $ids));
        }

        if (!is_array($ids)) {
            fail('Invalid payload', 422, ['expected' => ['ids' => 'array<int>']]);
        }

        $ids = array_values(array_filter(array_map('intval', $ids), fn($x) => $x > 0));
        if (!$ids) {
            fail('Missing ids', 422);
        }

        $model = new SiteMissionModel($this->pdo);
        $model->reorder($ids);
        ok(['ids' => $ids], 'Reordered');
    }

    private function handleUpload(array $file): string
    {
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            $code = (int)($file['error'] ?? UPLOAD_ERR_NO_FILE);
            fail('Upload failed', 400, ['code' => $code]);
        }

        $tmp = (string)($file['tmp_name'] ?? '');
        if ($tmp === '' || !is_uploaded_file($tmp)) {
            fail('Invalid upload', 400);
        }

        $size = (int)($file['size'] ?? 0);
        $max = 10 * 1024 * 1024;
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

        $dir = __DIR__ . '/../public/uploads/site_mission';
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

        return '/uploads/site_mission/' . $stored;
    }

    private function toUploadAbsPath(string $path): ?string
    {
        $path = trim($path);
        if ($path === '') return null;
        if (!str_starts_with($path, '/uploads/')) return null;
        return __DIR__ . '/../public' . $path;
    }
}

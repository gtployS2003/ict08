<?php
// backend/controllers/site_diractor.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../models/SiteDiractorModel.php';

final class SiteDiractorController
{
    public function __construct(private PDO $pdo)
    {
    }

    /**
     * GET /site-diractors?q=&page=&limit=&public=1
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

        $model = new SiteDiractorModel($this->pdo);
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
     * POST /site-diractors
     * multipart/form-data:
     * - firstname (required)
     * - lastname (required)
     * - start (YEAR) (required)  e.g. 2026 (AD) or 2569 (BE)
     * - end (YEAR) (optional)   e.g. 2027 (AD) or 2570 (BE)
     * - file (optional)
     */
    public function create(): void
    {
        require_admin($this->pdo);

        $firstname = trim((string)($_POST['firstname'] ?? ''));
        $lastname = trim((string)($_POST['lastname'] ?? ''));
        $startRaw = trim((string)($_POST['start'] ?? ''));
        $endRaw = trim((string)($_POST['end'] ?? ''));

        $start = $this->normalizeYear($startRaw, true);
        $end = $this->normalizeYear($endRaw, false);

        if ($firstname === '' || $lastname === '' || $start === null) {
            fail('Missing required fields', 422, ['required' => ['firstname', 'lastname', 'start']]);
        }

        $photoPath = null;
        if (isset($_FILES['file']) && is_array($_FILES['file']) && (int)($_FILES['file']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
            $photoPath = $this->handleUpload($_FILES['file']);
        }

        $model = new SiteDiractorModel($this->pdo);
        $newId = $model->create($firstname, $lastname, $photoPath, (string)$start, $end !== null ? (string)$end : null);

        ok(['row' => $model->find($newId)], 'Created', 201);
    }

    /**
     * PUT/PATCH /site-diractors/{id}
     * multipart/form-data:
     * - firstname, lastname, start
     * - end (optional)
     * - file (optional)
     * - remove_photo=1 (optional) -> set photo_path NULL
     */
    public function update(int $id): void
    {
        require_admin($this->pdo);

        $model = new SiteDiractorModel($this->pdo);
        $existing = $model->find($id);
        if (!$existing) fail('Not found', 404);

        $firstname = trim((string)($_POST['firstname'] ?? ''));
        $lastname = trim((string)($_POST['lastname'] ?? ''));
        $startRaw = trim((string)($_POST['start'] ?? ''));
        $endRaw = trim((string)($_POST['end'] ?? ''));

        $start = $this->normalizeYear($startRaw, true);
        $end = $this->normalizeYear($endRaw, false);

        if ($firstname === '' || $lastname === '' || $start === null) {
            fail('Missing required fields', 422, ['required' => ['firstname', 'lastname', 'start']]);
        }

        $removePhoto = (int)($_POST['remove_photo'] ?? 0) === 1;
        $photoPath = (string)($existing['photo_path'] ?? '');
        $photoPath = trim($photoPath) !== '' ? $photoPath : null;

        $oldAbs = $photoPath ? $this->toUploadAbsPath($photoPath) : null;

        if ($removePhoto) {
            $photoPath = null;
        }

        if (isset($_FILES['file']) && is_array($_FILES['file']) && (int)($_FILES['file']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
            $photoPath = $this->handleUpload($_FILES['file']);

            // delete old file (only if under /uploads/)
            if ($oldAbs && is_file($oldAbs)) {
                @unlink($oldAbs);
            }
        } elseif ($removePhoto) {
            if ($oldAbs && is_file($oldAbs)) {
                @unlink($oldAbs);
            }
        }

        $model->update($id, $firstname, $lastname, $photoPath, (string)$start, $end !== null ? (string)$end : null);
        ok(['row' => $model->find($id)], 'Updated');
    }

    /**
     * Normalize year input.
     * - Accepts: "2026", "2569" (BE), legacy "YYYY-MM-DD".
     * - Returns AD year int or null.
     */
    private function normalizeYear(string $raw, bool $required): ?int
    {
        $s = trim($raw);
        if ($s === '') {
            return $required ? null : null;
        }

        // legacy date
        if (preg_match('/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/', $s, $m)) {
            $s = $m[1];
        }

        if (!preg_match('/^\d{4}$/', $s)) {
            fail('Invalid year', 422, ['field' => $required ? 'start' : 'end', 'value' => $raw]);
        }

        $y = (int)$s;
        // BE -> AD
        if ($y >= 2400) {
            $y -= 543;
        }

        // MySQL YEAR range is roughly 1901..2155 (also 0000)
        if (!(($y >= 1901 && $y <= 2155) || $y === 0)) {
            fail('Year out of range', 422, ['year' => $y]);
        }

        return $y;
    }

    /**
     * DELETE /site-diractors/{id}
     */
    public function delete(int $id): void
    {
        require_admin($this->pdo);

        $model = new SiteDiractorModel($this->pdo);
        $row = $model->find($id);
        if (!$row) fail('Not found', 404);

        $path = trim((string)($row['photo_path'] ?? ''));
        $abs = $this->toUploadAbsPath($path);

        $ok = $model->delete($id);
        if ($ok && $abs && is_file($abs)) {
            @unlink($abs);
        }

        ok(['deleted' => $ok, 'diractor_id' => $id], 'Deleted');
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
        $stored = 'diractor_' . date('Ymd_His') . '_' . $rand . '.' . $ext;

        $dir = __DIR__ . '/../public/uploads/site_diractor';
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

        return '/uploads/site_diractor/' . $stored;
    }

    private function toUploadAbsPath(string $path): ?string
    {
        $path = trim($path);
        if ($path === '') return null;
        if (!str_starts_with($path, '/uploads/')) return null;
        return __DIR__ . '/../public' . $path;
    }
}

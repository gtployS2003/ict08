<?php
// backend/controllers/banners.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../models/BannerModel.php';

final class BannersController
{
    public function __construct(private PDO $pdo)
    {
    }

    /**
     * GET /banners?q=&page=&limit=&public=1
     * - public=1 -> no auth, return only active banners within start/end
     * - otherwise -> require auth, return admin list (search/pagination)
     */
    public function index(): void
    {
        $public = (int)($_GET['public'] ?? 0) === 1;

        $model = new BannerModel($this->pdo);

        if ($public) {
            $limit = (int)($_GET['limit'] ?? 10);
            $items = $model->listPublic($limit);
            ok([
                'items' => $items,
                'pagination' => [
                    'limit' => max(1, min(50, $limit)),
                    'total' => count($items),
                ],
            ]);
            return;
        }

        require_auth($this->pdo);

        $q = trim((string)($_GET['q'] ?? ''));
        $page = (int)($_GET['page'] ?? 1);
        $limit = (int)($_GET['limit'] ?? 50);

        $items = $model->list($q, $page, $limit);
        $total = $model->count($q);

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
     * GET /banners/refs
     */
    public function refs(): void
    {
        require_auth($this->pdo);

        $model = new BannerModel($this->pdo);
        $activities = $model->listActivityRefsForBanner(500);
        $news = $model->listNewsRefsForBanner(500);

        ok([
            'activities' => $activities,
            'news' => $news,
        ]);
    }

    /**
     * GET /banners/{id}
     */
    public function show(int $id): void
    {
        require_auth($this->pdo);

        $model = new BannerModel($this->pdo);
        $row = $model->find($id);
        if (!$row) fail('Banner not found', 404);
        ok($row);
    }

    /**
     * POST /banners
     * - multipart/form-data (image upload) or JSON
     */
    public function create(): void
    {
        $user = require_auth($this->pdo);
        $writerId = (int)($user['user_id'] ?? 0);

        $body = $this->readBody();

        $title = trim((string)($body['title'] ?? ''));
        if ($title === '') fail('Validation failed', 422, ['title is required']);

        $startAt = $this->toNullableDateTime($body['start_at'] ?? null);
        $endAt = $this->toNullableDateTime($body['end_at'] ?? null);

        $file = $_FILES['file'] ?? $_FILES['image'] ?? null;
        if (!is_array($file) || (int)($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
            fail('Validation failed', 422, ['image file is required']);
        }

        $imagePath = $this->storeImage($file);
        $body['image_path'] = $imagePath;
        $body['start_at'] = $startAt;
        $body['end_at'] = $endAt;

        // normalize optional refs
        $body['source_activity_id'] = $this->toNullableInt($body['source_activity_id'] ?? null);
        $body['source_news_id'] = $this->toNullableInt($body['source_news_id'] ?? null);
        $body['source_link_url'] = $this->toNullableString($body['source_link_url'] ?? null);
        $body['is_active'] = $this->toBoolInt($body['is_active'] ?? 1);

        $model = new BannerModel($this->pdo);
        $newId = $model->create($body, $writerId);
        $row = $model->find($newId);
        ok($row, 'Created', 201);
    }

    /**
     * PUT /banners/{id}
     * - multipart/form-data (optional image upload) or JSON
     * - allows partial update (e.g. is_active toggle)
     */
    public function update(int $id): void
    {
        $user = require_auth($this->pdo);
        $writerId = (int)($user['user_id'] ?? 0);

        $model = new BannerModel($this->pdo);
        $found = $model->find($id);
        if (!$found) fail('Banner not found', 404);

        $body = $this->readBody();

        // allow updating with only file
        $file = $_FILES['file'] ?? $_FILES['image'] ?? null;

        $hasBody = is_array($body) && count($body) > 0;
        $hasFile = is_array($file) && (int)($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE;

        if (!$hasBody && !$hasFile) {
            fail('Validation failed', 422, ['body or file is required']);
        }

        $merged = array_merge($found, is_array($body) ? $body : []);

        if ($hasFile) {
            $imagePath = $this->storeImage($file);
            $merged['image_path'] = $imagePath;

            // best-effort remove old file
            $this->tryDeleteStoredFile((string)($found['image_path'] ?? ''));
        }

        // normalize fields
        if (array_key_exists('source_activity_id', $merged)) {
            $merged['source_activity_id'] = $this->toNullableInt($merged['source_activity_id']);
        }
        if (array_key_exists('source_news_id', $merged)) {
            $merged['source_news_id'] = $this->toNullableInt($merged['source_news_id']);
        }
        if (array_key_exists('source_link_url', $merged)) {
            $merged['source_link_url'] = $this->toNullableString($merged['source_link_url']);
        }
        if (array_key_exists('is_active', $merged)) {
            $merged['is_active'] = $this->toBoolInt($merged['is_active']);
        }

        // validate required fields remain
        $title = trim((string)($merged['title'] ?? ''));
        if ($title === '') fail('Validation failed', 422, ['title is required']);

        $merged['start_at'] = $this->toNullableDateTime($merged['start_at'] ?? null);
        $merged['end_at'] = $this->toNullableDateTime($merged['end_at'] ?? null);

        $imagePath = trim((string)($merged['image_path'] ?? ''));
        if ($imagePath === '') fail('Validation failed', 422, ['image_path is required']);

        // update
        $model->update($id, $merged);

        // touch create_by? keep create_by unchanged (table has create_by only)
        // but if needed, we can store last editor elsewhere in the future.
        // keep writerId unused for now to avoid schema change.
        unset($writerId);

        $row = $model->find($id);
        ok($row, 'Updated');
    }

    /**
     * DELETE /banners/{id}
     */
    public function delete(int $id): void
    {
        require_auth($this->pdo);

        $model = new BannerModel($this->pdo);
        $row = $model->find($id);
        if (!$row) fail('Banner not found', 404);

        $okDel = $model->delete($id);
        $this->tryDeleteStoredFile((string)($row['image_path'] ?? ''));

        ok(['deleted' => $okDel, 'banner_id' => $id], 'Deleted');
    }

    /**
     * @return array<string,mixed>
     */
    private function readBody(): array
    {
        if (!empty($_POST)) return $_POST;

        $raw = file_get_contents('php://input');
        if (!$raw) return [];

        $json = json_decode($raw, true);
        if (is_array($json)) return $json;

        parse_str($raw, $data);
        return is_array($data) ? $data : [];
    }

    private function toNullableInt($v): ?int
    {
        if ($v === null) return null;
        $s = trim((string)$v);
        if ($s === '') return null;
        if (!is_numeric($s)) return null;
        $n = (int)$s;
        return $n > 0 ? $n : null;
    }

    private function toNullableString($v): ?string
    {
        if ($v === null) return null;
        $s = trim((string)$v);
        return $s === '' ? null : $s;
    }

    private function toBoolInt($v): int
    {
        if (is_bool($v)) return $v ? 1 : 0;
        $s = strtolower(trim((string)$v));
        if ($s === '1' || $s === 'true' || $s === 'yes' || $s === 'on') return 1;
        return ((int)$v) ? 1 : 0;
    }

    private function normalizeDateTime(string $s): string
    {
        $s = trim($s);
        if ($s === '') return '';

        // Accept datetime-local: 2026-02-27T12:34
        $s = str_replace('T', ' ', $s);

        $ts = strtotime($s);
        if ($ts === false) return '';
        return date('Y-m-d H:i:s', $ts);
    }

    private function toNullableDateTime($v): ?string
    {
        if ($v === null) return null;
        $s = $this->normalizeDateTime((string)$v);
        return $s === '' ? null : $s;
    }

    /**
     * @param array<string,mixed> $file
     */
    private function storeImage(array $file): string
    {
        $err = (int)($file['error'] ?? UPLOAD_ERR_NO_FILE);
        if ($err !== UPLOAD_ERR_OK) {
            throw new RuntimeException('Upload failed (error=' . $err . ')');
        }

        $tmp = (string)($file['tmp_name'] ?? '');
        if ($tmp === '' || !is_uploaded_file($tmp)) {
            throw new RuntimeException('Invalid upload');
        }

        $origName = (string)($file['name'] ?? '');
        $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));

        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($tmp) ?: '';

        $allowed = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
        ];

        if (isset($allowed[$mime])) {
            $ext = $allowed[$mime];
        }

        if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp'], true)) {
            throw new RuntimeException('Unsupported image type');
        }

        if ($ext === 'jpeg') $ext = 'jpg';

        $dir = __DIR__ . '/../public/uploads/banners';
        if (!@mkdir($dir, 0775, true) && !is_dir($dir)) {
            throw new RuntimeException('Cannot create upload dir');
        }

        $stored = 'banner_' . date('Ymd_His') . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
        $dest = $dir . '/' . $stored;

        if (!@move_uploaded_file($tmp, $dest)) {
            throw new RuntimeException('move_uploaded_file failed');
        }

        // store as relative path under public/
        return 'uploads/banners/' . $stored;
    }

    private function tryDeleteStoredFile(string $filepath): void
    {
        $fp = trim($filepath);
        if ($fp === '') return;
        if (!str_starts_with($fp, 'uploads/')) return;

        $abs = realpath(__DIR__ . '/../public/' . $fp);
        $base = realpath(__DIR__ . '/../public/uploads');
        if (!$abs || !$base) return;

        // Ensure within uploads directory
        if (!str_starts_with($abs, $base)) return;

        @unlink($abs);
    }
}

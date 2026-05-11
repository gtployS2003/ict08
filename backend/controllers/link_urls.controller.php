<?php
// backend/controllers/link_urls.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../models/LinkUrlModel.php';

final class LinkUrlsController
{
        /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * GET /link-urls?q=&page=&limit=&public=1&is_banner=0|1
     * - public=1 -> no auth; by default filters is_banner=0 unless provided
     * - otherwise -> require auth
     */
    public function index(): void
    {
        $q = trim((string)($_GET['q'] ?? ''));
        $page = (int)($_GET['page'] ?? 1);
        $limit = (int)($_GET['limit'] ?? 50);
        $public = (int)($_GET['public'] ?? 0) === 1;

        $isBanner = null;

        if ($public) {
            // For public list, default to related links (not banner)
            if (isset($_GET['is_banner']) && $_GET['is_banner'] !== '') {
                $isBanner = (int)$_GET['is_banner'];
            } else {
                $isBanner = 0;
            }
        } else {
            require_auth($this->pdo);
            if (isset($_GET['is_banner']) && $_GET['is_banner'] !== '') {
                $isBanner = (int)$_GET['is_banner'];
            }
        }

        $model = new LinkUrlModel($this->pdo);
        $items = $model->list($q, $page, $limit, $isBanner);
        $total = $model->count($q, $isBanner);

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
     * GET /link-urls/{id}
     */
    public function show(int $id): void
    {
        require_auth($this->pdo);

        $model = new LinkUrlModel($this->pdo);
        $row = $model->find($id);
        if (!$row) fail('Link not found', 404);
        ok($row);
    }

    /**
     * POST /link-urls
     */
    public function create(): void
    {
        $user = require_auth($this->pdo);
        $writerId = (int)($user['user_id'] ?? 0);

        $body = $this->readBody();
        $body = $this->withUploadedImage($body);
        $title = trim((string)($body['title'] ?? ''));
        $linkUrl = trim((string)($body['link_url'] ?? ''));

        if ($title === '' || $linkUrl === '') {
            fail('Validation failed', 422, ['title and link_url are required']);
        }

        $model = new LinkUrlModel($this->pdo);
        $newId = $model->create($body, $writerId);
        $row = $model->find($newId);
        ok($row, 'Created', 201);
    }

    /**
     * PUT /link-urls/{id}
     */
    public function update(int $id): void
    {
        $user = require_auth($this->pdo);
        $writerId = (int)($user['user_id'] ?? 0);

        $model = new LinkUrlModel($this->pdo);
        $exists = $model->find($id);
        if (!$exists) fail('Link not found', 404);

        $body = $this->readBody();
        $body = $this->withUploadedImage($body);
        $title = trim((string)($body['title'] ?? ''));
        $linkUrl = trim((string)($body['link_url'] ?? ''));

        if ($title === '' || $linkUrl === '') {
            fail('Validation failed', 422, ['title and link_url are required']);
        }

        $model->update($id, $body, $writerId);
        if (trim((string)($body['img'] ?? '')) === '') {
            $this->deleteUploadedImage((string)($exists['img'] ?? ''));
        }
        $row = $model->find($id);
        ok($row, 'Updated');
    }

    /**
     * DELETE /link-urls/{id}
     */
    public function delete(int $id): void
    {
        require_auth($this->pdo);

        $model = new LinkUrlModel($this->pdo);
        $row = $model->find($id);
        if (!$row) fail('Link not found', 404);

        $ok = $model->delete($id);
        if ($ok) {
            $this->deleteUploadedImage((string)($row['img'] ?? ''));
        }
        ok(['deleted' => $ok, 'url_id' => $id], 'Deleted');
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

    /**
     * @param array<string,mixed> $body
     * @return array<string,mixed>
     */
    private function withUploadedImage(array $body): array
    {
        if (!isset($_FILES['file'])) {
            $body['img'] = trim((string)($body['img'] ?? ''));
            return $body;
        }

        $file = $_FILES['file'];
        if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
            $body['img'] = trim((string)($body['img'] ?? ''));
            return $body;
        }
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            fail('Upload failed', 400, ['code' => (int)($file['error'] ?? UPLOAD_ERR_NO_FILE)]);
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
        $stored = 'link_' . date('Ymd_His') . '_' . bin2hex(random_bytes(8)) . '.' . $ext;
        $dir = __DIR__ . '/../public/uploads/link_url';
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

        $old = trim((string)($body['img'] ?? ''));
        $body['img'] = '/uploads/link_url/' . $stored;
        $this->deleteUploadedImage($old);

        return $body;
    }

    private function deleteUploadedImage(string $path): void
    {
        $path = trim($path);
        if ($path === '') return;
        if (!str_starts_with($path, '/uploads/link_url/')) return;

        $abs = __DIR__ . '/../public' . $path;
        if (is_file($abs)) {
            @unlink($abs);
        }
    }
}

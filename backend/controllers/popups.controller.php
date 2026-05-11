<?php
// backend/controllers/popups.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../models/PopupModel.php';

final class PopupsController
{
    /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * GET /popups?q=&page=&limit=&public=1
     */
    public function index(): void
    {
        $model = new PopupModel($this->pdo);
        $public = (int)($_GET['public'] ?? 0) === 1;

        if ($public) {
            $limit = (int)($_GET['limit'] ?? 20);
            $items = $model->listPublic($limit);
            ok([
                'items' => $items,
                'item' => $items[0] ?? null,
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

    public function show(int $id): void
    {
        require_auth($this->pdo);

        $model = new PopupModel($this->pdo);
        $row = $model->find($id);
        if (!$row) fail('Popup not found', 404);
        ok($row);
    }

    public function create(): void
    {
        require_auth($this->pdo);

        $body = $this->readBody();
        $file = $_FILES['file'] ?? $_FILES['image'] ?? null;

        if (!is_array($file) || (int)($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
            fail('Validation failed', 422, ['image file is required']);
        }

        $body['image_path'] = $this->storeImage($file);
        $body['is_active'] = $this->toBoolInt($body['is_active'] ?? 1);
        $this->validate($body);

        $model = new PopupModel($this->pdo);
        $id = $model->create($body);
        ok($model->find($id), 'Created', 201);
    }

    public function update(int $id): void
    {
        require_auth($this->pdo);

        $model = new PopupModel($this->pdo);
        $found = $model->find($id);
        if (!$found) fail('Popup not found', 404);

        $body = array_merge($found, $this->readBody());
        $file = $_FILES['file'] ?? $_FILES['image'] ?? null;
        $hasFile = is_array($file) && (int)($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE;

        if ($hasFile) {
            $body['image_path'] = $this->storeImage($file);
            $this->tryDeleteStoredFile((string)($found['image_path'] ?? ''));
        }

        if (array_key_exists('is_active', $body)) {
            $body['is_active'] = $this->toBoolInt($body['is_active']);
        }

        $this->validate($body);
        $model->update($id, $body);

        ok($model->find($id), 'Updated');
    }

    public function delete(int $id): void
    {
        require_auth($this->pdo);

        $model = new PopupModel($this->pdo);
        $row = $model->find($id);
        if (!$row) fail('Popup not found', 404);

        $ok = $model->delete($id);
        if ($ok) {
            $this->tryDeleteStoredFile((string)($row['image_path'] ?? ''));
        }

        ok(['deleted' => $ok, 'popup_id' => $id], 'Deleted');
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
     */
    private function validate(array $body): void
    {
        $imagePath = trim((string)($body['image_path'] ?? ''));
        if ($imagePath === '') fail('Validation failed', 422, ['image_path is required']);
    }

    private function toBoolInt($value): int
    {
        if (is_bool($value)) return $value ? 1 : 0;
        $s = strtolower(trim((string)$value));
        if ($s === '1' || $s === 'true' || $s === 'yes' || $s === 'on') return 1;
        return ((int)$value) ? 1 : 0;
    }

    /**
     * @param array<string,mixed> $file
     */
    private function storeImage(array $file): string
    {
        $err = (int)($file['error'] ?? UPLOAD_ERR_NO_FILE);
        if ($err !== UPLOAD_ERR_OK) {
            fail('Upload failed', 400, ['code' => $err]);
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

        $allowed = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
        ];

        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($tmp) ?: '';
        if (!isset($allowed[$mime])) {
            fail('File must be .jpg .png .webp only', 422, ['mime' => $mime]);
        }

        $dir = __DIR__ . '/../public/uploads/popups';
        if (!@mkdir($dir, 0775, true) && !is_dir($dir)) {
            fail('Upload directory cannot be created', 500);
        }

        $stored = 'popup_' . date('Ymd_His') . '_' . bin2hex(random_bytes(8)) . '.' . $allowed[$mime];
        $dest = $dir . '/' . $stored;

        if (!@move_uploaded_file($tmp, $dest)) {
            fail('Could not move uploaded file', 500);
        }

        return 'uploads/popups/' . $stored;
    }

    private function tryDeleteStoredFile(string $path): void
    {
        $path = trim($path);
        if ($path === '') return;
        if (!str_starts_with($path, 'uploads/popups/')) return;

        $abs = realpath(__DIR__ . '/../public/' . $path);
        $base = realpath(__DIR__ . '/../public/uploads/popups');
        if (!$abs || !$base) return;
        if (!str_starts_with($abs, $base)) return;

        @unlink($abs);
    }
}

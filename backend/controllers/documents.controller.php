<?php
// backend/controllers/documents.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../models/DocumentModel.php';

final class DocumentsController
{
    public function __construct(private PDO $pdo)
    {
    }

    /**
     * POST /documents/upload
     * multipart/form-data:
     * - file
     *
     * Response: { ok:true, data:{ path, original_filename, stored_filename, file_size } }
     */
    public function upload(): void
    {
        require_auth($this->pdo);

        if (!isset($_FILES['file'])) {
            fail('Missing file', 400);
        }

        $file = $_FILES['file'];
        if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            $code = (int)($file['error'] ?? UPLOAD_ERR_NO_FILE);
            fail('Upload failed', 400, ['code' => $code]);
        }

        if (!is_uploaded_file((string)($file['tmp_name'] ?? ''))) {
            fail('Invalid upload', 400);
        }

        $origName = (string)($file['name'] ?? '');
        $origName = trim($origName);
        if ($origName === '') {
            $origName = 'document';
        }

        // allowlist by extension (simple + predictable)
        $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
        $allowExt = [
            'pdf',
            'doc', 'docx',
            'xls', 'xlsx',
            'ppt', 'pptx',
            'txt',
            'jpg', 'jpeg', 'png', 'webp',
            'zip',
            'rar',
        ];
        if ($ext === '' || !in_array($ext, $allowExt, true)) {
            fail('File type not allowed', 422, ['ext' => $ext, 'allow' => $allowExt]);
        }

        // size limit: 25MB
        $max = 25 * 1024 * 1024;
        $size = (int)($file['size'] ?? 0);
        if ($size > $max) {
            fail('File too large (max 25MB)', 422);
        }

        $dir = __DIR__ . '/../public/uploads/documents';
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

        $rand = bin2hex(random_bytes(8));
        $stored = 'doc_' . date('Ymd_His') . '_' . $rand . '.' . $ext;
        $dest = $dir . '/' . $stored;

        if (!@move_uploaded_file((string)$file['tmp_name'], $dest)) {
            $last = error_get_last();
            fail('Could not move uploaded file', 500, ['dest' => $dest, 'detail' => $last['message'] ?? null]);
        }

        $publicPath = '/uploads/documents/' . $stored;
        ok([
            'path' => $publicPath,
            'original_filename' => $origName,
            'stored_filename' => $stored,
            'file_size' => (int)@filesize($dest) ?: $size,
        ], 'Uploaded', 201);
    }

    /**
     * เติมค่า field ที่ผู้ใช้ไม่ต้องกรอกในฟอร์ม
     * - stored_filename: สร้างจาก basename(filepath)
     * - file_size: คำนวณจากไฟล์ในเครื่องถ้า filepath เป็น path ภายในเว็บ
     *
     * @param array<string,mixed> $body
     * @return array<string,mixed>
     */
    private function normalizeBody(array $body): array
    {
        $filepath = trim((string)($body['filepath'] ?? ''));

        // stored_filename สร้างอัตโนมัติ ถ้าไม่ได้ส่งมา/ว่าง
        if (!isset($body['stored_filename']) || trim((string)$body['stored_filename']) === '') {
            $body['stored_filename'] = $this->guessStoredFilename($filepath);
        }

        // file_size คำนวณอัตโนมัติ ถ้าไม่ได้ส่งมา
        if (!isset($body['file_size']) || $body['file_size'] === '' || $body['file_size'] === null) {
            $body['file_size'] = $this->tryComputeFileSize($filepath);
        }

        return $body;
    }

    private function guessStoredFilename(string $filepath): string
    {
        $filepath = trim($filepath);
        if ($filepath === '') return '';

        $path = parse_url($filepath, PHP_URL_PATH);
        $path = is_string($path) && $path !== '' ? $path : $filepath;

        $base = basename($path);
        return $base !== '.' && $base !== '/' ? $base : '';
    }

    private function tryComputeFileSize(string $filepath): int
    {
        $filepath = trim($filepath);
        if ($filepath === '') return 0;

        // ถ้าเป็น URL ภายนอก -> ไม่คำนวณ (เลี่ยง request ออกนอกระบบ)
        $scheme = parse_url($filepath, PHP_URL_SCHEME);
        if (is_string($scheme) && $scheme !== '' && in_array(strtolower($scheme), ['http', 'https'], true)) {
            return 0;
        }

        $docRoot = (string)($_SERVER['DOCUMENT_ROOT'] ?? '');
        $docRoot = rtrim($docRoot, '/');
        if ($docRoot === '') return 0;

        $path = parse_url($filepath, PHP_URL_PATH);
        $path = is_string($path) ? $path : $filepath;
        $path = '/' . ltrim($path, '/');

        $full = $docRoot . $path;
        if (!is_file($full)) return 0;

        $size = @filesize($full);
        return is_int($size) && $size > 0 ? $size : 0;
    }

    /**
     * GET /documents?q=&page=&limit=&public=1
     * - otherwise -> require auth
     */
    public function index(): void
    {
        $q = trim((string)($_GET['q'] ?? ''));
        $page = (int)($_GET['page'] ?? 1);
        $limit = (int)($_GET['limit'] ?? 50);
        $public = (int)($_GET['public'] ?? 0) === 1;

        $isPrivate = null;
        $isActive = null;

        if ($public) {
            $isPrivate = 0;
            $isActive = 1;
        } else {
            // admin/staff view
            require_auth($this->pdo);

            if (isset($_GET['is_private']) && $_GET['is_private'] !== '') {
                $isPrivate = (int)$_GET['is_private'];
            }
            if (isset($_GET['is_active']) && $_GET['is_active'] !== '') {
                $isActive = (int)$_GET['is_active'];
            }
        }

        $model = new DocumentModel($this->pdo);
        $items = $model->list($q, $page, $limit, $isPrivate, $isActive);
        $total = $model->count($q, $isPrivate, $isActive);

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
     * GET /documents/{id}
     */
    public function show(int $id): void
    {
        require_auth($this->pdo);

        $model = new DocumentModel($this->pdo);
        $row = $model->find($id);
        if (!$row) fail('Document not found', 404);
        ok($row);
    }

    /**
     * POST /documents
     */
    public function create(): void
    {
        require_auth($this->pdo);

        $body = $this->readBody();
        $body = $this->normalizeBody($body);
        $filepath = trim((string)($body['filepath'] ?? ''));
        $original = trim((string)($body['original_filename'] ?? ''));

        if ($filepath === '' || $original === '') {
            fail('Validation failed', 422, ['filepath and original_filename are required']);
        }

        $model = new DocumentModel($this->pdo);
        $newId = $model->create($body);
        $row = $model->find($newId);
        ok($row, 'Created', 201);
    }

    /**
     * PUT /documents/{id}
     */
    public function update(int $id): void
    {
        require_auth($this->pdo);

        $model = new DocumentModel($this->pdo);
        $exists = $model->find($id);
        if (!$exists) fail('Document not found', 404);

        $body = $this->normalizeBody($this->readBody());
        $filepath = trim((string)($body['filepath'] ?? ''));
        $original = trim((string)($body['original_filename'] ?? ''));

        if ($filepath === '' || $original === '') {
            fail('Validation failed', 422, ['filepath and original_filename are required']);
        }

        $model->update($id, $body);
        $row = $model->find($id);
        ok($row, 'Updated');
    }

    /**
     * DELETE /documents/{id}
     */
    public function delete(int $id): void
    {
        require_auth($this->pdo);

        $model = new DocumentModel($this->pdo);
        $row = $model->find($id);
        if (!$row) fail('Document not found', 404);

        $ok = $model->delete($id);
        ok(['deleted' => $ok, 'document_id' => $id], 'Deleted');
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
}

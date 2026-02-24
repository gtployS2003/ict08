<?php
// backend/controllers/event_template_exports.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../models/EventTemplateExportModel.php';

// auth middleware
$authPath = __DIR__ . '/../middleware/auth.php';
if (file_exists($authPath)) {
    require_once $authPath;
}

// dev auth middleware (X-Dev-Api-Key)
$devAuthPath = __DIR__ . '/../middleware/dev_auth.php';
if (file_exists($devAuthPath)) {
    require_once $devAuthPath;
}

final class EventTemplateExportsController
{
    public function __construct(private PDO $pdo) {}

    /**
     * POST /event-template-exports/by-event-template/{eventTemplateId}
     * multipart/form-data: file
     *
     * Save file into backend/public/uploads/event_reports and upsert DB row by event_template_id.
     */
    public function upsertByEventTemplate(int $eventTemplateId): void
    {
        try {
            $me = $this->requireStaffAccess(true);

            $eventTemplateId = max(1, (int)$eventTemplateId);

            $contentType = (string)($_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '');
            $isMultipart = stripos($contentType, 'multipart/form-data') !== false;
            if (!$isMultipart) {
                json_response(['error' => true, 'message' => 'Expected multipart/form-data'], 415);
                return;
            }

            if (!isset($_FILES['file'])) {
                json_response(['error' => true, 'message' => 'Missing file'], 400);
                return;
            }

            $file = $_FILES['file'];
            if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
                $code = (int)($file['error'] ?? UPLOAD_ERR_NO_FILE);
                json_response(['error' => true, 'message' => 'Upload failed', 'code' => $code], 400);
                return;
            }

            $tmp = (string)($file['tmp_name'] ?? '');
            if ($tmp === '' || !is_uploaded_file($tmp)) {
                json_response(['error' => true, 'message' => 'Invalid upload'], 400);
                return;
            }

            $size = (int)($file['size'] ?? 0);
            $max = 20 * 1024 * 1024; // 20MB
            if ($size <= 0 || $size > $max) {
                json_response(['error' => true, 'message' => 'File too large (max 20MB)'], 422);
                return;
            }

            // Only JPG exports for now
            $allow = [
                'image/jpeg' => 'jpg',
            ];

            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mime = $tmp !== '' ? (string)finfo_file($finfo, $tmp) : '';
            finfo_close($finfo);

            if (!isset($allow[$mime])) {
                json_response([
                    'error' => true,
                    'message' => 'File must be .jpg only',
                    'mime' => $mime,
                ], 422);
                return;
            }

            $ext = $allow[$mime];

            $original = (string)($_POST['original_filename'] ?? ($file['name'] ?? 'export.jpg'));
            $rand = bin2hex(random_bytes(8));
            $stored = 'event_report_' . $eventTemplateId . '_' . date('Ymd_His') . '_' . $rand . '.' . $ext;

            $dir = __DIR__ . '/../public/uploads/event_reports';
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

            // If replacing, best-effort delete old file
            $m = new EventTemplateExportModel($this->pdo);
            $existing = $m->findByEventTemplateId($eventTemplateId);
            if ($existing) {
                $oldFp = (string)($existing['filepath'] ?? '');
                $oldAbs = $this->toPublicUploadAbsPath($oldFp);
                if ($oldAbs && is_file($oldAbs)) {
                    @unlink($oldAbs);
                }
            }

            if (!@move_uploaded_file($tmp, $dest)) {
                throw new RuntimeException('move_uploaded_file failed to: ' . $dest);
            }

            $path = '/uploads/event_reports/' . $stored;

            $uid = (int)($me['user_id'] ?? 0);
            if ($uid <= 0) $uid = 0;

            $exportId = $m->upsertByEventTemplateId(
                $eventTemplateId,
                $path,
                $original !== '' ? $original : null,
                $stored,
                $size,
                $uid
            );

            $row = $m->findById($exportId);

            json_response([
                'error' => false,
                'message' => 'Uploaded',
                'data' => $row,
            ], 201);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to upload export',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * @return array<string,mixed>|null
     */
    private function requireStaffAccess(bool $returnUser = false): ?array
    {
        $hasToken = false;
        if (function_exists('get_bearer_token')) {
            $hasToken = (get_bearer_token() !== null);
        } else {
            $auth = (string)($_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
            $hasToken = stripos($auth, 'Bearer ') !== false;
        }

        if ($hasToken && function_exists('require_auth')) {
            $u = require_auth($this->pdo);
            return $returnUser ? $u : $u;
        }

        if (function_exists('require_dev_staff')) {
            require_dev_staff();
            return null;
        }

        if (function_exists('require_auth')) {
            $u = require_auth($this->pdo);
            return $returnUser ? $u : $u;
        }

        fail('UNAUTHORIZED', 401, 'Unauthorized');
        exit;
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

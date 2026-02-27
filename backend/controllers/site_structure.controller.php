<?php
// backend/controllers/site_structure.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../models/SiteStructureModel.php';

final class SiteStructureController
{
    private const ORG_ID = 7;

    public function __construct(private PDO $pdo)
    {
    }

    /**
     * GET /site-structures?q=&page=&limit=&public=1
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

        $model = new SiteStructureModel($this->pdo);
        $items = $model->listWithSearch($page, $limit, $q, self::ORG_ID);
        $total = $model->countWithSearch($q, self::ORG_ID);

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
     * POST /site-structures
     * multipart/form-data:
     * - prefix_person_id (required)
     * - fristname (required)
     * - lastname (required)
     * - department_id (optional) (if provided must belong to organization_id=7)
     * - position_id (required) (must belong to organization_id=7 and match department_id if provided)
     * - file (optional)
     */
    public function create(): void
    {
        require_admin($this->pdo);

        $prefixPersonId = (int)($_POST['prefix_person_id'] ?? 0);
        $fristname = trim((string)($_POST['fristname'] ?? ''));
        $lastname = trim((string)($_POST['lastname'] ?? ''));
        $departmentId = null;
        if (isset($_POST['department_id']) && ctype_digit((string)$_POST['department_id'])) {
            $tmp = (int)$_POST['department_id'];
            $departmentId = $tmp > 0 ? $tmp : null;
        }
        $positionId = (int)($_POST['position_id'] ?? 0);

        if ($prefixPersonId <= 0 || $fristname === '' || $lastname === '' || $positionId <= 0) {
            fail('Missing required fields', 422, [
                'required' => ['prefix_person_id', 'fristname', 'lastname', 'position_id'],
                'optional' => ['department_id'],
            ]);
        }

        if (!$this->prefixExists($prefixPersonId)) {
            fail('Invalid prefix_person_id', 422);
        }

        if ($departmentId !== null && !$this->departmentValidForOrg($departmentId, self::ORG_ID)) {
            fail('Invalid department_id for organization', 422, ['organization_id' => self::ORG_ID]);
        }

        if (!$this->positionValidForOrgAndDepartment($positionId, self::ORG_ID, $departmentId)) {
            fail('Invalid position_id for department/organization', 422, ['organization_id' => self::ORG_ID]);
        }

        $picPath = null;
        if (isset($_FILES['file']) && is_array($_FILES['file']) && (int)($_FILES['file']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
            $picPath = $this->handleUpload($_FILES['file']);
        }

        $model = new SiteStructureModel($this->pdo);
        $newId = $model->create($prefixPersonId, $fristname, $lastname, $departmentId, $positionId, $picPath);

        ok(['row' => $model->find($newId, self::ORG_ID)], 'Created', 201);
    }

    /**
     * PUT/PATCH /site-structures/{id}
     * multipart/form-data:
        * - prefix_person_id, fristname, lastname, department_id(optional), position_id
     * - file (optional)
     * - remove_photo=1 (optional) -> set pic_path NULL
     */
    public function update(int $id): void
    {
        require_admin($this->pdo);

        $model = new SiteStructureModel($this->pdo);
        $existingRaw = $model->findRaw($id);
        if (!$existingRaw) {
            fail('Not found', 404);
        }

        // Partial update support:
        // - If a field is omitted, keep existing value.
        // - If department_id is provided but empty/0 => set NULL.
        $prefixPersonId = array_key_exists('prefix_person_id', $_POST)
            ? (int)($_POST['prefix_person_id'] ?? 0)
            : (int)($existingRaw['prefix_person_id'] ?? 0);

        $fristname = array_key_exists('fristname', $_POST)
            ? trim((string)($_POST['fristname'] ?? ''))
            : trim((string)($existingRaw['fristname'] ?? ''));

        $lastname = array_key_exists('lastname', $_POST)
            ? trim((string)($_POST['lastname'] ?? ''))
            : trim((string)($existingRaw['lastname'] ?? ''));

        $departmentId = null;
        if (array_key_exists('department_id', $_POST)) {
            $raw = trim((string)($_POST['department_id'] ?? ''));
            if ($raw === '' || $raw === '0') {
                $departmentId = null;
            } elseif (ctype_digit($raw)) {
                $tmp = (int)$raw;
                $departmentId = $tmp > 0 ? $tmp : null;
            } else {
                // invalid value -> treat as null
                $departmentId = null;
            }
        } else {
            $tmp = $existingRaw['department_id'] ?? null;
            $departmentId = ($tmp === null || $tmp === '') ? null : (int)$tmp;
        }

        $positionId = array_key_exists('position_id', $_POST)
            ? (int)($_POST['position_id'] ?? 0)
            : (int)($existingRaw['position_id'] ?? 0);

        if ($prefixPersonId <= 0 || $fristname === '' || $lastname === '' || $positionId <= 0) {
            fail('Missing required fields', 422, [
                'required' => ['prefix_person_id', 'fristname', 'lastname', 'position_id'],
                'optional' => ['department_id'],
            ]);
        }

        if (!$this->prefixExists($prefixPersonId)) {
            fail('Invalid prefix_person_id', 422);
        }

        if ($departmentId !== null && !$this->departmentValidForOrg($departmentId, self::ORG_ID)) {
            fail('Invalid department_id for organization', 422, ['organization_id' => self::ORG_ID]);
        }

        if (!$this->positionValidForOrgAndDepartment($positionId, self::ORG_ID, $departmentId)) {
            fail('Invalid position_id for department/organization', 422, ['organization_id' => self::ORG_ID]);
        }

        $removePhoto = (int)($_POST['remove_photo'] ?? 0) === 1;
        $picPath = trim((string)($existingRaw['pic_path'] ?? ''));
        $picPath = $picPath !== '' ? $picPath : null;

        $oldAbs = $picPath ? $this->toUploadAbsPath($picPath) : null;

        if ($removePhoto) {
            $picPath = null;
        }

        if (isset($_FILES['file']) && is_array($_FILES['file']) && (int)($_FILES['file']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
            $picPath = $this->handleUpload($_FILES['file']);

            if ($oldAbs && is_file($oldAbs)) {
                @unlink($oldAbs);
            }
        } elseif ($removePhoto) {
            if ($oldAbs && is_file($oldAbs)) {
                @unlink($oldAbs);
            }
        }

        $model->update($id, $prefixPersonId, $fristname, $lastname, $departmentId, $positionId, $picPath);
        ok(['row' => $model->find($id, self::ORG_ID)], 'Updated');
    }

    /**
     * DELETE /site-structures/{id}
     */
    public function delete(int $id): void
    {
        require_admin($this->pdo);

        $model = new SiteStructureModel($this->pdo);
        $existingRaw = $model->findRaw($id);
        if (!$existingRaw) {
            fail('Not found', 404);
        }

        $path = trim((string)($existingRaw['pic_path'] ?? ''));
        $abs = $this->toUploadAbsPath($path);

        $okDel = $model->delete($id);
        if ($okDel && $abs && is_file($abs)) {
            @unlink($abs);
        }

        ok(['deleted' => $okDel, 'structure_id' => $id], 'Deleted');
    }

    private function prefixExists(int $prefixId): bool
    {
        $stmt = $this->pdo->prepare('SELECT person_prefix_id FROM person_prefix WHERE person_prefix_id = :id LIMIT 1');
        $stmt->execute([':id' => $prefixId]);
        $row = $stmt->fetchColumn();
        return $row !== false;
    }

    private function departmentValidForOrg(int $departmentId, int $orgId): bool
    {
        $stmt = $this->pdo->prepare('SELECT department_id FROM department WHERE department_id = :id AND organization_id = :org LIMIT 1');
        $stmt->execute([':id' => $departmentId, ':org' => $orgId]);
        $row = $stmt->fetchColumn();
        return $row !== false;
    }

    private function positionValidForOrgAndDepartment(int $positionId, int $orgId, ?int $departmentId): bool
    {
        if ($departmentId === null) {
            $stmt = $this->pdo->prepare('SELECT position_title_id FROM position_title WHERE position_title_id = :id AND organization_id = :org AND department_id IS NULL LIMIT 1');
            $stmt->execute([':id' => $positionId, ':org' => $orgId]);
        } else {
            $stmt = $this->pdo->prepare('SELECT position_title_id FROM position_title WHERE position_title_id = :id AND organization_id = :org AND department_id = :dep LIMIT 1');
            $stmt->execute([':id' => $positionId, ':org' => $orgId, ':dep' => $departmentId]);
        }
        $row = $stmt->fetchColumn();
        return $row !== false;
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
        $stored = 'structure_' . date('Ymd_His') . '_' . $rand . '.' . $ext;

        $dir = __DIR__ . '/../public/uploads/site_structure';
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

        return '/uploads/site_structure/' . $stored;
    }

    private function toUploadAbsPath(string $path): ?string
    {
        $path = trim($path);
        if ($path === '') return null;
        if (!str_starts_with($path, '/uploads/')) return null;
        return __DIR__ . '/../public' . $path;
    }
}

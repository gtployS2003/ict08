<?php
// backend/controllers/profile.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../services/LineService.php';

final class ProfileController
{
    /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * GET /profile/me
     * Returns current authenticated user + person row (all columns in person).
     */
    public function me(): void
    {
        $user = require_auth($this->pdo);
        $uid = (int)($user['user_id'] ?? 0);
        if ($uid <= 0) {
            fail('UNAUTHORIZED', 401);
        }

        $person = $this->findPersonByUserId($uid);
        $detail = $this->findPersonDetailByUserId($uid);

        ok([
            'user' => $user,
            'person' => $person,
            'detail' => $detail,
        ]);
    }

    /**
     * PUT /profile/me
     * Accept JSON or multipart/form-data.
     * - multipart: fields via $_POST, file via $_FILES['photo_file']
     */
    public function updateMe(): void
    {
        $user = require_auth($this->pdo);
        $uid = (int)($user['user_id'] ?? 0);
        if ($uid <= 0) {
            fail('UNAUTHORIZED', 401);
        }

        $contentType = (string)($_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '');
        $isMultipart = stripos($contentType, 'multipart/form-data') !== false;

        $body = $isMultipart ? ($_POST ?? []) : read_json_body();
        if (!is_array($body)) {
            $body = [];
        }

        $existing = $this->findPersonByUserId($uid);
        $isCreate = !$existing;

        // Validate required fields for create.
        if ($isCreate) {
            $required = [
                'person_prefix_id',
                'first_name_th',
                'last_name_th',
                'organization_id',
                'department_id',
                'position_title_id',
            ];
            $missing = require_fields($body, $required);
            if ($missing) {
                fail('Missing fields', 422, $missing);
            }
        }

        $payload = $this->buildPersonPayload($body, $existing);

        // photo clear flag
        $wantClear = isset($body['photo_clear']) && (string)$body['photo_clear'] === '1';

        $this->pdo->beginTransaction();
        try {
            $personId = 0;

            if ($isCreate) {
                $personId = $this->insertPersonRow($uid, $payload);
            } else {
                $personId = (int)($existing['person_id'] ?? 0);
                if ($personId <= 0) {
                    throw new RuntimeException('Invalid person_id');
                }

                if ($wantClear) {
                    $this->deleteOldProfileIfLocal($existing['photo_path'] ?? null);
                    $payload['photo_path'] = '';
                }

                $this->updatePersonRow($personId, $payload);
            }

            // Handle upload after we have personId
            if ($isMultipart && isset($_FILES['photo_file']) && ($_FILES['photo_file']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
                // delete old local file if any
                if (!$isCreate && !$wantClear) {
                    $this->deleteOldProfileIfLocal($existing['photo_path'] ?? null);
                }

                $newPath = $this->saveProfileUpload($personId, $_FILES['photo_file']);
                if ($newPath !== null) {
                    $stmt = $this->pdo->prepare('UPDATE person SET photo_path = :p WHERE person_id = :id LIMIT 1');
                    $stmt->execute([':p' => $newPath, ':id' => $personId]);
                }
            }

            $this->pdo->commit();

            $fresh = $this->findPersonByUserId($uid);
            $detail = $this->findPersonDetailByUserId($uid);

            ok([
                'user' => $user,
                'person' => $fresh,
                'detail' => $detail,
            ], 'Updated');
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            fail('Failed to update profile', 500, $e->getMessage());
        }
    }

    /**
     * DELETE /profile/me
     * Deletes person row then user row (account deletion).
     */
    public function deleteMe(): void
    {
        $user = require_auth($this->pdo);
        $uid = (int)($user['user_id'] ?? 0);
        if ($uid <= 0) {
            fail('UNAUTHORIZED', 401);
        }

        $existing = $this->findPersonByUserId($uid);
        if (!$existing) {
            fail('Profile not found', 404);
        }

        $personId = (int)($existing['person_id'] ?? 0);

        $this->pdo->beginTransaction();
        try {
            // remove local photo if any
            $this->deleteOldProfileIfLocal($existing['photo_path'] ?? null);

            $stmt1 = $this->pdo->prepare('DELETE FROM person WHERE person_user_id = :uid LIMIT 1');
            $stmt1->execute([':uid' => $uid]);

            $stmt2 = $this->pdo->prepare('DELETE FROM `user` WHERE user_id = :uid LIMIT 1');
            $stmt2->execute([':uid' => $uid]);

            $this->pdo->commit();
            ok(['deleted' => true, 'person_id' => $personId], 'Deleted');
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            // FK errors should surface as 409 for UI friendliness
            fail('Failed to delete profile', 409, $e->getMessage());
        }
    }

    /**
     * POST /profile/logout
     * Switch LINE rich menu back to before-login (LINE_RICHMENU_BEFORE)
     */
    public function logout(): void
    {
        $user = require_auth($this->pdo);
        $lineUserId = trim((string)($user['line_user_id'] ?? ''));

        $rmBefore = (string)(getenv('LINE_RICHMENU_BEFORE') ?: '');
        $accessToken = (string)(getenv('LINE_CHANNEL_ACCESS_TOKEN') ?: '');

        if ($lineUserId === '' || $rmBefore === '' || $accessToken === '') {
            ok([
                'line_user_id' => $lineUserId,
                'changed' => false,
                'reason' => 'missing line_user_id or LINE config',
            ], 'Logged out');
        }

        try {
            $svc = new LineService($accessToken);
            $res = $svc->setUserRichMenu($lineUserId, $rmBefore);

            ok([
                'line_user_id' => $lineUserId,
                'changed' => (bool)($res['ok'] ?? false),
                'richmenu_id' => $rmBefore,
                'result' => $res,
            ], 'Logged out');
        } catch (Throwable $e) {
            // Still ok: logout should not break just because LINE API fails
            ok([
                'line_user_id' => $lineUserId,
                'changed' => false,
                'richmenu_id' => $rmBefore,
                'error' => $e->getMessage(),
            ], 'Logged out');
        }
    }

    /** @return array<string,mixed>|null */
    private function findPersonByUserId(int $userId): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM person WHERE person_user_id = :uid LIMIT 1');
        $stmt->execute([':uid' => $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /** @return array<string,mixed>|null */
    private function findPersonDetailByUserId(int $userId): ?array
    {
        $sql = "
            SELECT
                p.*, 
                u.line_user_name,

                px.prefix_th,
                px.prefix_en,

                o.name AS organization_name,
                d.department_title AS department_name,
                pt.position_title AS position_title_name
            FROM person p
            INNER JOIN `user` u ON u.user_id = p.person_user_id
            LEFT JOIN person_prefix px ON px.person_prefix_id = p.person_prefix_id
            LEFT JOIN organization o ON o.organization_id = p.organization_id
            LEFT JOIN department d ON d.department_id = p.department_id
            LEFT JOIN position_title pt ON pt.position_title_id = p.position_title_id
            WHERE p.person_user_id = :uid
            LIMIT 1
        ";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':uid' => $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * Build payload from incoming body.
     * @param array<string,mixed> $body
     * @param array<string,mixed>|null $existing
     * @return array<string,mixed>
     */
    private function buildPersonPayload(array $body, ?array $existing): array
    {
        $payload = [];

        $intFields = [
            'person_prefix_id',
            'organization_id',
            'department_id',
            'position_title_id',
            'is_active',
        ];

        foreach ($intFields as $f) {
            if (array_key_exists($f, $body)) {
                $v = $body[$f];
                if ($v === null || $v === '') {
                    $payload[$f] = null;
                } elseif (!is_numeric($v)) {
                    fail("$f must be a number", 422);
                } else {
                    $payload[$f] = (int)$v;
                }
            }
        }

        $strFields = [
            'first_name_th',
            'first_name_en',
            'last_name_th',
            'last_name_en',
            'display_name',
            'photo_path',
        ];
        foreach ($strFields as $f) {
            if (array_key_exists($f, $body)) {
                $payload[$f] = (string)($body[$f] ?? '');
            }
        }

        if (array_key_exists('start_date', $body)) {
            $payload['start_date'] = $this->normalizeDatetime($body['start_date']);
        }
        if (array_key_exists('end_date', $body)) {
            $payload['end_date'] = $this->normalizeDatetime($body['end_date']);
        }

        // Defaults for update: keep existing values if not provided.
        if ($existing) {
            foreach (['person_prefix_id','organization_id','department_id','position_title_id','is_active'] as $f) {
                if (!array_key_exists($f, $payload) && array_key_exists($f, $existing)) {
                    $payload[$f] = $existing[$f];
                }
            }
            foreach (['first_name_th','first_name_en','last_name_th','last_name_en','display_name','photo_path','start_date','end_date'] as $f) {
                if (!array_key_exists($f, $payload) && array_key_exists($f, $existing)) {
                    $payload[$f] = $existing[$f];
                }
            }
        }

        // Required not empty constraints (DB NOT NULL for first/last th)
        if (array_key_exists('first_name_th', $payload) && trim((string)$payload['first_name_th']) === '') {
            fail('first_name_th cannot be empty', 422);
        }
        if (array_key_exists('last_name_th', $payload) && trim((string)$payload['last_name_th']) === '') {
            fail('last_name_th cannot be empty', 422);
        }

        return $payload;
    }

    private function normalizeDatetime($v): ?string
    {
        if ($v === null) {
            return null;
        }
        $s = trim((string)$v);
        if ($s === '' || strtolower($s) === 'null') {
            return null;
        }

        // Accept HTML datetime-local (YYYY-MM-DDTHH:mm)
        $s = str_replace('T', ' ', $s);

        // If only date provided, add midnight
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $s)) {
            return $s . ' 00:00:00';
        }

        // If missing seconds
        if (preg_match('/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}$/', $s)) {
            return $s . ':00';
        }

        // If already full
        if (preg_match('/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/', $s)) {
            return $s;
        }

        // Fallback: store raw (DB may reject if invalid)
        return $s;
    }

    /**
     * Insert person record and return person_id.
     * @param array<string,mixed> $payload
     */
    private function insertPersonRow(int $userId, array $payload): int
    {
        $sql = "
            INSERT INTO person (
                person_user_id,
                person_prefix_id,
                first_name_th,
                first_name_en,
                last_name_th,
                last_name_en,
                display_name,
                organization_id,
                department_id,
                position_title_id,
                photo_path,
                is_active,
                start_date,
                end_date,
                create_at
            ) VALUES (
                :person_user_id,
                :person_prefix_id,
                :first_name_th,
                :first_name_en,
                :last_name_th,
                :last_name_en,
                :display_name,
                :organization_id,
                :department_id,
                :position_title_id,
                :photo_path,
                :is_active,
                :start_date,
                :end_date,
                NOW()
            )
        ";

        // Do not allow user to self-activate; default to 0.
        $isActive = isset($payload['is_active']) ? (int)$payload['is_active'] : 0;

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':person_user_id' => $userId,
            ':person_prefix_id' => (int)($payload['person_prefix_id'] ?? 0),
            ':first_name_th' => (string)($payload['first_name_th'] ?? ''),
            ':first_name_en' => (($payload['first_name_en'] ?? '') !== '') ? (string)($payload['first_name_en'] ?? '') : null,
            ':last_name_th' => (string)($payload['last_name_th'] ?? ''),
            ':last_name_en' => (($payload['last_name_en'] ?? '') !== '') ? (string)($payload['last_name_en'] ?? '') : null,
            ':display_name' => (string)($payload['display_name'] ?? ''),
            ':organization_id' => (int)($payload['organization_id'] ?? 0),
            ':department_id' => (int)($payload['department_id'] ?? 0),
            ':position_title_id' => (int)($payload['position_title_id'] ?? 0),
            ':photo_path' => (string)($payload['photo_path'] ?? ''),
            ':is_active' => $isActive,
            ':start_date' => $payload['start_date'] ?? null,
            ':end_date' => $payload['end_date'] ?? null,
        ]);

        return (int)$this->pdo->lastInsertId();
    }

    /**
     * Update person columns.
     * @param array<string,mixed> $payload
     */
    private function updatePersonRow(int $personId, array $payload): void
    {
        $sql = "
            UPDATE person
            SET
                person_prefix_id = :person_prefix_id,
                first_name_th = :first_name_th,
                first_name_en = :first_name_en,
                last_name_th = :last_name_th,
                last_name_en = :last_name_en,
                display_name = :display_name,
                organization_id = :organization_id,
                department_id = :department_id,
                position_title_id = :position_title_id,
                photo_path = :photo_path,
                is_active = :is_active,
                start_date = :start_date,
                end_date = :end_date
            WHERE person_id = :person_id
            LIMIT 1
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':person_prefix_id' => (int)($payload['person_prefix_id'] ?? 0),
            ':first_name_th' => (string)($payload['first_name_th'] ?? ''),
            ':first_name_en' => ($payload['first_name_en'] ?? null) === '' ? null : ($payload['first_name_en'] ?? null),
            ':last_name_th' => (string)($payload['last_name_th'] ?? ''),
            ':last_name_en' => ($payload['last_name_en'] ?? null) === '' ? null : ($payload['last_name_en'] ?? null),
            ':display_name' => (string)($payload['display_name'] ?? ''),
            ':organization_id' => (int)($payload['organization_id'] ?? 0),
            ':department_id' => (int)($payload['department_id'] ?? 0),
            ':position_title_id' => (int)($payload['position_title_id'] ?? 0),
            ':photo_path' => (string)($payload['photo_path'] ?? ''),
            ':is_active' => (int)($payload['is_active'] ?? 0),
            ':start_date' => $payload['start_date'] ?? null,
            ':end_date' => $payload['end_date'] ?? null,
            ':person_id' => $personId,
        ]);
    }

    private function saveProfileUpload(int $personId, array $file): ?string
    {
        if (!isset($file['error']) || $file['error'] !== UPLOAD_ERR_OK) {
            return null;
        }
        if (!is_uploaded_file((string)$file['tmp_name'])) {
            return null;
        }

        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, (string)$file['tmp_name']);
        finfo_close($finfo);

        $allow = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
        ];
        if (!isset($allow[$mime])) {
            throw new RuntimeException('รูปต้องเป็น .jpg .png .webp เท่านั้น');
        }

        $max = 3 * 1024 * 1024;
        if ((int)($file['size'] ?? 0) > $max) {
            throw new RuntimeException('ไฟล์รูปใหญ่เกิน 3MB');
        }

        $ext = $allow[$mime];

        $dir = __DIR__ . '/../public/uploads/profiles';
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }

        $name = 'u_' . $personId . '_' . date('Ymd_His') . '.' . $ext;
        $dest = $dir . '/' . $name;

        if (!@move_uploaded_file((string)$file['tmp_name'], $dest)) {
            throw new RuntimeException('อัปโหลดรูปไม่สำเร็จ');
        }

        return '/uploads/profiles/' . $name;
    }

    private function deleteOldProfileIfLocal(?string $photoPath): void
    {
        if (!$photoPath) {
            return;
        }

        $p = trim((string)$photoPath);
        if (strpos($p, '/uploads/profiles/') !== 0) {
            return;
        }

        $full = __DIR__ . '/../public' . $p;
        if (is_file($full)) {
            @unlink($full);
        }
    }
}

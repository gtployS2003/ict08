<?php
// backend/controllers/requests.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../models/RequestModel.php';

// ✅ auth middleware (มี get_auth_user(), require_auth())
$authPath = __DIR__ . '/../middleware/auth.php';
if (file_exists($authPath)) {
    require_once $authPath;
}

class RequestsController
{
    // ✅ ปรับให้รองรับทั้ง conference + other
    private const REQUEST_TYPE_CONFERENCE = 2; // ขอสนับสนุนห้องประชุม
    private const REQUEST_TYPE_REPAIR = 3; // แจ้งเสีย/ซ่อมอุปกรณ์
    private const REQUEST_TYPE_OTHER = 4; // ขอใช้บริการอื่น ๆ ของหน่วยงาน

    public function __construct(private PDO $pdo)
    {
    }

    /**
     * POST /requests
     * รองรับ multipart/form-data และ JSON
     *
     * required (ทุก type):
     * - request_type
     * - subject
     * - province_id
     *
     * conference (type=2) เพิ่ม:
     * - request_sub_type
     * - start_date_time (YYYY-MM-DD HH:MM:SS)
     * - end_date_time   (YYYY-MM-DD HH:MM:SS)
     *
     * other (type=3) เพิ่ม:
     * - location (required)
     * - request_sub_type default = 0
     * - start/end ไม่บังคับ (จะบันทึกเป็น NULL)
     */
    public function create(): void
    {
        try {
            // 1) อ่าน input (FormData หรือ JSON)
            $contentType = (string) ($_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '');
            $isMultipart = stripos($contentType, 'multipart/form-data') !== false;

            $body = [];
            if ($isMultipart) {
                $body = $_POST ?? [];
            } else {
                $raw = file_get_contents('php://input') ?: '';
                $decoded = json_decode($raw, true);
                if (!is_array($decoded)) {
                    json_response([
                        'error' => true,
                        'message' => 'Invalid JSON body',
                    ], 400);
                    return;
                }
                $body = $decoded;
            }

            // 2) requester_id จาก token
            $requesterId = $this->getAuthUserId();
            if ($requesterId === null || $requesterId <= 0) {
                json_response([
                    'error' => true,
                    'message' => 'Unauthorized: missing requester',
                ], 401);
                return;
            }

            // 3) request_type (ต้องส่งมาจากฟอร์ม)
            $requestTypeRaw = $body['request_type'] ?? null;
            if ($requestTypeRaw === null || $requestTypeRaw === '' || !is_numeric($requestTypeRaw)) {
                json_response([
                    'error' => true,
                    'message' => 'request_type is required',
                ], 422);
                return;
            }
            $requestType = (int) $requestTypeRaw;

            // 4) province_id: รับจากฟอร์ม (ผู้ใช้เลือกเอง)
            $provinceRaw = $body['province_id'] ?? null;
            if ($provinceRaw === null || $provinceRaw === '' || !is_numeric($provinceRaw) || (int) $provinceRaw <= 0) {
                json_response([
                    'error' => true,
                    'message' => 'province_id is required',
                ], 422);
                return;
            }
            $provinceId = (int) $provinceRaw;

            // 5) fields ทั่วไป
            $errors = [];

            $subject = trim((string) ($body['subject'] ?? ''));
            if ($subject === '') {
                $errors['subject'] = 'subject is required';
            } elseif (mb_strlen($subject) > 255) {
                $errors['subject'] = 'subject max length is 255';
            }

            $detail = isset($body['detail']) ? (string) $body['detail'] : null;

            // 6) แยก validate ตาม type
            $requestSubType = $body['request_sub_type'] ?? null;
            $start = trim((string) ($body['start_date_time'] ?? ''));
            $end = trim((string) ($body['end_date_time'] ?? ''));

            $location = trim((string) ($body['location'] ?? ''));

            if ($requestType === self::REQUEST_TYPE_CONFERENCE) {

                // conference: ต้องมี request_sub_type + start/end
                if ($requestSubType === null || $requestSubType === '' || !is_numeric($requestSubType) || (int) $requestSubType <= 0) {
                    $errors['request_sub_type'] = 'request_sub_type is required and must be number > 0';
                }

                if ($start === '') {
                    $errors['start_date_time'] = 'start_date_time is required';
                } elseif (!$this->isDateTime($start)) {
                    $errors['start_date_time'] = 'start_date_time must be YYYY-MM-DD HH:MM:SS';
                }

                if ($end === '') {
                    $errors['end_date_time'] = 'end_date_time is required';
                } elseif (!$this->isDateTime($end)) {
                    $errors['end_date_time'] = 'end_date_time must be YYYY-MM-DD HH:MM:SS';
                }

                if ($start !== '' && $end !== '' && $this->isDateTime($start) && $this->isDateTime($end)) {
                    if (strtotime($end) <= strtotime($start)) {
                        $errors['end_date_time'] = 'end_date_time must be later than start_date_time';
                    }
                }

                // location: ไม่ใช้ใน conference
                $location = '';

            } elseif ($requestType === self::REQUEST_TYPE_OTHER) {

                // ✅ other: ต้องมี location
                if ($location === '') {
                    $errors['location'] = 'location is required for other request';
                }

                // ✅ other: ต้องเลือก subtype (ตามที่คุณต้องการให้เป็น dropdown)
                if ($requestSubType === null || $requestSubType === '' || !is_numeric($requestSubType) || (int) $requestSubType <= 0) {
                    $errors['request_sub_type'] = 'request_sub_type is required and must be number > 0';
                }

                // ✅ other: บังคับ start/end (เพราะฟอร์มมี *)
                if ($start === '') {
                    $errors['start_date_time'] = 'start_date_time is required';
                } elseif (!$this->isDateTime($start)) {
                    $errors['start_date_time'] = 'start_date_time must be YYYY-MM-DD HH:MM:SS';
                }

                if ($end === '') {
                    $errors['end_date_time'] = 'end_date_time is required';
                } elseif (!$this->isDateTime($end)) {
                    $errors['end_date_time'] = 'end_date_time must be YYYY-MM-DD HH:MM:SS';
                }

                if ($start !== '' && $end !== '' && $this->isDateTime($start) && $this->isDateTime($end)) {
                    if (strtotime($end) <= strtotime($start)) {
                        $errors['end_date_time'] = 'end_date_time must be later than start_date_time';
                    }
                }

            } else {
                $errors['request_type'] = 'Unsupported request_type';
            }

            if (!empty($errors)) {
                json_response([
                    'error' => true,
                    'message' => 'Validation failed',
                    'errors' => $errors,
                ], 422);
                return;
            }

            // 8) ตรวจไฟล์แนบ
            $hasAttachment = 0;
            $file = null;

            if (!empty($_FILES)) {

                // multiple: attachments[]
                if (isset($_FILES['attachments']) && is_array($_FILES['attachments']['name'])) {

                    foreach ($_FILES['attachments']['name'] as $idx => $name) {
                        $files[] = [
                            'name' => $name,
                            'type' => $_FILES['attachments']['type'][$idx] ?? '',
                            'tmp_name' => $_FILES['attachments']['tmp_name'][$idx] ?? '',
                            'error' => $_FILES['attachments']['error'][$idx] ?? UPLOAD_ERR_NO_FILE,
                            'size' => $_FILES['attachments']['size'][$idx] ?? 0,
                        ];
                    }

                    // single fallback (เผื่อใช้ attachment/file)
                } elseif (isset($_FILES['attachment']) && is_array($_FILES['attachment'])) {
                    $files[] = $_FILES['attachment'];

                } elseif (isset($_FILES['file']) && is_array($_FILES['file'])) {
                    $files[] = $_FILES['file'];
                }
            }

            // มีอย่างน้อย 1 ไฟล์ที่ OK
            foreach ($files as $f) {
                if (($f['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK) {
                    $hasAttachment = 1;
                    break;
                }
            }


            if ($file && ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK) {
                $hasAttachment = 1;
            }

            // 9) insert request
            $payload = [
                'request_type' => $requestType,
                'request_sub_type' => (int) $requestSubType,
                'subject' => $subject,
                'device_id' => null,
                'detail' => $detail,
                'requester_id' => $requesterId,
                'province_id' => $provinceId,

                // ✅ location: มีเฉพาะ other (ถ้าไม่ใช้ก็เป็น null)
                'location' => ($location !== '') ? $location : null,

                'hasAttachment' => $hasAttachment,
                'head_of_request_id' => null,
                'approve_by_id' => null,
                'approve_channel_id' => null,
                'urgency_id' => null,
                'approve_at' => null,

                // ✅ conference มีค่า, other เป็น null
                'start_date_time' => ($start !== '') ? $start : null,
                'end_date_time' => ($end !== '') ? $end : null,

            ];

            $this->pdo->beginTransaction();

            $model = new RequestModel($this->pdo);
            $newId = $model->create($payload);

            // 10) insert attachment
            if ($hasAttachment === 1 && !empty($files)) {

                foreach ($files as $file) {

                    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
                        continue;
                    }

                    try {
                        $saved = $this->saveRequestAttachmentFile($newId, $requesterId, $file);
                    } catch (Throwable $ex) {
                        $this->pdo->rollBack();
                        json_response([
                            'error' => true,
                            'message' => 'Upload failed',
                            'detail' => $ex->getMessage(),
                        ], 500);
                        return;
                    }

                    $sql = "
            INSERT INTO request_attachment
                (request_id, filepath, original_filename, stored_filename, file_size, uploaded_by, uploaded_at)
            VALUES
                (:request_id, :filepath, :original_filename, :stored_filename, :file_size, :uploaded_by, NOW())
        ";

                    $stmt = $this->pdo->prepare($sql);
                    $stmt->execute([
                        ':request_id' => $newId,
                        ':filepath' => $saved['filepath'],
                        ':original_filename' => $saved['original_filename'],
                        ':stored_filename' => $saved['stored_filename'],
                        ':file_size' => $saved['file_size'],
                        ':uploaded_by' => $requesterId,
                    ]);
                }
            }


            $this->pdo->commit();

            $created = $model->findById($newId);

            json_response([
                'error' => false,
                'message' => 'Created',
                'data' => $created ?? ['request_id' => $newId],
            ], 201);

        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            json_response([
                'error' => true,
                'message' => 'Failed to create request',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * ✅ ดึง user_id จาก token ด้วย get_auth_user() ของคุณ
     */
    private function getAuthUserId(): ?int
    {
        try {
            if (function_exists('get_auth_user')) {
                $u = get_auth_user($this->pdo);
                if (is_array($u) && isset($u['user_id']) && is_numeric($u['user_id'])) {
                    return (int) $u['user_id'];
                }
            }

            // fallback dev: Bearer 123
            $auth = (string) ($_SERVER['HTTP_AUTHORIZATION'] ?? '');
            if (preg_match('/Bearer\s+(\d+)/i', $auth, $m)) {
                return (int) $m[1];
            }
        } catch (Throwable $e) {
            return null;
        }

        return null;
    }

    private function getDefaultStatusIdByRequestType(int $requestTypeId): ?int
    {
        $sql = "
            SELECT status_id
            FROM request_status
            WHERE request_type_id = :rt
            ORDER BY sort_order ASC, status_id ASC
            LIMIT 1
        ";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':rt' => $requestTypeId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row)
            return null;

        $sid = $row['status_id'] ?? null;
        return (is_numeric($sid) && (int) $sid > 0) ? (int) $sid : null;
    }

    private function saveRequestAttachmentFile(int $requestId, int $uploadedBy, array $file): ?array
    {
        $tmp = $file['tmp_name'] ?? '';
        $original = (string) ($file['name'] ?? 'file');
        $size = (int) ($file['size'] ?? 0);
        $err = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);

        if ($err !== UPLOAD_ERR_OK) {
            throw new RuntimeException('Upload error code: ' . $err);
        }

        if ($tmp === '' || !is_uploaded_file($tmp)) {
            throw new RuntimeException('Invalid uploaded temp file');
        }

        $ext = strtolower(pathinfo($original, PATHINFO_EXTENSION));
        $safeExt = preg_match('/^[a-z0-9]{1,10}$/', $ext) ? $ext : 'bin';

        $stamp = date('Ymd_His');
        $stored = "req_{$requestId}_u{$uploadedBy}_{$stamp}." . $safeExt;

        // ✅ ใช้ path แบบแน่นอน
        $dir = __DIR__ . '/../public/uploads/requests';
        if (!is_dir($dir)) {
            if (!@mkdir($dir, 0775, true) && !is_dir($dir)) {
                throw new RuntimeException('Cannot create directory: ' . $dir);
            }
        }

        if (!is_writable($dir)) {
            throw new RuntimeException('Upload directory not writable: ' . $dir);
        }

        $dest = $dir . '/' . $stored;

        if (!@move_uploaded_file($tmp, $dest)) {
            throw new RuntimeException('move_uploaded_file failed to: ' . $dest);
        }

        $filepath = 'uploads/requests/' . $stored;

        return [
            'filepath' => $filepath,
            'original_filename' => $original,
            'stored_filename' => $stored,
            'file_size' => $size,
        ];
    }

    private function isDateTime(string $s): bool
    {
        if (!preg_match('/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/', $s)) {
            return false;
        }
        $dt = DateTime::createFromFormat('Y-m-d H:i:s', $s);
        return $dt !== false;
    }
}
?>
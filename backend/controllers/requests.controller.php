<?php
// backend/controllers/requests.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../models/RequestModel.php';
require_once __DIR__ . '/../models/EventModel.php';
require_once __DIR__ . '/../models/NotificationModel.php';
require_once __DIR__ . '/../services/NotificationService.php';

// ✅ auth middleware (มี get_auth_user(), require_auth())
$authPath = __DIR__ . '/../middleware/auth.php';
if (file_exists($authPath)) {
    require_once $authPath;
}

// ✅ dev auth middleware (X-Dev-Api-Key) for development convenience
$devAuthPath = __DIR__ . '/../middleware/dev_auth.php';
if (file_exists($devAuthPath)) {
    require_once $devAuthPath;
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
     * GET /requests/pending?search=&page=&limit=
     * คืนคำขอที่สถานะ current_status_id -> request_status.status_code = 'pending'
     */
    public function pending(): void
    {
        try {
            $this->requireStaffAccess();

            $q = trim((string)($_GET['search'] ?? $_GET['q'] ?? ''));
            $page = max(1, (int)($_GET['page'] ?? 1));
            $limit = max(1, min(200, (int)($_GET['limit'] ?? 50)));
            $offset = ($page - 1) * $limit;

            $params = [];
            $where = "WHERE rs.status_code = 'pending'";

            if ($q !== '') {
                $where .= " AND (r.subject LIKE :q OR COALESCE(p.display_name, u.line_user_name, '') LIKE :q)";
                $params[':q'] = '%' . $q . '%';
            }

            $sqlCount = "
                SELECT COUNT(*) AS cnt
                FROM request r
                LEFT JOIN request_status rs ON rs.status_id = r.current_status_id
                LEFT JOIN person p ON p.person_user_id = r.requester_id
                LEFT JOIN `user` u ON u.user_id = r.requester_id
                $where
            ";
            $stmtCount = $this->pdo->prepare($sqlCount);
            foreach ($params as $k => $v) {
                $stmtCount->bindValue($k, $v, PDO::PARAM_STR);
            }
            $stmtCount->execute();
            $total = (int)($stmtCount->fetchColumn() ?: 0);

            $sql = "
                SELECT
                    r.request_id,
                    r.request_type,
                    rt.type_name AS request_type_name,
                    r.request_sub_type,
                    rst.name AS request_sub_type_name,
                    r.subject,
                    r.detail,
                    r.province_id,
                    pv.nameTH AS province_name_th,
                    r.location,

                    r.requester_id,
                    COALESCE(p.display_name, u.line_user_name, CONCAT('user#', r.requester_id)) AS requester_name,

                    r.start_date_time,
                    r.end_date_time,
                    r.current_status_id,
                    rs.status_code,
                    rs.status_name,
                    r.request_at
                FROM request r
                LEFT JOIN request_type rt ON rt.request_type_id = r.request_type
                LEFT JOIN request_sub_type rst ON rst.request_sub_type_id = r.request_sub_type
                LEFT JOIN province pv ON pv.province_id = r.province_id
                LEFT JOIN person p ON p.person_user_id = r.requester_id
                LEFT JOIN `user` u ON u.user_id = r.requester_id
                LEFT JOIN request_status rs ON rs.status_id = r.current_status_id
                $where
                ORDER BY r.request_at DESC, r.request_id DESC
                LIMIT :lim OFFSET :off
            ";

            $stmt = $this->pdo->prepare($sql);
            foreach ($params as $k => $v) {
                $stmt->bindValue($k, $v, PDO::PARAM_STR);
            }
            $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':off', $offset, PDO::PARAM_INT);
            $stmt->execute();
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

            json_response([
                'error' => false,
                'data' => $items,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => $total,
                    'totalPages' => (int)ceil($total / max(1, $limit)),
                ],
            ]);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to get pending requests',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /requests/{id}
     */
    public function show(int $id): void
    {
        try {
            $this->requireStaffAccess();

            $id = max(1, (int)$id);

            $sql = "
                SELECT
                    r.*,
                    rt.type_name AS request_type_name,
                    rst.name AS request_sub_type_name,
                    d.device_name AS device_name,
                    d.ip AS device_ip,
                    pv.nameTH AS province_name_th,
                    COALESCE(p.display_name, u.line_user_name, CONCAT('user#', r.requester_id)) AS requester_name,
                    rs.status_code,
                    rs.status_name
                FROM request r
                LEFT JOIN request_type rt ON rt.request_type_id = r.request_type
                LEFT JOIN request_sub_type rst ON rst.request_sub_type_id = r.request_sub_type
                LEFT JOIN device d ON d.device_id = r.device_id
                LEFT JOIN province pv ON pv.province_id = r.province_id
                LEFT JOIN person p ON p.person_user_id = r.requester_id
                LEFT JOIN `user` u ON u.user_id = r.requester_id
                LEFT JOIN request_status rs ON rs.status_id = r.current_status_id
                WHERE r.request_id = :id
                LIMIT 1
            ";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([':id' => $id]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row) {
                json_response([
                    'error' => true,
                    'message' => 'Request not found',
                ], 404);
                return;
            }

            $attSql = "
                SELECT
                    request_attachment_id AS attachment_id,
                    request_id,
                    filepath,
                    original_filename,
                    stored_filename,
                    file_size,
                    uploaded_by,
                    uploaded_at
                FROM request_attachment
                WHERE request_id = :id
                ORDER BY request_attachment_id ASC
            ";
            $attStmt = $this->pdo->prepare($attSql);
            $attStmt->execute([':id' => $id]);
            $atts = $attStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

            json_response([
                'error' => false,
                'data' => [
                    'request' => $row,
                    'attachments' => $atts,
                ],
            ]);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to get request',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /requests/{id}/approve
     */
    public function approve(int $id): void
    {
        $this->setStatusByCode($id, 'approved');
    }

    /**
     * POST /requests/{id}/reject
     */
    public function reject(int $id): void
    {
        $this->setStatusByCode($id, 'rejected');
    }

    /**
     * PUT /requests/{id}
     * Allow staff to edit a subset of fields from the check_request page.
     * Editable fields (as required):
     * - subject
     * - detail
     * - head_of_request_id
     * - urgency_id
     * - start_date_time
     * - end_date_time
     * - current_status_id
     */
    public function update(int $id): void
    {
        try {
            $me = $this->requireStaffAccess(true);

            $id = max(1, (int)$id);
            $body = read_json_body();

            $model = new RequestModel($this->pdo);
            $req = $model->findById($id);
            if (!$req) {
                json_response([
                    'error' => true,
                    'message' => 'Request not found',
                ], 404);
                return;
            }

            // request_type is immutable on this page
            $requestTypeId = (int)($req['request_type'] ?? 0);
            if ($requestTypeId <= 0) {
                json_response([
                    'error' => true,
                    'message' => 'Invalid request_type',
                ], 422);
                return;
            }

            $subject = array_key_exists('subject', $body)
                ? trim((string)($body['subject'] ?? ''))
                : (string)($req['subject'] ?? '');

            if ($subject === '') {
                json_response([
                    'error' => true,
                    'message' => 'subject is required',
                ], 422);
                return;
            }
            if (mb_strlen($subject) > 255) {
                json_response([
                    'error' => true,
                    'message' => 'subject max length is 255',
                ], 422);
                return;
            }

            $detail = array_key_exists('detail', $body)
                ? (string)($body['detail'] ?? '')
                : (string)($req['detail'] ?? '');

            $start = array_key_exists('start_date_time', $body) ? trim((string)($body['start_date_time'] ?? '')) : (string)($req['start_date_time'] ?? '');
            $end = array_key_exists('end_date_time', $body) ? trim((string)($body['end_date_time'] ?? '')) : (string)($req['end_date_time'] ?? '');

            $startVal = ($start === '' ? null : $start);
            $endVal = ($end === '' ? null : $end);

            if ($startVal !== null && !$this->isDateTime($startVal)) {
                json_response([
                    'error' => true,
                    'message' => 'start_date_time must be YYYY-MM-DD HH:MM:SS',
                ], 422);
                return;
            }
            if ($endVal !== null && !$this->isDateTime($endVal)) {
                json_response([
                    'error' => true,
                    'message' => 'end_date_time must be YYYY-MM-DD HH:MM:SS',
                ], 422);
                return;
            }
            if ($startVal !== null && $endVal !== null) {
                if (strtotime($endVal) <= strtotime($startVal)) {
                    json_response([
                        'error' => true,
                        'message' => 'end_date_time must be later than start_date_time',
                    ], 422);
                    return;
                }
            }

            // head_of_request_id (nullable)
            // NOTE: request.head_of_request_id references head_of_request.id (NOT staff_id)
            $headRaw = $body['head_of_request_id'] ?? null;
            $headId = null;
            if ($headRaw !== null && $headRaw !== '' && is_numeric($headRaw)) {
                $headId = (int)$headRaw;
                if ($headId <= 0) $headId = null;
            }

            $requestSubTypeId = $req['request_sub_type'] ?? null;
            $subTypeInt = (is_numeric($requestSubTypeId) && (int)$requestSubTypeId > 0) ? (int)$requestSubTypeId : 0;
            if ($headId !== null) {
                if ($subTypeInt <= 0) {
                    json_response([
                        'error' => true,
                        'message' => 'Cannot set head_of_request_id when request_sub_type is empty',
                    ], 422);
                    return;
                }

                $chkHead = $this->pdo->prepare('SELECT 1 FROM head_of_request WHERE id = :hid AND request_sub_type_id = :sid LIMIT 1');
                $chkHead->execute([':hid' => $headId, ':sid' => $subTypeInt]);
                if (!$chkHead->fetchColumn()) {
                    json_response([
                        'error' => true,
                        'message' => 'Invalid head_of_request_id for this request_sub_type',
                    ], 422);
                    return;
                }
            }

            // urgency_id (nullable)
            $urgRaw = $body['urgency_id'] ?? null;
            $urgencyId = null;
            if ($urgRaw !== null && $urgRaw !== '' && is_numeric($urgRaw)) {
                $urgencyId = (int)$urgRaw;
                if ($urgencyId <= 0) $urgencyId = null;
            }
            if ($urgencyId !== null) {
                $chkUrg = $this->pdo->prepare('SELECT 1 FROM urgency WHERE urgency_id = :id LIMIT 1');
                $chkUrg->execute([':id' => $urgencyId]);
                if (!$chkUrg->fetchColumn()) {
                    json_response([
                        'error' => true,
                        'message' => 'Invalid urgency_id',
                    ], 422);
                    return;
                }
            }

            // current_status_id (nullable but recommended)
            $statusRaw = $body['current_status_id'] ?? null;
            $statusId = null;
            if ($statusRaw !== null && $statusRaw !== '' && is_numeric($statusRaw)) {
                $statusId = (int)$statusRaw;
                if ($statusId <= 0) $statusId = null;
            }

            if ($statusId !== null) {
                $chkStatus = $this->pdo->prepare('SELECT 1 FROM request_status WHERE status_id = :sid AND request_type_id = :rt LIMIT 1');
                $chkStatus->execute([':sid' => $statusId, ':rt' => $requestTypeId]);
                if (!$chkStatus->fetchColumn()) {
                    json_response([
                        'error' => true,
                        'message' => 'Invalid current_status_id for this request_type',
                    ], 422);
                    return;
                }
            } else {
                // keep existing if still valid, else set default
                $existingSid = (int)($req['current_status_id'] ?? 0);
                if ($existingSid > 0) {
                    $chkStatus = $this->pdo->prepare('SELECT 1 FROM request_status WHERE status_id = :sid AND request_type_id = :rt LIMIT 1');
                    $chkStatus->execute([':sid' => $existingSid, ':rt' => $requestTypeId]);
                    if ($chkStatus->fetchColumn()) {
                        $statusId = $existingSid;
                    }
                }

                if ($statusId === null) {
                    $stmtDef = $this->pdo->prepare('SELECT status_id FROM request_status WHERE request_type_id = :rt ORDER BY sort_order ASC, status_id ASC LIMIT 1');
                    $stmtDef->execute([':rt' => $requestTypeId]);
                    $defSid = $stmtDef->fetchColumn();
                    $statusId = (is_numeric($defSid) && (int)$defSid > 0) ? (int)$defSid : null;
                }
            }

            // approve_by_id + approve_channel_id are stored when status becomes 'approved'
            $existingStatusId = (int)($req['current_status_id'] ?? 0);
            $oldCode = $existingStatusId > 0 ? $this->getStatusCodeById($existingStatusId) : null;
            $newCode = ($statusId !== null && $statusId > 0) ? $this->getStatusCodeById((int)$statusId) : $oldCode;

            $setApproveMeta = ($newCode === 'approved' && $oldCode !== 'approved');

            $userId = (int)($me['user_id'] ?? 0);
            if ($userId <= 0) {
                $userId = (int)($this->getAuthUserId() ?? 0);
            }

            $approveById = null;
            $webChannelId = null;
            if ($setApproveMeta && $userId > 0) {
                $approveById = $this->resolveApproveById($requestTypeId, $userId);
                $webChannelId = $this->getChannelIdByName('web');
            }

            $sql = "
                UPDATE request
                SET
                    subject = :subject,
                    detail = :detail,
                    head_of_request_id = :hid,
                    urgency_id = :urg,
                    start_date_time = :start_dt,
                    end_date_time = :end_dt,
                    current_status_id = :sid";

            if ($setApproveMeta) {
                $sql .= ",
                    approve_by_id = :approve_by_id,
                    approve_channel_id = :approve_channel_id,
                    approve_at = NOW()";
            }

            $sql .= "
                WHERE request_id = :rid
                LIMIT 1
            ";

            $params = [
                ':subject' => $subject,
                ':detail' => $detail,
                ':hid' => $headId,
                ':urg' => $urgencyId,
                ':start_dt' => $startVal,
                ':end_dt' => $endVal,
                ':sid' => $statusId,
                ':rid' => $id,
            ];

            if ($setApproveMeta) {
                $params[':approve_by_id'] = $approveById;
                $params[':approve_channel_id'] = ($webChannelId !== null && $webChannelId > 0) ? $webChannelId : null;
            }

            $dispatchJobs = [];
            $eventMeta = null;

            $this->pdo->beginTransaction();

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);

            if ($setApproveMeta) {
                // side effects when request transitions to approved
                $updatedBy = (int)($me['user_id'] ?? 0);
                if ($updatedBy <= 0) {
                    $updatedBy = (int)($this->getAuthUserId() ?? 0);
                }
                if ($updatedBy <= 0) {
                    $updatedBy = 0;
                }

                $eventMeta = $this->handleApprovedSideEffects($id, $req, [
                    'subject' => $subject,
                    'detail' => $detail,
                    'start_date_time' => $startVal,
                    'end_date_time' => $endVal,
                    'head_of_request_id' => $headId,
                ], $updatedBy);

                $dispatchJobs = $eventMeta['dispatch_jobs'] ?? [];
            }

            $this->pdo->commit();

            // Dispatch LINE after commit (best effort)
            $this->dispatchApprovedJobs($dispatchJobs);

            // return updated in the same shape as show()
            $this->show($id);
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            json_response([
                'error' => true,
                'message' => 'Failed to update request',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /requests/{id}/attachments
     * multipart/form-data: attachments[]
     */
    public function addAttachments(int $id): void
    {
        try {
            $me = $this->requireStaffAccess(true);

            $id = max(1, (int)$id);
            $model = new RequestModel($this->pdo);
            $req = $model->findById($id);
            if (!$req) {
                json_response([
                    'error' => true,
                    'message' => 'Request not found',
                ], 404);
                return;
            }

            $uploadedBy = (int)($me['user_id'] ?? 0);
            if ($uploadedBy <= 0) {
                $uploadedBy = (int)($this->getAuthUserId() ?? 0);
            }
            if ($uploadedBy <= 0) {
                $uploadedBy = 0;
            }

            $files = [];
            if (!empty($_FILES)) {
                if (isset($_FILES['attachments']) && isset($_FILES['attachments']['name']) && is_array($_FILES['attachments']['name'])) {
                    foreach ($_FILES['attachments']['name'] as $idx => $name) {
                        $files[] = [
                            'name' => $name,
                            'type' => $_FILES['attachments']['type'][$idx] ?? '',
                            'tmp_name' => $_FILES['attachments']['tmp_name'][$idx] ?? '',
                            'error' => $_FILES['attachments']['error'][$idx] ?? UPLOAD_ERR_NO_FILE,
                            'size' => $_FILES['attachments']['size'][$idx] ?? 0,
                        ];
                    }
                } elseif (isset($_FILES['attachment']) && is_array($_FILES['attachment'])) {
                    $files[] = $_FILES['attachment'];
                } elseif (isset($_FILES['file']) && is_array($_FILES['file'])) {
                    $files[] = $_FILES['file'];
                }
            }

            $hasAny = false;
            foreach ($files as $f) {
                if (($f['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK) {
                    $hasAny = true;
                    break;
                }
            }
            if (!$hasAny) {
                json_response([
                    'error' => true,
                    'message' => 'No attachments uploaded',
                ], 422);
                return;
            }

            $this->pdo->beginTransaction();

            $insSql = "
                INSERT INTO request_attachment
                    (request_id, filepath, original_filename, stored_filename, file_size, uploaded_by, uploaded_at)
                VALUES
                    (:request_id, :filepath, :original_filename, :stored_filename, :file_size, :uploaded_by, NOW())
            ";
            $insStmt = $this->pdo->prepare($insSql);

            foreach ($files as $file) {
                if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
                    continue;
                }

                $saved = $this->saveRequestAttachmentFile($id, $uploadedBy, $file);
                if (!is_array($saved)) {
                    continue;
                }

                $insStmt->execute([
                    ':request_id' => $id,
                    ':filepath' => $saved['filepath'],
                    ':original_filename' => $saved['original_filename'],
                    ':stored_filename' => $saved['stored_filename'],
                    ':file_size' => $saved['file_size'],
                    ':uploaded_by' => $uploadedBy,
                ]);
            }

            // mark request as having attachments
            $upd = $this->pdo->prepare('UPDATE request SET hasAttachment = 1 WHERE request_id = :id LIMIT 1');
            $upd->execute([':id' => $id]);

            $this->pdo->commit();

            $this->show($id);
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            json_response([
                'error' => true,
                'message' => 'Failed to upload attachments',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /requests/{id}
     */
    public function delete(int $id): void
    {
        try {
            $this->requireStaffAccess();

            $id = max(1, (int)$id);
            $model = new RequestModel($this->pdo);
            $req = $model->findById($id);
            if (!$req) {
                json_response([
                    'error' => true,
                    'message' => 'Request not found',
                ], 404);
                return;
            }

            $this->pdo->beginTransaction();

            // delete dependent notifications
            $delNotif = $this->pdo->prepare('DELETE FROM notification WHERE request_id = :id');
            $delNotif->execute([':id' => $id]);

            // delete attachments rows (files on disk are kept for now)
            $delAtt = $this->pdo->prepare('DELETE FROM request_attachment WHERE request_id = :id');
            $delAtt->execute([':id' => $id]);

            $del = $this->pdo->prepare('DELETE FROM request WHERE request_id = :id LIMIT 1');
            $del->execute([':id' => $id]);

            $this->pdo->commit();

            json_response([
                'error' => false,
                'message' => 'Deleted',
            ]);
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            json_response([
                'error' => true,
                'message' => 'Failed to delete request',
                'detail' => $e->getMessage(),
            ], 500);
        }
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
     * repair (type=3) เพิ่ม:
     * - device_id
     * - request_sub_type = NULL
     * - start/end ไม่ใช้ (NULL)
     * - location จะดึงจาก organization.location ของอุปกรณ์
     *
     * other (type=4) เพิ่ม:
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
            $deviceIdRaw = $body['device_id'] ?? null;
            $deviceId = null;

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

            } elseif ($requestType === self::REQUEST_TYPE_REPAIR) {

                // ✅ repair: ต้องมี device_id
                if ($deviceIdRaw === null || $deviceIdRaw === '' || !is_numeric($deviceIdRaw) || (int) $deviceIdRaw <= 0) {
                    $errors['device_id'] = 'device_id is required and must be number > 0';
                } else {
                    $deviceId = (int) $deviceIdRaw;
                }

                // ✅ repair: บังคับ subtype = 6 (ตาม requirement)
                $requestSubType = 6;
                $start = '';
                $end = '';
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
            $files = [];

            if (!empty($_FILES)) {
                // multiple: attachments[]
                if (isset($_FILES['attachments']) && isset($_FILES['attachments']['name']) && is_array($_FILES['attachments']['name'])) {
                    foreach ($_FILES['attachments']['name'] as $idx => $name) {
                        $files[] = [
                            'name' => $name,
                            'type' => $_FILES['attachments']['type'][$idx] ?? '',
                            'tmp_name' => $_FILES['attachments']['tmp_name'][$idx] ?? '',
                            'error' => $_FILES['attachments']['error'][$idx] ?? UPLOAD_ERR_NO_FILE,
                            'size' => $_FILES['attachments']['size'][$idx] ?? 0,
                        ];
                    }
                } elseif (isset($_FILES['attachment']) && is_array($_FILES['attachment'])) {
                    // single fallback (เผื่อใช้ attachment)
                    $files[] = $_FILES['attachment'];
                } elseif (isset($_FILES['file']) && is_array($_FILES['file'])) {
                    // single fallback (เผื่อใช้ file)
                    $files[] = $_FILES['file'];
                }
            }

            foreach ($files as $f) {
                if (($f['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK) {
                    $hasAttachment = 1;
                    break;
                }
            }

            // 9) เติมข้อมูลเฉพาะ repair: ดึง location/province จาก device -> org
            $derivedLocation = null;
            if ($requestType === self::REQUEST_TYPE_REPAIR) {
                $meta = $this->getDeviceOrganizationMeta((int) $deviceId);
                if (!$meta) {
                    json_response([
                        'error' => true,
                        'message' => 'Invalid device_id (device/organization not found)',
                    ], 422);
                    return;
                }

                $deviceProvinceId = (int) ($meta['province_id'] ?? 0);
                if ($deviceProvinceId > 0 && $deviceProvinceId !== $provinceId) {
                    json_response([
                        'error' => true,
                        'message' => 'Validation failed',
                        'errors' => [
                            'province_id' => 'Selected device is not in the selected province',
                        ],
                    ], 422);
                    return;
                }

                $derivedLocation = trim((string) ($meta['location'] ?? ''));
                $derivedLocation = $derivedLocation !== '' ? $derivedLocation : null;
            }

            // 10) insert request
            $payload = [
                'request_type' => $requestType,

                // ✅ conference/other ใช้ subtype จาก client, repair บังคับ = 6
                'request_sub_type' => ($requestType === self::REQUEST_TYPE_REPAIR) ? 6 : (int) $requestSubType,

                'subject' => $subject,
                'device_id' => ($requestType === self::REQUEST_TYPE_REPAIR) ? (int) $deviceId : null,
                'detail' => $detail,
                'requester_id' => $requesterId,
                'province_id' => $provinceId,

                // ✅ other: ใช้ location จากฟอร์ม, repair: ใช้ derived, conference: null
                'location' => ($requestType === self::REQUEST_TYPE_OTHER)
                    ? (($location !== '') ? $location : null)
                    : (($requestType === self::REQUEST_TYPE_REPAIR) ? $derivedLocation : null),

                'hasAttachment' => $hasAttachment,
                'head_of_request_id' => null,
                'approve_by_id' => null,
                'approve_channel_id' => null,
                'urgency_id' => null,
                'approve_at' => null,

                // ✅ conference/other มีค่า (ตาม validation), repair เป็น null
                'start_date_time' => ($start !== '') ? $start : null,
                'end_date_time' => ($end !== '') ? $end : null,
            ];

            $this->pdo->beginTransaction();

            $model = new RequestModel($this->pdo);
            $newId = $model->create($payload);

            // 10.x) create notification row (ต้องอยู่ใน transaction เพื่อให้แน่ใจว่า request insert แล้ว)
            $notifMeta = null;
            try {
                $notifSvc = new NotificationService($this->pdo);
                $notifMeta = $notifSvc->createNewRequestNotification($newId, $requestType, $subject);
            } catch (Throwable $e) {
                // ถ้า notification ล้มเหลว ให้ rollback ทั้งหมด (requirement: ทุก request ต้องมี notification)
                $this->pdo->rollBack();
                json_response([
                    'error' => true,
                    'message' => 'Failed to create request notification',
                    'detail' => $e->getMessage(),
                ], 500);
                return;
            }

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

            // 11) dispatch notification (best effort) หลัง commit เพื่อไม่ให้ค้าง transaction
            if (is_array($notifMeta)) {
                try {
                    $notifSvc = new NotificationService($this->pdo);
                    $dispatch = $notifSvc->dispatchToStaff(
                        (int)($notifMeta['notification_type_id'] ?? 0),
                        (string)($notifMeta['message'] ?? '')
                    );
                    // log เฉย ๆ ไม่ให้กระทบ response
                    if (($dispatch['ok'] ?? false) !== true) {
                        error_log('[REQUESTS] dispatch notification not ok: ' . json_encode($dispatch, JSON_UNESCAPED_UNICODE));
                    }
                } catch (Throwable $e) {
                    error_log('[REQUESTS] dispatch notification failed: ' . $e->getMessage());
                }
            }

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

    /* ========================= internal: status update ========================= */

    private function setStatusByCode(int $requestId, string $statusCode): void
    {
        try {
            $me = $this->requireStaffAccess(true);

            $requestId = max(1, (int)$requestId);
            $statusCode = trim($statusCode);

            // load request
            $model = new RequestModel($this->pdo);
            $req = $model->findById($requestId);
            if (!$req) {
                json_response([
                    'error' => true,
                    'message' => 'Request not found',
                ], 404);
                return;
            }

            $requestTypeId = (int)($req['request_type'] ?? 0);
            if ($requestTypeId <= 0) {
                json_response([
                    'error' => true,
                    'message' => 'Invalid request_type',
                ], 422);
                return;
            }

            $targetStatusId = $this->getStatusIdByCode($requestTypeId, $statusCode);
            if ($targetStatusId === null) {
                json_response([
                    'error' => true,
                    'message' => 'Target status not found for this request type',
                    'detail' => "status_code={$statusCode}, request_type={$requestTypeId}",
                ], 422);
                return;
            }

            $approverId = (int)($me['user_id'] ?? 0);
            if ($approverId <= 0) {
                $approverId = (int)($this->getAuthUserId() ?? 0);
            }

            $statusCodeNorm = strtolower($statusCode);
            $isApprovedTarget = ($statusCodeNorm === 'approved');

            $existingStatusId = (int)($req['current_status_id'] ?? 0);
            $oldCode = $existingStatusId > 0 ? $this->getStatusCodeById($existingStatusId) : null;
            $isApprovedTransition = ($isApprovedTarget && $oldCode !== 'approved');

            $dispatchJobs = [];
            $eventMeta = null;

            $this->pdo->beginTransaction();

            // Stamp approve meta when status transitions to approved
            if ($isApprovedTransition) {
                $webChannelId = $this->getChannelIdByName('web');
                $approveById = ($approverId > 0 && $requestTypeId > 0)
                    ? $this->resolveApproveById($requestTypeId, $approverId)
                    : null;
                $sql = "
                    UPDATE request
                    SET
                        current_status_id = :sid,
                        approve_by_id = :uid,
                        approve_channel_id = :cid,
                        approve_at = NOW()
                    WHERE request_id = :rid
                    LIMIT 1
                ";
                $stmt = $this->pdo->prepare($sql);
                $stmt->execute([
                    ':sid' => $targetStatusId,
                    ':uid' => $approveById,
                    ':cid' => ($webChannelId !== null && $webChannelId > 0) ? $webChannelId : null,
                    ':rid' => $requestId,
                ]);
            } else {
                $sql = "
                    UPDATE request
                    SET
                        current_status_id = :sid
                    WHERE request_id = :rid
                    LIMIT 1
                ";
                $stmt = $this->pdo->prepare($sql);
                $stmt->execute([
                    ':sid' => $targetStatusId,
                    ':rid' => $requestId,
                ]);
            }

            if ($isApprovedTransition) {
                $eventMeta = $this->handleApprovedSideEffects($requestId, $req, [], $approverId);
                $dispatchJobs = $eventMeta['dispatch_jobs'] ?? [];
            }

            $this->pdo->commit();

            // Dispatch LINE after commit (best effort)
            $this->dispatchApprovedJobs($dispatchJobs);

            // return updated
            $updated = $model->findById($requestId);
            json_response([
                'error' => false,
                'message' => 'Updated',
                'data' => array_merge(
                    $updated ?? ['request_id' => $requestId, 'current_status_id' => $targetStatusId],
                    $eventMeta && isset($eventMeta['event_id']) ? ['event_id' => (int)$eventMeta['event_id']] : []
                ),
            ]);
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            json_response([
                'error' => true,
                'message' => 'Failed to update request status',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Handle side effects when a request transitions to approved:
     * - create event (idempotent by request_id)
     * - insert notification rows (request_accepted)
     * - prepare LINE dispatch jobs (best effort)
     *
     * IMPORTANT: Call this inside an existing DB transaction.
     *
     * @param array<string,mixed> $requestRow Row from request table (RequestModel::findById)
     * @param array<string,mixed> $overrides Optional updated values (subject/detail/start/end/head_of_request_id)
     * @return array{event_id:int, created_event:bool, notification_ids:array<int,int>, dispatch_jobs:array<int,array{user_id:int,message:string}>}
     */
    private function handleApprovedSideEffects(int $requestId, array $requestRow, array $overrides, int $updatedByUserId): array
    {
        $requestId = max(1, (int)$requestId);

        $updatedByUserId = (int)$updatedByUserId;
        if ($updatedByUserId < 0) $updatedByUserId = 0;

        $req = array_merge($requestRow, $overrides);

        $requestTypeId = (int)($req['request_type'] ?? 0);
        $subject = trim((string)($req['subject'] ?? ''));
        $detail = (string)($req['detail'] ?? '');

        // 1) create/find event
        $eventModel = new EventModel($this->pdo);
        $existingEvent = $eventModel->findByRequestId($requestId);

        $createdEvent = false;
        $eventId = 0;

        if ($existingEvent && isset($existingEvent['event_id'])) {
            $eventId = (int)$existingEvent['event_id'];
        } else {
            $eventStatusId = $this->getDefaultEventStatusIdByRequestType($requestTypeId);

            // round_no should run per year, and event_year stored as Thai B.E. year (พ.ศ.)
            $startDt = $req['start_date_time'] ?? null;
            $eventYearBE = $this->computeEventYearBE(is_string($startDt) ? $startDt : null);
            $roundNo = $this->getNextEventRoundNo($eventYearBE);

            $eventId = $eventModel->create([
                'request_id' => $requestId,
                'title' => ($subject !== '' ? $subject : ('Request #' . $requestId)),
                'detail' => $detail,
                'location' => $req['location'] ?? null,
                'province_id' => $req['province_id'] ?? null,
                'meeting_link' => null,
                'round_no' => $roundNo,
                'event_year' => $eventYearBE,
                'note' => null,
                'event_status_id' => $eventStatusId,
                'start_datetime' => $req['start_date_time'] ?? null,
                'end_datetime' => $req['end_date_time'] ?? null,
                'updated_by' => $updatedByUserId,
            ]);
            $createdEvent = true;
        }

        // 2) build link
        $eventLink = $this->buildEventEditUrl($eventId);
        $suffix = $subject !== '' ? (' — ' . $subject) : '';
        $linkLine = $eventLink !== '' ? ("\nแก้ไขรายละเอียดงาน: " . $eventLink) : '';

        // 3) recipients
        $requesterId = (int)($req['requester_id'] ?? 0);
        $headOfRequestId = $req['head_of_request_id'] ?? null;
        $headUserId = $this->resolveHeadStaffUserId($headOfRequestId);

        $dispatchJobs = [];
        $notificationIds = [];

        // 4) insert notifications (request_accepted = 7)
        $notifModel = new NotificationModel($this->pdo);

        if ($requesterId > 0) {
            $msg = "คำขอได้รับการอนุมัติแล้ว (#{$requestId}){$suffix}{$linkLine}";
            $notificationIds[] = $notifModel->createRequestAccepted([
                'request_id' => $requestId,
                'event_id' => $eventId,
                'notification_type_id' => 7,
                'message' => $msg,
            ]);
            $dispatchJobs[] = ['user_id' => $requesterId, 'message' => $msg];
        }

        // IMPORTANT: requirement is to insert 2 notifications (requester + head_of_request)
        // even when head_of_request is the same person as requester.
        if ($headUserId > 0) {
            $msg = "มีงานเข้ามาในความรับผิดชอบของคุณ (#{$requestId}){$suffix}{$linkLine}";
            $notificationIds[] = $notifModel->createRequestAccepted([
                'request_id' => $requestId,
                'event_id' => $eventId,
                'notification_type_id' => 7,
                'message' => $msg,
            ]);
            // Requirement: also push message for head_of_request via LINE (even if same user as requester)
            $dispatchJobs[] = ['user_id' => $headUserId, 'message' => $msg];
        }

        return [
            'event_id' => $eventId,
            'created_event' => $createdEvent,
            'notification_ids' => $notificationIds,
            'dispatch_jobs' => $dispatchJobs,
        ];
    }

    /**
     * Dispatch prepared LINE jobs (best effort). Safe to call outside transaction.
     *
     * @param array<int,array{user_id:int,message:string}> $jobs
     */
    private function dispatchApprovedJobs(array $jobs): void
    {
        if (empty($jobs)) return;

        try {
            $svc = new NotificationService($this->pdo);
            foreach ($jobs as $j) {
                $uid = (int)($j['user_id'] ?? 0);
                $msg = trim((string)($j['message'] ?? ''));
                if ($uid <= 0 || $msg === '') continue;
                $resp = $svc->dispatchToUsers([$uid], $msg);
                if (($resp['ok'] ?? false) !== true) {
                    error_log('[REQUESTS] dispatchToUsers not ok: ' . json_encode($resp, JSON_UNESCAPED_UNICODE));
                    continue;
                }

                // Even when ok=true, LINE push might have failed for that user (e.g. invalid/missing line_user_id)
                if (!empty($resp['errors'])) {
                    error_log('[REQUESTS] dispatchToUsers errors: ' . json_encode($resp, JSON_UNESCAPED_UNICODE));
                }
            }
        } catch (Throwable $e) {
            error_log('[REQUESTS] dispatchToUsers failed: ' . $e->getMessage());
        }
    }

    private function getDefaultEventStatusIdByRequestType(int $requestTypeId): ?int
    {
        $requestTypeId = max(0, (int)$requestTypeId);
        if ($requestTypeId <= 0) return null;

        $stmt = $this->pdo->prepare('
            SELECT event_status_id
            FROM event_status
            WHERE request_type_id = :rt
            ORDER BY sort_order ASC, event_status_id ASC
            LIMIT 1
        ');
        $stmt->execute([':rt' => $requestTypeId]);
        $id = $stmt->fetchColumn();
        return (is_numeric($id) && (int)$id > 0) ? (int)$id : null;
    }

    /**
     * Compute Thai B.E. year (พ.ศ.) for event.
     * - Prefer start datetime year if provided
     * - Fallback to current year
     */
    private function computeEventYearBE(?string $startDatetime): int
    {
        $y = 0;
        $startDatetime = $startDatetime !== null ? trim($startDatetime) : '';

        if ($startDatetime !== '') {
            try {
                $dt = new DateTimeImmutable($startDatetime);
                $y = (int)$dt->format('Y');
            } catch (Throwable $e) {
                $y = 0;
            }
        }

        if ($y <= 0) {
            $y = (int)date('Y');
        }

        // Convert to Thai B.E.
        return $y + 543;
    }

    /**
     * Get next round number for a given event year (B.E.).
     * IMPORTANT: call inside an existing transaction.
     */
    private function getNextEventRoundNo(int $eventYearBE): int
    {
        $eventYearBE = (int)$eventYearBE;
        if ($eventYearBE <= 0) {
            $eventYearBE = $this->computeEventYearBE(null);
        }

        // Lock rows for this year to reduce chance of duplicate round_no under concurrency.
        $stmt = $this->pdo->prepare('
            SELECT MAX(round_no) AS max_round
            FROM event
            WHERE event_year = :y
            FOR UPDATE
        ');
        $stmt->execute([':y' => $eventYearBE]);
        $max = $stmt->fetchColumn();
        $maxNo = (is_numeric($max) ? (int)$max : 0);
        return max(0, $maxNo) + 1;
    }

    private function resolveHeadStaffUserId(mixed $headOfRequestId): int
    {
        if ($headOfRequestId === null || $headOfRequestId === '' || !is_numeric($headOfRequestId)) {
            return 0;
        }
        $hid = (int)$headOfRequestId;
        if ($hid <= 0) return 0;

        // Join with `user` via head_of_request.staff_id (FK -> user.user_id)
        $stmt = $this->pdo->prepare('
            SELECT u.user_id
            FROM head_of_request h
            INNER JOIN user u ON u.user_id = h.staff_id
            WHERE h.id = :id
            LIMIT 1
        ');
        $stmt->execute([':id' => $hid]);
        $uid = $stmt->fetchColumn();
        return (is_numeric($uid) && (int)$uid > 0) ? (int)$uid : 0;
    }

    private function buildEventEditUrl(int $eventId): string
    {
        $eventId = max(0, (int)$eventId);
        if ($eventId <= 0) return '';

        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host = (string)($_SERVER['HTTP_HOST'] ?? '');
        if ($host === '') return '';

        $basePath = env('BASE_PATH', '/ict8') ?: '/ict8';
        if ($basePath === '') $basePath = '/ict8';
        if ($basePath[0] !== '/') $basePath = '/' . $basePath;

        return $scheme . '://' . $host . rtrim($basePath, '/') . '/schedule/event-edit.html?event_id=' . $eventId;
    }

    private function getStatusIdByCode(int $requestTypeId, string $statusCode): ?int
    {
        $statusCode = trim($statusCode);
        if ($requestTypeId <= 0 || $statusCode === '') return null;

        $sql = "
            SELECT status_id
            FROM request_status
            WHERE request_type_id = :rt
              AND status_code = :code
            LIMIT 1
        ";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':rt' => $requestTypeId,
            ':code' => $statusCode,
        ]);
        $sid = $stmt->fetchColumn();
        if (!is_numeric($sid) || (int)$sid <= 0) return null;
        return (int)$sid;
    }

    private function getChannelIdByName(string $channelName): ?int
    {
        $name = strtolower(trim($channelName));
        if ($name === '') return null;

        $stmt = $this->pdo->prepare('SELECT channel_id FROM channel WHERE LOWER(channel) = :c LIMIT 1');
        $stmt->execute([':c' => $name]);
        $id = $stmt->fetchColumn();
        return (is_numeric($id) && (int)$id > 0) ? (int)$id : null;
    }

    /**
     * approve_by_id in request references notification_type_staff.id
     * where (notification_type_id, user_id) matches and is_enabled = 1.
     */
    private function resolveApproveById(int $requestTypeId, int $userId): ?int
    {
        $requestTypeId = max(0, (int)$requestTypeId);
        $userId = max(0, (int)$userId);
        if ($requestTypeId <= 0 || $userId <= 0) return null;

        $notifTypeId = $this->resolveNotificationTypeIdForRequestType($requestTypeId);
        if ($notifTypeId === null) return null;

        $stmt = $this->pdo->prepare('
            SELECT id
            FROM notification_type_staff
            WHERE notification_type_id = :tid
              AND user_id = :uid
              AND is_enabled = 1
            LIMIT 1
        ');
        $stmt->execute([':tid' => $notifTypeId, ':uid' => $userId]);
        $id = $stmt->fetchColumn();
        return (is_numeric($id) && (int)$id > 0) ? (int)$id : null;
    }

    private function resolveNotificationTypeIdForRequestType(int $requestTypeId): ?int
    {
        // Keep mapping consistent with NotificationService
        return match ($requestTypeId) {
            3 => NotificationService::NOTIF_TYPE_REQUEST_REPAIR,
            4 => NotificationService::NOTIF_TYPE_REQUEST_OTHER,
            2 => NotificationService::NOTIF_TYPE_REQUEST_CONFERENCE,
            default => null,
        };
    }

    private function getStatusCodeById(int $statusId): ?string
    {
        $statusId = max(0, (int)$statusId);
        if ($statusId <= 0) return null;

        $stmt = $this->pdo->prepare('SELECT status_code FROM request_status WHERE status_id = :id LIMIT 1');
        $stmt->execute([':id' => $statusId]);
        $code = strtolower(trim((string)($stmt->fetchColumn() ?? '')));
        return $code !== '' ? $code : null;
    }

    /**
     * ใช้กับฝั่งเจ้าหน้าที่/แอดมิน: รองรับทั้ง Bearer token และ dev API key (เฉพาะ APP_ENV=dev)
     * @return array<string,mixed>|null user payload if using token
     */
    private function requireStaffAccess(bool $returnUser = false): ?array
    {
        // 1) ถ้ามี token ให้ใช้ auth ปกติ
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

        // 2) fallback: dev key (only in dev)
        if (function_exists('require_dev_staff')) {
            require_dev_staff();
            return null;
        }

        // 3) fallback: require_auth if available
        if (function_exists('require_auth')) {
            $u = require_auth($this->pdo);
            return $returnUser ? $u : $u;
        }

        return null;
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
        $rand = bin2hex(random_bytes(3));
        $stored = "req_{$requestId}_u{$uploadedBy}_{$stamp}_{$rand}." . $safeExt;

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

    /**
     * ใช้สำหรับ repair: หา organization/location/province ของอุปกรณ์
     */
    private function getDeviceOrganizationMeta(int $deviceId): ?array
    {
        $sql = "
            SELECT
                org.organization_id,
                org.province_id,
                org.location
            FROM device d
            LEFT JOIN contact_info ci ON ci.contact_info_id = d.contact_info_id
            LEFT JOIN organization org ON org.organization_id = ci.organization_id
            WHERE d.device_id = :device_id
            LIMIT 1
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':device_id' => $deviceId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) return null;

        // ถ้าอุปกรณ์ไม่มี org ก็ถือว่าใช้ไม่ได้สำหรับ flow นี้
        if (!isset($row['organization_id']) || !is_numeric($row['organization_id'])) {
            return null;
        }

        return $row;
    }
}
?>
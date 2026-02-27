<?php
// backend/controllers/request_status.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../models/RequestStatusModel.php';

class RequestStatusController
{
        /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    // GET /request-status?q=&request_type_id=&page=&limit=
    public function index(): void
    {
        try {
            $q = trim((string)($_GET['q'] ?? ''));
            $requestTypeId = (int)($_GET['request_type_id'] ?? 0);
            $page = (int)($_GET['page'] ?? 1);
            $limit = (int)($_GET['limit'] ?? 50);

            $m = new RequestStatusModel($this->pdo);

            $items = $m->list($q, $requestTypeId, $page, $limit);
            $total = $m->count($q, $requestTypeId);

            json_response([
                'error' => false,
                'data' => $items,
                'pagination' => [
                    'page' => max(1, $page),
                    'limit' => max(1, min(200, $limit)),
                    'total' => $total,
                    'totalPages' => (int)ceil($total / max(1, min(200, $limit))),
                ],
            ]);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to get request statuses',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    // GET /request-status/{id}
    public function show(int $id): void
    {
        $m = new RequestStatusModel($this->pdo);
        $row = $m->findById($id);
        if (!$row) json_response(['error' => true, 'message' => 'Not found'], 404);
        json_response(['error' => false, 'data' => $row]);
    }

    // POST /request-status
    public function create(): void
    {
        try {
            $body = read_json_body();

            $statusCode = trim((string)($body['status_code'] ?? ''));
            $statusName = trim((string)($body['status_name'] ?? ''));
            $meaning = trim((string)($body['meaning'] ?? ''));
            $requestTypeId = (int)($body['request_type_id'] ?? 0);
            $sortOrder = (int)($body['sort_order'] ?? 0);

            if ($statusCode === '' || $statusName === '' || $requestTypeId <= 0) {
                json_response(['error' => true, 'message' => 'Missing required fields'], 422);
            }

            $m = new RequestStatusModel($this->pdo);
            $id = $m->create([
                'status_code' => $statusCode,
                'status_name' => $statusName,
                'meaning' => $meaning,
                'request_type_id' => $requestTypeId,
                'sort_order' => $sortOrder,
            ]);

            json_response(['error' => false, 'data' => ['status_id' => $id]], 201);
        } catch (Throwable $e) {
            json_response(['error' => true, 'message' => 'Failed to create request status', 'detail' => $e->getMessage()], 500);
        }
    }

    // PUT /request-status/{id}
    public function update(int $id): void
    {
        try {
            $body = read_json_body();

            $statusCode = trim((string)($body['status_code'] ?? ''));
            $statusName = trim((string)($body['status_name'] ?? ''));
            $meaning = trim((string)($body['meaning'] ?? ''));
            $requestTypeId = (int)($body['request_type_id'] ?? 0);
            $sortOrder = (int)($body['sort_order'] ?? 0);

            if ($statusCode === '' || $statusName === '' || $requestTypeId <= 0) {
                json_response(['error' => true, 'message' => 'Missing required fields'], 422);
            }

            $m = new RequestStatusModel($this->pdo);
            $ok = $m->update($id, [
                'status_code' => $statusCode,
                'status_name' => $statusName,
                'meaning' => $meaning,
                'request_type_id' => $requestTypeId,
                'sort_order' => $sortOrder,
            ]);

            json_response(['error' => !$ok, 'message' => $ok ? 'Updated' : 'Update failed']);
        } catch (Throwable $e) {
            json_response(['error' => true, 'message' => 'Failed to update request status', 'detail' => $e->getMessage()], 500);
        }
    }

    // DELETE /request-status/{id}
    public function delete(int $id): void
    {
        try {
            $m = new RequestStatusModel($this->pdo);
            $ok = $m->delete($id);
            json_response(['error' => !$ok, 'message' => $ok ? 'Deleted' : 'Delete failed']);
        } catch (Throwable $e) {
            json_response(['error' => true, 'message' => 'Failed to delete request status', 'detail' => $e->getMessage()], 500);
        }
    }
}

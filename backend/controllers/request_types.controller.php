<?php
// backend/controllers/request_types.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
// ถ้าต้องการบังคับ login/admin ค่อยเปิดใช้
// require_once __DIR__ . '/../middleware/auth.php';

require_once __DIR__ . '/../models/RequestTypeModel.php';

class RequestTypesController
{
    public function __construct(private PDO $pdo)
    {
    }

    /**
     * GET /request-types?q=&page=&limit=
     */
public function index(): void
{
    try {
        $q = trim((string)($_GET['q'] ?? ''));
        $page = (int)($_GET['page'] ?? 1);
        $limit = (int)($_GET['limit'] ?? 50);

        $page = max(1, $page);
        $limit = max(1, min(200, $limit));

        $model = new RequestTypeModel($this->pdo);

        $items = $model->list($q, $page, $limit);
        $total = $model->count($q);

        json_response([
            'error' => false,
            'data' => [
                'items' => $items,
            ],
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
            'message' => 'Failed to get request types',
            'detail' => $e->getMessage(),
        ], 500);
    }
}

    /**
     * GET /request-types/{id}
     */
    public function show(int $id): void
    {
        try {
            $model = new RequestTypeModel($this->pdo);
            $row = $model->findById($id);

            if (!$row) {
                json_response([
                    'error' => true,
                    'message' => 'Not found',
                    'detail' => 'request_type not found',
                ], 404);
                return;
            }

            json_response([
                'error' => false,
                'data' => $row,
            ]);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to get request type',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /request-types
     * body: { type_name, discription?, url_link? }
     */
    public function create(): void
    {
        try {
            // ถ้าต้องการบังคับ login/admin ค่อยเปิด
            // auth_require();

            $body = read_json_body();

            // validate
            $typeName = trim((string)($body['type_name'] ?? ''));
            if ($typeName === '') {
                json_response([
                    'error' => true,
                    'message' => 'Validation failed',
                    'detail' => 'type_name is required',
                ], 422);
                return;
            }

            $payload = [
                'type_name' => $typeName,
                'discription' => isset($body['discription']) ? (string)$body['discription'] : null,
                'url_link' => isset($body['url_link']) ? (string)$body['url_link'] : null,
            ];

            $model = new RequestTypeModel($this->pdo);
            $newId = $model->create($payload);

            $row = $model->findById($newId);

            json_response([
                'error' => false,
                'message' => 'Created',
                'data' => $row,
            ], 201);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to create request type',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PUT /request-types/{id}
     * body: { type_name, discription?, url_link? }
     */
    public function update(int $id): void
    {
        try {
            // ถ้าต้องการบังคับ login/admin ค่อยเปิด
            // auth_require();

            $model = new RequestTypeModel($this->pdo);
            $exists = $model->findById($id);

            if (!$exists) {
                json_response([
                    'error' => true,
                    'message' => 'Not found',
                    'detail' => 'request_type not found',
                ], 404);
                return;
            }

            $body = read_json_body();

            $typeName = trim((string)($body['type_name'] ?? ''));
            if ($typeName === '') {
                json_response([
                    'error' => true,
                    'message' => 'Validation failed',
                    'detail' => 'type_name is required',
                ], 422);
                return;
            }

            $payload = [
                'type_name' => $typeName,
                'discription' => isset($body['discription']) ? (string)$body['discription'] : null,
                'url_link' => isset($body['url_link']) ? (string)$body['url_link'] : null,
            ];

            $ok = $model->update($id, $payload);
            $row = $model->findById($id);

            json_response([
                'error' => false,
                'message' => $ok ? 'Updated' : 'No changes',
                'data' => $row,
            ]);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to update request type',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /request-types/{id}
     */
    public function delete(int $id): void
    {
        try {
            // ถ้าต้องการบังคับ login/admin ค่อยเปิด
            // auth_require();

            $model = new RequestTypeModel($this->pdo);

            $exists = $model->findById($id);
            if (!$exists) {
                json_response([
                    'error' => true,
                    'message' => 'Not found',
                    'detail' => 'request_type not found',
                ], 404);
                return;
            }

            $ok = $model->delete($id);

            json_response([
                'error' => false,
                'message' => $ok ? 'Deleted' : 'Delete failed',
            ]);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to delete request type',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }
}

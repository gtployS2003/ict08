<?php
// backend/controllers/request_sub_types.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../models/RequestSubTypeModel.php';

class RequestSubTypesController
{
        /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * GET /request-sub-types?q=&subtype_of=&page=&limit=
     */
    public function index(): void
    {
        try {
            $q = trim((string)($_GET['q'] ?? ''));
            $subtypeOf = (int)($_GET['subtype_of'] ?? 0);
            $page = (int)($_GET['page'] ?? 1);
            $limit = (int)($_GET['limit'] ?? 50);

            $model = new RequestSubTypeModel($this->pdo);

            $items = $model->list($q, $subtypeOf, $page, $limit);
            $total = $model->count($q, $subtypeOf);

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
                'message' => 'Failed to get request sub types',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /request-sub-types/{id}
     */
    public function show(int $id): void
    {
        try {
            $model = new RequestSubTypeModel($this->pdo);
            $row = $model->findById($id);

            if (!$row) {
                json_response([
                    'error' => true,
                    'message' => 'Request sub type not found',
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
                'message' => 'Failed to get request sub type',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /request-sub-types
     * body: {name, discription, subtype_of }
     */
    public function create(): void
    {
        try {
            $body = read_json_body();

            $name = trim((string)($body['name'] ?? ''));
            $discription = trim((string)($body['discription'] ?? ''));
            $subtypeOf = (int)($body['subtype_of'] ?? 0);

            // validate
            $errors = [];
            if ($name === '') $errors['name'] = 'name is required';
            if ($subtypeOf <= 0) $errors['subtype_of'] = 'subtype_of is required';

            if (!empty($errors)) {
                json_response([
                    'error' => true,
                    'message' => 'Validation failed',
                    'errors' => $errors,
                ], 422);
                return;
            }

            $model = new RequestSubTypeModel($this->pdo);
            $newId = $model->create([
                'name' => $name,
                'discription' => $discription,
                'subtype_of' => $subtypeOf,
            ]);

            json_response([
                'error' => false,
                'message' => 'Created',
                'data' => $model->findById($newId),
            ], 201);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to create request sub type',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PUT /request-sub-types/{id}
     * body: {name, discription, subtype_of }
     */
    public function update(int $id): void
    {
        try {
            $body = read_json_body();

            $name = trim((string)($body['name'] ?? ''));
            $discription = trim((string)($body['discription'] ?? ''));
            $subtypeOf = (int)($body['subtype_of'] ?? 0);

            // validate
            $errors = [];
            if ($name === '') $errors['name'] = 'name is required';
            if ($subtypeOf <= 0) $errors['subtype_of'] = 'subtype_of is required';

            if (!empty($errors)) {
                json_response([
                    'error' => true,
                    'message' => 'Validation failed',
                    'errors' => $errors,
                ], 422);
                return;
            }

            $model = new RequestSubTypeModel($this->pdo);

            // check exists
            $exists = $model->findById($id);
            if (!$exists) {
                json_response([
                    'error' => true,
                    'message' => 'Request sub type not found',
                ], 404);
                return;
            }

            $ok = $model->update($id, [
                'name' => $name,
                'discription' => $discription,
                'subtype_of' => $subtypeOf,
            ]);

            json_response([
                'error' => false,
                'message' => $ok ? 'Updated' : 'No changes',
                'data' => $model->findById($id),
            ]);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to update request sub type',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /request-sub-types/{id}
     */
    public function delete(int $id): void
    {
        try {
            $model = new RequestSubTypeModel($this->pdo);

            $exists = $model->findById($id);
            if (!$exists) {
                json_response([
                    'error' => true,
                    'message' => 'Request sub type not found',
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
                'message' => 'Failed to delete request sub type',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }
}

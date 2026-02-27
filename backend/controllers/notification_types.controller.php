<?php
// backend/controllers/notification_types.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';

require_once __DIR__ . '/../models/NotificationTypeModel.php';

final class NotificationTypesController
{
        /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * GET /notification-types?q=&page=&limit=
     */
    public function index(): void
    {
        try {
            $q = trim((string)($_GET['q'] ?? ''));
            $page = (int)($_GET['page'] ?? 1);
            $limit = (int)($_GET['limit'] ?? 50);

            $model = new NotificationTypeModel($this->pdo);

            $items = $model->list($q, $page, $limit);
            $total = $model->count($q);

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
                'message' => 'Failed to get notification types',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /notification-types/{id}
     */
    public function show(int $id): void
    {
        try {
            if ($id <= 0) {
                json_response([
                    'error' => true,
                    'message' => 'Invalid id',
                ], 400);
                return;
            }

            $model = new NotificationTypeModel($this->pdo);
            $row = $model->findById($id);

            if (!$row) {
                json_response([
                    'error' => true,
                    'message' => 'Notification type not found',
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
                'message' => 'Failed to get notification type',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /notification-types
     * body: { notification_type, meaning }
     */
    public function create(): void
    {
        try {
            $input = read_json_body();

            $notificationType = trim((string)($input['notification_type'] ?? ''));
            $meaning = trim((string)($input['meaning'] ?? ''));

            // validate
            if ($notificationType === '') {
                json_response([
                    'error' => true,
                    'message' => 'notification_type is required',
                ], 400);
                return;
            }
            if (mb_strlen($notificationType) > 255) {
                json_response([
                    'error' => true,
                    'message' => 'notification_type must be <= 255 characters',
                ], 400);
                return;
            }

            $model = new NotificationTypeModel($this->pdo);

            // duplicate check
            if ($model->existsByName($notificationType)) {
                json_response([
                    'error' => true,
                    'message' => 'notification_type already exists',
                ], 409);
                return;
            }

            $newId = $model->create($notificationType, $meaning);
            $row = $model->findById($newId);

            json_response([
                'error' => false,
                'message' => 'Created',
                'data' => $row,
            ], 201);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to create notification type',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PUT/PATCH /notification-types/{id}
     * body: { notification_type, meaning }
     */
    public function update(int $id): void
    {
        try {
            if ($id <= 0) {
                json_response([
                    'error' => true,
                    'message' => 'Invalid id',
                ], 400);
                return;
            }

            $input = read_json_body();

            $notificationType = trim((string)($input['notification_type'] ?? ''));
            $meaning = trim((string)($input['meaning'] ?? ''));

            if ($notificationType === '') {
                json_response([
                    'error' => true,
                    'message' => 'notification_type is required',
                ], 400);
                return;
            }
            if (mb_strlen($notificationType) > 255) {
                json_response([
                    'error' => true,
                    'message' => 'notification_type must be <= 255 characters',
                ], 400);
                return;
            }

            $model = new NotificationTypeModel($this->pdo);

            $existing = $model->findById($id);
            if (!$existing) {
                json_response([
                    'error' => true,
                    'message' => 'Notification type not found',
                ], 404);
                return;
            }

            // duplicate check (exclude current id)
            if ($model->existsByName($notificationType, $id)) {
                json_response([
                    'error' => true,
                    'message' => 'notification_type already exists',
                ], 409);
                return;
            }

            $ok = $model->update($id, $notificationType, $meaning);
            $row = $model->findById($id);

            json_response([
                'error' => false,
                'message' => $ok ? 'Updated' : 'No changes',
                'data' => $row,
            ]);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to update notification type',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /notification-types/{id}
     */
    public function delete(int $id): void
    {
        try {
            if ($id <= 0) {
                json_response([
                    'error' => true,
                    'message' => 'Invalid id',
                ], 400);
                return;
            }

            $model = new NotificationTypeModel($this->pdo);

            $existing = $model->findById($id);
            if (!$existing) {
                json_response([
                    'error' => true,
                    'message' => 'Notification type not found',
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
                'message' => 'Failed to delete notification type',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }
}

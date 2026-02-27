<?php
// backend/controllers/urgency.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../models/UrgencyModel.php';

final class UrgencyController
{
        /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * GET /urgency?q=&page=&limit=
     */
    public function index(): void
    {
        try {
            $q = trim((string)($_GET['q'] ?? ''));
            $page = (int)($_GET['page'] ?? 1);
            $limit = (int)($_GET['limit'] ?? 200);

            $m = new UrgencyModel($this->pdo);
            $items = $m->list($q, $page, $limit);
            $total = $m->count($q);

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
                'message' => 'Failed to get urgency list',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /urgency/{id}
     */
    public function show(int $id): void
    {
        try {
            $m = new UrgencyModel($this->pdo);
            $row = $m->findById($id);
            if (!$row) {
                json_response(['error' => true, 'message' => 'Not found'], 404);
                return;
            }
            json_response(['error' => false, 'data' => $row]);
        } catch (Throwable $e) {
            json_response(['error' => true, 'message' => 'Failed to get urgency', 'detail' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /urgency
     * body: { urgency_code, urgency_title, urgency_level }
     */
    public function create(): void
    {
        try {
            $body = read_json_body();

            $code = trim((string)($body['urgency_code'] ?? ''));
            $title = trim((string)($body['urgency_title'] ?? ''));
            $levelRaw = $body['urgency_level'] ?? null;

            if ($code === '' || $title === '') {
                json_response(['error' => true, 'message' => 'Missing required fields'], 422);
            }

            if (!is_numeric($levelRaw)) {
                json_response(['error' => true, 'message' => 'urgency_level must be an integer'], 422);
            }
            $level = (int)$levelRaw;
            if ($level < 0) $level = 0;

            $m = new UrgencyModel($this->pdo);

            if ($m->existsByCode($code, null)) {
                json_response(['error' => true, 'message' => 'Duplicate urgency_code'], 409);
            }

            $id = $m->create([
                'urgency_code' => $code,
                'urgency_title' => $title,
                'urgency_level' => $level,
            ]);

            json_response(['error' => false, 'data' => ['urgency_id' => $id]], 201);
        } catch (Throwable $e) {
            json_response(['error' => true, 'message' => 'Failed to create urgency', 'detail' => $e->getMessage()], 500);
        }
    }

    /**
     * PUT /urgency/{id}
     * body: { urgency_code, urgency_title, urgency_level }
     */
    public function update(int $id): void
    {
        try {
            $body = read_json_body();

            $code = trim((string)($body['urgency_code'] ?? ''));
            $title = trim((string)($body['urgency_title'] ?? ''));
            $levelRaw = $body['urgency_level'] ?? null;

            if ($code === '' || $title === '') {
                json_response(['error' => true, 'message' => 'Missing required fields'], 422);
            }

            if (!is_numeric($levelRaw)) {
                json_response(['error' => true, 'message' => 'urgency_level must be an integer'], 422);
            }
            $level = (int)$levelRaw;
            if ($level < 0) $level = 0;

            $m = new UrgencyModel($this->pdo);
            if (!$m->findById($id)) {
                json_response(['error' => true, 'message' => 'Not found'], 404);
                return;
            }

            if ($m->existsByCode($code, $id)) {
                json_response(['error' => true, 'message' => 'Duplicate urgency_code'], 409);
            }

            $ok = $m->update($id, [
                'urgency_code' => $code,
                'urgency_title' => $title,
                'urgency_level' => $level,
            ]);

            json_response(['error' => !$ok, 'message' => $ok ? 'Updated' : 'Update failed']);
        } catch (Throwable $e) {
            json_response(['error' => true, 'message' => 'Failed to update urgency', 'detail' => $e->getMessage()], 500);
        }
    }

    /**
     * DELETE /urgency/{id}
     */
    public function delete(int $id): void
    {
        try {
            $m = new UrgencyModel($this->pdo);
            $ok = $m->delete($id);
            json_response(['error' => !$ok, 'message' => $ok ? 'Deleted' : 'Delete failed']);
        } catch (Throwable $e) {
            // foreign key constraint etc.
            json_response(['error' => true, 'message' => 'Failed to delete urgency', 'detail' => $e->getMessage()], 500);
        }
    }
}

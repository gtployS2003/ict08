<?php
// backend/controllers/channels.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../models/ChannelModel.php';

final class ChannelsController
{
    /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * GET /channels?q=&page=&limit=
     */
    public function index(): void
    {
        try {
            $q = trim((string)($_GET['q'] ?? ''));
            $page = (int)($_GET['page'] ?? 1);
            $limit = (int)($_GET['limit'] ?? 50);

            $model = new ChannelModel($this->pdo);

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
                'message' => 'Failed to get channels',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /channels/{id}
     */
    public function show(int $id): void
    {
        try {
            $model = new ChannelModel($this->pdo);
            $item = $model->getById($id);

            if (!$item) {
                json_response([
                    'error' => true,
                    'message' => 'Channel not found',
                ], 404);
                return;
            }

            json_response([
                'error' => false,
                'data' => $item,
            ]);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to get channel',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /channels  (optional)
     */
    public function create(): void
    {
        try {
            $body = json_decode((string)file_get_contents('php://input'), true);
            if (!is_array($body)) {
                $body = $_POST; // เผื่อยิงแบบ form-data
            }

            $channel = trim((string)($body['channel'] ?? ''));

            $model = new ChannelModel($this->pdo);
            $newId = $model->create($channel);

            json_response([
                'error' => false,
                'message' => 'Channel created',
                'data' => [
                    'channel_id' => $newId,
                ],
            ], 201);
        } catch (InvalidArgumentException $e) {
            json_response([
                'error' => true,
                'message' => $e->getMessage(),
            ], 400);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to create channel',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PUT /channels/{id} (optional)
     */
    public function update(int $id): void
    {
        try {
            $body = json_decode((string)file_get_contents('php://input'), true);
            if (!is_array($body)) {
                parse_str((string)file_get_contents('php://input'), $body);
            }

            $channel = trim((string)($body['channel'] ?? ''));

            $model = new ChannelModel($this->pdo);
            $ok = $model->update($id, $channel);

            if (!$ok) {
                json_response([
                    'error' => true,
                    'message' => 'Channel not found or no changes',
                ], 404);
                return;
            }

            json_response([
                'error' => false,
                'message' => 'Channel updated',
            ]);
        } catch (InvalidArgumentException $e) {
            json_response([
                'error' => true,
                'message' => $e->getMessage(),
            ], 400);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to update channel',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /channels/{id} (optional)
     */
    public function delete(int $id): void
    {
        try {
            $model = new ChannelModel($this->pdo);
            $ok = $model->delete($id);

            if (!$ok) {
                json_response([
                    'error' => true,
                    'message' => 'Channel not found',
                ], 404);
                return;
            }

            json_response([
                'error' => false,
                'message' => 'Channel deleted',
            ]);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to delete channel',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }
}

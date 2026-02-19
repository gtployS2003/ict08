<?php
// backend/controllers/contact_info.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../models/ContactInfoModel.php';

final class ContactInfoController
{
    public function __construct(private PDO $pdo)
    {
    }

    /* =========================
       GET /api/contact-info?q=&page=&limit=
       ========================= */
    public function index(): void
    {
        try {
            $q = isset($_GET['q']) ? trim((string)$_GET['q']) : '';
            $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;

            $model = new ContactInfoModel($this->pdo);
            $result = $model->list($q, $page, $limit);

            $this->json(200, [
                'error' => false,
                'data' => $result['items'],
                'meta' => [
                    'total' => $result['total'],
                    'page' => $result['page'],
                    'limit' => $result['limit'],
                ],
            ]);
        } catch (Throwable $e) {
            $this->json(500, [
                'error' => true,
                'message' => 'Failed to get contact info list',
                'detail' => $e->getMessage(),
            ]);
        }
    }

    /* =========================
       GET /api/contact-info/{id}
       ========================= */
    public function show(int $id): void
    {
        try {
            $model = new ContactInfoModel($this->pdo);
            $row = $model->get($id);

            if (!$row) {
                $this->json(404, [
                    'error' => true,
                    'message' => 'Contact info not found',
                ]);
                return;
            }

            $this->json(200, [
                'error' => false,
                'data' => $row,
            ]);
        } catch (Throwable $e) {
            $this->json(500, [
                'error' => true,
                'message' => 'Failed to get contact info',
                'detail' => $e->getMessage(),
            ]);
        }
    }

    /* =========================
       POST /api/contact-info
       body: JSON (recommended) or form-data
       ========================= */
    public function store(): void
    {
        try {
            $payload = $this->getPayload();

            $model = new ContactInfoModel($this->pdo);
            $newId = $model->create($payload);

            $row = $model->get($newId);

            $this->json(201, [
                'error' => false,
                'message' => 'Created',
                'data' => $row,
            ]);
        } catch (InvalidArgumentException $e) {
            $this->json(400, [
                'error' => true,
                'message' => $e->getMessage(),
            ]);
        } catch (RuntimeException $e) {
            // เช่น ซ้ำ organization_id แล้ว model throw
            $this->json(409, [
                'error' => true,
                'message' => $e->getMessage(),
            ]);
        } catch (Throwable $e) {
            $this->json(500, [
                'error' => true,
                'message' => 'Failed to create contact info',
                'detail' => $e->getMessage(),
            ]);
        }
    }

    /* =========================
       PUT /api/contact-info/{id}
       body: JSON (recommended)
       ========================= */
    public function update(int $id): void
    {
        try {
            $payload = $this->getPayload();

            $model = new ContactInfoModel($this->pdo);

            // ถ้าไม่มี record -> 404
            $existing = $model->get($id);
            if (!$existing) {
                $this->json(404, [
                    'error' => true,
                    'message' => 'Contact info not found',
                ]);
                return;
            }

            $ok = $model->update($id, $payload);
            $row = $model->get($id);

            $this->json(200, [
                'error' => false,
                'message' => $ok ? 'Updated' : 'No changes',
                'data' => $row,
            ]);
        } catch (InvalidArgumentException $e) {
            $this->json(400, [
                'error' => true,
                'message' => $e->getMessage(),
            ]);
        } catch (Throwable $e) {
            $this->json(500, [
                'error' => true,
                'message' => 'Failed to update contact info',
                'detail' => $e->getMessage(),
            ]);
        }
    }

    /* =========================
       DELETE /api/contact-info/{id}
       ========================= */
    public function destroy(int $id): void
    {
        try {
            $model = new ContactInfoModel($this->pdo);

            // ถ้าไม่มี record -> 404
            $existing = $model->get($id);
            if (!$existing) {
                $this->json(404, [
                    'error' => true,
                    'message' => 'Contact info not found',
                ]);
                return;
            }

            $ok = $model->delete($id);

            $this->json(200, [
                'error' => false,
                'message' => $ok ? 'Deleted' : 'Delete failed',
            ]);
        } catch (Throwable $e) {
            $this->json(500, [
                'error' => true,
                'message' => 'Failed to delete contact info',
                'detail' => $e->getMessage(),
            ]);
        }
    }

    /* =========================
       Helpers
       ========================= */

    /**
     * รองรับ JSON body หรือ x-www-form-urlencoded / multipart
     * @return array<string,mixed>
     */
    private function getPayload(): array
    {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
        $contentType = strtolower((string)$contentType);

        // JSON
        if (str_contains($contentType, 'application/json')) {
            $raw = file_get_contents('php://input');
            $data = json_decode((string)$raw, true);
            if (!is_array($data)) $data = [];
            return $data;
        }

        // form-data / urlencoded
        if (!empty($_POST)) {
            return $_POST;
        }

        // fallback: try parse input as query string (PUT บางทีส่งมาแบบนี้)
        $raw = file_get_contents('php://input');
        $data = [];
        if (is_string($raw) && $raw !== '') {
            parse_str($raw, $data);
        }
        return is_array($data) ? $data : [];
    }

    private function json(int $status, array $payload): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}

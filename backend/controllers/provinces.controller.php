<?php
// backend/controllers/provinces.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../models/ProvinceModel.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';

class ProvincesController
{
    private ProvinceModel $model;

    public function __construct()
    {
        $this->model = new ProvinceModel();
    }

    /* =========================
       Public handlers (routes call these)
    ========================= */

    // GET /provinces?q=&page=&limit=
    public function list(): void
    {
        try {
            $q     = isset($_GET['q']) ? (string)$_GET['q'] : null;
            $page  = isset($_GET['page']) ? (int)$_GET['page'] : 1;
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;

            $result = $this->model->list($q, $page, $limit);

            $this->ok('success', $result);
        } catch (Throwable $e) {
            $this->fail($e->getMessage(), 500);
        }
    }

    // POST /provinces
    public function create(): void
    {
        try {
            $body = $this->getBody();

            $nameEN = isset($body['nameEN']) ? trim((string)$body['nameEN']) : '';
            $nameTH = isset($body['nameTH']) ? trim((string)$body['nameTH']) : '';

            if ($nameEN === '' || $nameTH === '') {
                $this->fail('nameEN and nameTH are required', 422);
                return;
            }

            if ($this->model->existsByName($nameEN, $nameTH, null)) {
                $this->fail('Duplicate province name (nameEN or nameTH)', 409);
                return;
            }

            $created = $this->model->create($nameEN, $nameTH);
            $this->ok('created', $created, 201);
        } catch (Throwable $e) {
            $this->fail($e->getMessage(), 500);
        }
    }

    // PUT /provinces/{id}  OR  PUT /provinces?id=1
    public function update(int $id = 0): void
    {
        try {
            $id = $this->resolveId($id);
            if ($id <= 0) {
                $this->fail('province_id is required', 422);
                return;
            }

            $body = $this->getBody();

            $nameEN = isset($body['nameEN']) ? trim((string)$body['nameEN']) : '';
            $nameTH = isset($body['nameTH']) ? trim((string)$body['nameTH']) : '';

            if ($nameEN === '' || $nameTH === '') {
                $this->fail('nameEN and nameTH are required', 422);
                return;
            }

            if ($this->model->existsByName($nameEN, $nameTH, null)) {
                $this->fail('Duplicate province name (nameEN or nameTH)', 409);
                return;
            }

            $updated = $this->model->update($id, $nameEN, $nameTH);
            $this->ok('updated', $updated);
        } catch (Throwable $e) {
            // ProvinceModel->getById อาจ throw "Province not found"
            if (stripos($e->getMessage(), 'not found') !== false) {
                $this->fail('Province not found', 404);
                return;
            }
            $this->fail($e->getMessage(), 500);
        }
    }

    // DELETE /provinces/{id} OR DELETE /provinces?id=1
    public function delete(int $id = 0): void
    {
        try {
            $id = $this->resolveId($id);
            if ($id <= 0) {
                $this->fail('province_id is required', 422);
                return;
            }

            $ok = $this->model->delete($id);
            if (!$ok) {
                $this->fail('Province not found', 404);
                return;
            }

            $this->ok('deleted', ['province_id' => $id]);
        } catch (Throwable $e) {
            $this->fail($e->getMessage(), 500);
        }
    }

    /* =========================
       Internal helpers
    ========================= */

    private function resolveId(int $idFromRoute): int
    {
        if ($idFromRoute > 0) return $idFromRoute;

        if (isset($_GET['id'])) return (int)$_GET['id'];
        if (isset($_GET['province_id'])) return (int)$_GET['province_id'];

        $body = $this->getBody();
        if (isset($body['id'])) return (int)$body['id'];
        if (isset($body['province_id'])) return (int)$body['province_id'];

        return 0;
    }

    /**
     * รองรับทั้ง JSON และ form-data
     */
    private function getBody(): array
    {
        // ถ้าเป็น POST form ปกติ
        if (!empty($_POST)) return $_POST;

        $raw = file_get_contents('php://input');
        if (!$raw) return [];

        $json = json_decode($raw, true);
        if (is_array($json)) return $json;

        // เผื่อส่งแบบ x-www-form-urlencoded ใน PUT/DELETE
        parse_str($raw, $data);
        return is_array($data) ? $data : [];
    }

    /**
     * ส่ง response สำเร็จ (พยายามใช้ helper เดิม ถ้าไม่มีใช้ fallback)
     */
    private function ok(string $message, $data = null, int $code = 200): void
    {
        $this->send_json([
            'success' => true,
            'message' => $message,
            'data'    => $data,
        ], $code);
    }

    private function fail(string $message, int $code = 400): void
    {
        $this->send_json([
            'success' => false,
            'message' => $message,
        ], $code);
    }

    private function send_json(array $payload, int $code): void
    {
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    }
}

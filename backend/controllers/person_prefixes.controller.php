<?php
// backend/controllers/person_prefixes.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../models/PersonPrefixModel.php';

class PersonPrefixesController
{
    /**
     * Summary of model
     * @var PersonPrefixModel
     */
    private $model;

    /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)

    {
        $this->pdo = $pdo;
        $this->model = new PersonPrefixModel($pdo);
    }

    // GET /person-prefixes?q=&page=&limit=
    public function list(): void
    {
        try {
            $q = isset($_GET['q']) ? (string)$_GET['q'] : '';
            $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
            $limit = isset($_GET['limit']) ? max(1, (int)$_GET['limit']) : 50;

            $data = $this->model->list($q, $page, $limit);
            ok($data, 'success', 200);
        } catch (Throwable $e) {
            fail($e->getMessage(), 500);
        }
    }

    // POST /person-prefixes  body: { prefix_en, prefix_th }
    public function create(): void
    {
        try {
            $body = $this->getJsonBody();

            $prefix_en = trim((string)($body['prefix_en'] ?? ''));
            $prefix_th = trim((string)($body['prefix_th'] ?? ''));

            if ($prefix_en === '' || $prefix_th === '') {
                fail('กรุณากรอก prefix_en และ prefix_th', 422);
                return;
            }

            if ($this->model->existsByName($prefix_en, $prefix_th, null)) {
                fail('มีคำนำหน้าซ้ำอยู่แล้ว (prefix_th หรือ prefix_en)', 409);
                return;
            }

            $row = $this->model->create($prefix_en, $prefix_th);
            ok($row, 'created', 201);
        } catch (Throwable $e) {
            fail($e->getMessage(), 500);
        }
    }

    // PUT /person-prefixes/{id}  (หรือ PUT /person-prefixes?id=1)  body: { prefix_en, prefix_th }
    public function update(int $id): void
    {
        try {
            if ($id <= 0) {
                $id = $this->resolveIdFromQueryOrBody();
            }
            if ($id <= 0) {
                fail('Missing id', 400);
                return;
            }

            $body = $this->getJsonBody();
            $prefix_en = trim((string)($body['prefix_en'] ?? ''));
            $prefix_th = trim((string)($body['prefix_th'] ?? ''));

            if ($prefix_en === '' || $prefix_th === '') {
                fail('กรุณากรอก prefix_en และ prefix_th', 422);
                return;
            }

            if ($this->model->existsByName($prefix_en, $prefix_th, $id)) {
                fail('มีคำนำหน้าซ้ำอยู่แล้ว (prefix_th หรือ prefix_en)', 409);
                return;
            }

            $row = $this->model->update($id, $prefix_en, $prefix_th);
            ok($row, 'updated', 200);
        } catch (Throwable $e) {
            if (stripos($e->getMessage(), 'not found') !== false) {
                fail($e->getMessage(), 404);
                return;
            }
            fail($e->getMessage(), 500);
        }
    }

    // DELETE /person-prefixes/{id} (หรือ DELETE /person-prefixes?id=1)
    public function delete(int $id): void
    {
        try {
            if ($id <= 0) {
                $id = $this->resolveIdFromQueryOrBody();
            }
            if ($id <= 0) {
                fail('Missing id', 400);
                return;
            }

            $okDel = $this->model->delete($id);
            if (!$okDel) {
                fail('Person prefix not found', 404);
                return;
            }

            ok(['person_prefix_id' => $id], 'deleted', 200);
        } catch (Throwable $e) {
            fail($e->getMessage(), 500);
        }
    }

    /* =========================
       Helpers
    ========================= */
    private function getJsonBody(): array
    {
        // รองรับ form-data (POST ปกติ)
        if (!empty($_POST)) return $_POST;

        $raw = file_get_contents('php://input') ?: '';
        if ($raw === '') return [];

        $json = json_decode($raw, true);
        if (is_array($json)) return $json;

        // เผื่อส่ง x-www-form-urlencoded ใน PUT/DELETE
        parse_str($raw, $data);
        return is_array($data) ? $data : [];
    }

    private function resolveIdFromQueryOrBody(): int
    {
        if (isset($_GET['id']) && ctype_digit((string)$_GET['id'])) {
            return (int)$_GET['id'];
        }
        if (isset($_GET['person_prefix_id']) && ctype_digit((string)$_GET['person_prefix_id'])) {
            return (int)$_GET['person_prefix_id'];
        }

        $body = $this->getJsonBody();
        $candidate = $body['id'] ?? $body['person_prefix_id'] ?? null;

        if (is_int($candidate)) return $candidate;
        if (is_string($candidate) && ctype_digit($candidate)) return (int)$candidate;

        return 0;
    }
}

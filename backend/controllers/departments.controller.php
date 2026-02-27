<?php
// backend/controllers/departments.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../models/DepartmentModel.php';

class DepartmentsController
{
    /** @var DepartmentModel */
    private $model;

    /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
        $this->model = new DepartmentModel($pdo);
    }

    /**
     * GET /departments?q=&page=&limit=
     */
    public function list(): void
    {
        try {
            $q = isset($_GET['q']) ? (string) $_GET['q'] : '';
            $page = isset($_GET['page']) ? max(1, (int) $_GET['page']) : 1;
            $limit = isset($_GET['limit']) ? max(1, (int) $_GET['limit']) : 50;

            $organization_id = null;
            if (isset($_GET['organization_id']) && ctype_digit((string) $_GET['organization_id'])) {
                $organization_id = (int) $_GET['organization_id'];
            }
            $data = $this->model->list($q, $page, $limit, $organization_id);
            ok($data, 'success', 200);
        } catch (Throwable $e) {
            fail($e->getMessage(), 500);
        }
    }

        /**
     * GET /departments/dropdown?organization_id=
     * return: [ {department_id, department_title, ...}, ... ]
     */
    public function dropdown(): void
    {
        try {
            $organization_id = 0;
            if (isset($_GET['organization_id']) && ctype_digit((string) $_GET['organization_id'])) {
                $organization_id = (int) $_GET['organization_id'];
            }

            if ($organization_id <= 0) {
                // dropdown ต้องรู้ org ก่อน ไม่งั้นคืน list ว่าง (หรือจะ fail 422 ก็ได้)
                ok([], 'success', 200);
                return;
                // หรือถ้าอยาก strict:
                // fail('กรุณาระบุ organization_id ให้ถูกต้อง', 422); return;
            }

            $items = $this->model->listForDropdown($organization_id);
            ok($items, 'success', 200);
        } catch (Throwable $e) {
            fail($e->getMessage(), 500);
        }
    }


    /**
     * POST /departments
     * body: { department_code, department_title }
     */
    public function create(): void
    {
        try {
            $body = $this->getJsonBody();

            $department_code = trim((string) ($body['department_code'] ?? ''));
            $department_title = trim((string) ($body['department_title'] ?? ''));

            $organization_id = $body['organization_id'] ?? null;

            if ($department_code === '' || $department_title === '') {
                fail('กรุณากรอก department_code และ department_title', 422);
                return;
            }

            if (!is_int($organization_id)) {
                if (is_string($organization_id) && ctype_digit($organization_id)) {
                    $organization_id = (int) $organization_id;
                } else {
                    fail("กรุณาระบุ organization_id ให้ถูกต้อง", 422);
                    $organization_id = null;
                }
            }

            if ($organization_id <= 0) {
                fail('กรุณากรอก organization_id ให้ถูกต้อง', 422);
                return;
            }

            if ($this->model->existsByCodeOrTitle($department_code, $department_title, $organization_id, null)) {
                fail('มีฝ่ายซ้ำอยู่แล้ว (department_code หรือ department_title)', 409);
                return;
            }

            $row = $this->model->create($department_code, $department_title, $organization_id);
            ok($row, 'created', 201);
        } catch (Throwable $e) {
            fail($e->getMessage(), 500);
        }
    }

    /**
     * PUT /departments/{id}
     * หรือ PUT /departments?id=1
     * body: { department_code, department_title }
     */
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

            $department_code = trim((string) ($body['department_code'] ?? ''));
            $department_title = trim((string) ($body['department_title'] ?? ''));
            $organization_id = $body['organization_id'] ?? null;

            if ($department_code === '' || $department_title === '') {
                fail('กรุณากรอก department_code และ department_title', 422);
                return;
            }

            if (!is_int($organization_id)) {
                if (is_string($organization_id) && ctype_digit($organization_id)) {
                    $organization_id = (int) $organization_id;
                } else {
                    fail("กรุณาระบุ organization_id ให้ถูกต้อง", 422);
                    $organization_id = null;
                }
            }

            if ($organization_id <= 0) {
                fail('กรุณากรอก organization_id ให้ถูกต้อง', 422);
                return;
            }

            if ($this->model->existsByCodeOrTitle($department_code, $department_title, $organization_id, $id)) {
                fail('มีฝ่ายซ้ำอยู่แล้ว (department_code หรือ department_title)', 409);
                return;
            }

            $row = $this->model->update($id, $department_code, $department_title, $organization_id);
            ok($row, 'updated', 200);
        } catch (Throwable $e) {
            if (stripos($e->getMessage(), 'not found') !== false) {
                fail($e->getMessage(), 404);
                return;
            }
            fail($e->getMessage(), 500);
        }
    }

    /**
     * DELETE /departments/{id}
     * หรือ DELETE /departments?id=1
     */
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
                fail('Department not found', 404);
                return;
            }

            ok(['department_id' => $id], 'deleted', 200);
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
        if (!empty($_POST))
            return $_POST;

        $raw = file_get_contents('php://input') ?: '';
        if ($raw === '')
            return [];

        $json = json_decode($raw, true);
        if (is_array($json))
            return $json;

        // เผื่อส่ง x-www-form-urlencoded ใน PUT/DELETE
        parse_str($raw, $data);
        return is_array($data) ? $data : [];
    }

    private function resolveIdFromQueryOrBody(): int
    {
        if (isset($_GET['id']) && ctype_digit((string) $_GET['id'])) {
            return (int) $_GET['id'];
        }
        if (isset($_GET['department_id']) && ctype_digit((string) $_GET['department_id'])) {
            return (int) $_GET['department_id'];
        }

        $body = $this->getJsonBody();
        $candidate = $body['id'] ?? $body['department_id'] ?? null;

        if (is_int($candidate))
            return $candidate;
        if (is_string($candidate) && ctype_digit($candidate))
            return (int) $candidate;

        return 0;
    }
}

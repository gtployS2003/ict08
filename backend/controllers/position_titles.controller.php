<?php
// backend/controllers/position_titles.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../models/PositionTitleModel.php';

class PositionTitlesController
{
    private PositionTitleModel $model;

    public function __construct(?PDO $pdo = null)
    {
        $this->model = new PositionTitleModel($pdo);
    }

    /**
     * GET /position-titles?q=&page=&limit=&organization_id=&department_id=
     */
    public function list(): void
    {
        try {
            $q = isset($_GET['q']) ? (string)$_GET['q'] : '';
            $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
            $limit = isset($_GET['limit']) ? max(1, (int)$_GET['limit']) : 50;

            $organization_id = null;
            if (isset($_GET['organization_id']) && ctype_digit((string)$_GET['organization_id'])) {
                $organization_id = (int)$_GET['organization_id'];
            }

            $department_id = null;
            if (isset($_GET['department_id']) && ctype_digit((string)$_GET['department_id'])) {
                $department_id = (int)$_GET['department_id'];
            }

            $data = $this->model->list($q, $page, $limit, $organization_id, $department_id);
            ok($data, 'success', 200);
        } catch (Throwable $e) {
            fail($e->getMessage(), 500);
        }
    }

    /**
     * POST /position-titles
     * body: { position_code, position_title, organization_id, department_id|null }
     */
    public function create(): void
    {
        try {
            $body = $this->getJsonBody();

            $position_code  = trim((string)($body['position_code'] ?? ''));
            $position_title = trim((string)($body['position_title'] ?? ''));

            if ($position_code === '' || $position_title === '') {
                fail('กรุณากรอก position_code และ position_title', 422);
                return;
            }

            $organization_id = $this->normalizeRequiredInt($body['organization_id'] ?? null);
            if ($organization_id === null || $organization_id <= 0) {
                fail('กรุณาระบุ organization_id ให้ถูกต้อง', 422);
                return;
            }

            $department_id = $this->normalizeOptionalInt($body['department_id'] ?? null);
            // อนุญาต null ได้ (ไม่สังกัดฝ่าย)
            if ($department_id !== null && $department_id <= 0) {
                fail('department_id ต้องมากกว่า 0 หรือเป็น null', 422);
                return;
            }

            if ($this->model->existsByCodeOrTitle($position_code, $position_title, $organization_id, $department_id, null)) {
                fail('มีตำแหน่งซ้ำอยู่แล้ว (position_code หรือ position_title)', 409);
                return;
            }

            $row = $this->model->create($position_code, $position_title, $organization_id, $department_id);
            ok($row, 'created', 201);
        } catch (Throwable $e) {
            fail($e->getMessage(), 500);
        }
    }

    /**
     * PUT /position-titles/{id}
     * body: { position_code, position_title, organization_id, department_id|null }
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

            $position_code  = trim((string)($body['position_code'] ?? ''));
            $position_title = trim((string)($body['position_title'] ?? ''));

            if ($position_code === '' || $position_title === '') {
                fail('กรุณากรอก position_code และ position_title', 422);
                return;
            }

            $organization_id = $this->normalizeRequiredInt($body['organization_id'] ?? null);
            if ($organization_id === null || $organization_id <= 0) {
                fail('กรุณาระบุ organization_id ให้ถูกต้อง', 422);
                return;
            }

            $department_id = $this->normalizeOptionalInt($body['department_id'] ?? null);
            // อนุญาต null ได้
            if ($department_id !== null && $department_id <= 0) {
                fail('กรุณาระบุ department_id ให้ถูกต้อง หรือเป็น null', 422);
                return;
            }

            if ($this->model->existsByCodeOrTitle($position_code, $position_title, $organization_id, $department_id, $id)) {
                fail('มีตำแหน่งซ้ำอยู่แล้ว (position_code หรือ position_title)', 409);
                return;
            }

            $row = $this->model->update($id, $position_code, $position_title, $organization_id, $department_id);
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
     * DELETE /position-titles/{id}
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
                fail('Position title not found', 404);
                return;
            }

            ok(['position_title_id' => $id], 'deleted', 200);
        } catch (Throwable $e) {
            fail($e->getMessage(), 500);
        }
    }

    /* =========================
       Helpers
    ========================= */

    private function getJsonBody(): array
    {
        if (!empty($_POST)) return $_POST;

        $raw = file_get_contents('php://input') ?: '';
        if ($raw === '') return [];

        $json = json_decode($raw, true);
        if (is_array($json)) return $json;

        parse_str($raw, $data);
        return is_array($data) ? $data : [];
    }

    private function resolveIdFromQueryOrBody(): int
    {
        if (isset($_GET['id']) && ctype_digit((string)$_GET['id'])) {
            return (int)$_GET['id'];
        }
        if (isset($_GET['position_title_id']) && ctype_digit((string)$_GET['position_title_id'])) {
            return (int)$_GET['position_title_id'];
        }

        $body = $this->getJsonBody();
        $candidate = $body['id'] ?? $body['position_title_id'] ?? null;

        if (is_int($candidate)) return $candidate;
        if (is_string($candidate) && ctype_digit($candidate)) return (int)$candidate;

        return 0;
    }

    private function normalizeOptionalInt(mixed $v): ?int
    {
        // null / "" / "null" => null
        if ($v === null) return null;

        if (is_string($v)) {
            $t = trim($v);
            if ($t === '' || strtolower($t) === 'null') return null;
            if (ctype_digit($t)) return (int)$t;
            return null;
        }

        if (is_int($v)) return $v;

        if (is_float($v) && (int)$v == $v) return (int)$v;

        return null;
    }

    private function normalizeRequiredInt(mixed $v): ?int
    {
        // required: ต้องเป็น int หรือ string เป็นตัวเลขเท่านั้น
        if ($v === null) return null;
        if (is_int($v)) return $v;
        if (is_string($v) && ctype_digit(trim($v))) return (int)trim($v);
        if (is_float($v) && (int)$v == $v) return (int)$v;
        return null;
    }
}

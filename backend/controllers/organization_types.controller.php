<?php
// backend/controllers/organization_types.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../models/OrganizationTypeModel.php';

class OrganizationTypesController
{
/** @var OrganizationTypeModel */
    private $model;

    /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo; // จะต้อง set PDO จากภายนอกก่อนใช้งานจริง
        $this->model = new OrganizationTypeModel();
    }

    /* =========================
       Public handlers (routes call these)
    ========================= */

    // GET /organization-types?q=&page=&limit=
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

    // POST /organization-types
    // body: { type_name, type_name_th }
    public function create(): void
    {
        try {
            $body = $this->getBody();

            $typeName   = isset($body['type_name']) ? trim((string)$body['type_name']) : '';
            $typeNameTh = isset($body['type_name_th']) ? trim((string)$body['type_name_th']) : '';

            if ($typeName === '' || $typeNameTh === '') {
                $this->fail('type_name and type_name_th are required', 422);
                return;
            }

            if ($this->model->existsByName($typeName, $typeNameTh, null)) {
                $this->fail('Duplicate organization type name (type_name or type_name_th)', 409);
                return;
            }

            $created = $this->model->create($typeName, $typeNameTh);
            $this->ok('created', $created, 201);
        } catch (Throwable $e) {
            $this->fail($e->getMessage(), 500);
        }
    }

    // PUT /organization-types/{id}  OR  PUT /organization-types?id=1
    // body: { type_name, type_name_th }
    public function update(int $id = 0): void
    {
        try {
            $id = $this->resolveId($id);
            if ($id <= 0) {
                $this->fail('organization_type_id is required', 422);
                return;
            }

            $body = $this->getBody();

            $typeName   = isset($body['type_name']) ? trim((string)$body['type_name']) : '';
            $typeNameTh = isset($body['type_name_th']) ? trim((string)$body['type_name_th']) : '';

            if ($typeName === '' || $typeNameTh === '') {
                $this->fail('type_name and type_name_th are required', 422);
                return;
            }

            if ($this->model->existsByName($typeName, $typeNameTh, $id)) {
                $this->fail('Duplicate organization type name (type_name or type_name_th)', 409);
                return;
            }

            $updated = $this->model->update($id, $typeName, $typeNameTh);
            $this->ok('updated', $updated);
        } catch (Throwable $e) {
            if (stripos($e->getMessage(), 'not found') !== false) {
                $this->fail('Organization type not found', 404);
                return;
            }
            $this->fail($e->getMessage(), 500);
        }
    }

    // DELETE /organization-types/{id} OR DELETE /organization-types?id=1
    public function delete(int $id = 0): void
    {
        try {
            $id = $this->resolveId($id);
            if ($id <= 0) {
                $this->fail('organization_type_id is required', 422);
                return;
            }

            $ok = $this->model->delete($id);
            if (!$ok) {
                $this->fail('Organization type not found', 404);
                return;
            }

            $this->ok('deleted', ['organization_type_id' => $id]);
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
        if (isset($_GET['organization_type_id'])) return (int)$_GET['organization_type_id'];

        $body = $this->getBody();
        if (isset($body['id'])) return (int)$body['id'];
        if (isset($body['organization_type_id'])) return (int)$body['organization_type_id'];

        return 0;
    }

    /**
     * รองรับทั้ง JSON และ form-data
     */
    private function getBody(): array
    {
        if (!empty($_POST)) return $_POST;

        $raw = file_get_contents('php://input');
        if (!$raw) return [];

        $json = json_decode($raw, true);
        if (is_array($json)) return $json;

        parse_str($raw, $data);
        return is_array($data) ? $data : [];
    }

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

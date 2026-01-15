<?php
// backend/controllers/organizations.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../models/OrganizationModel.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';

class OrganizationsController
{
    private OrganizationModel $model;

    public function __construct()
    {
        $this->model = new OrganizationModel();
    }

    /* =========================
       Public handlers (routes call these)
    ========================= */

    // GET /organizations?q=&province_id=&organization_type_id=&page=&limit=
    public function list(): void
    {
        try {
            $q = isset($_GET['q']) ? (string)$_GET['q'] : null;

            // รองรับทั้ง province_id และ provinceId (เผื่อ frontend ส่งต่างกัน)
            $provinceId = null;
            if (isset($_GET['province_id'])) $provinceId = (int) $_GET['province_id'];
            if (isset($_GET['provinceId'])) $provinceId = (int) $_GET['provinceId'];

            // รองรับทั้ง organization_type_id และ organizationTypeId
            $organizationTypeId = null;
            if (isset($_GET['organization_type_id'])) $organizationTypeId = (int) $_GET['organization_type_id'];
            if (isset($_GET['organizationTypeId'])) $organizationTypeId = (int) $_GET['organizationTypeId'];

            $page  = isset($_GET['page']) ? (int) $_GET['page'] : 1;
            $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 50;

            $result = $this->model->list($q, $provinceId, $organizationTypeId, $page, $limit);

            $this->ok('success', $result);
        } catch (Throwable $e) {
            $this->fail($e->getMessage(), 500);
        }
    }

    // POST /organizations
    public function create(): void
    {
        try {
            $body = $this->getBody();

            $code = isset($body['code']) ? trim((string)$body['code']) : '';
            $name = isset($body['name']) ? trim((string)$body['name']) : '';
            $location = isset($body['location']) ? trim((string)$body['location']) : '';

            $provinceId = isset($body['province_id']) ? (int)$body['province_id'] : 0;
            if ($provinceId <= 0 && isset($body['provinceId'])) $provinceId = (int)$body['provinceId'];

            $organizationTypeId = isset($body['organization_type_id']) ? (int)$body['organization_type_id'] : 0;
            if ($organizationTypeId <= 0 && isset($body['organizationTypeId'])) $organizationTypeId = (int)$body['organizationTypeId'];

            if ($code === '' || $name === '' || $location === '' || $provinceId <= 0 || $organizationTypeId <= 0) {
                $this->fail('code, name, location, province_id and organization_type_id are required', 422);
                return;
            }

            // code ต้องไม่ซ้ำ
            if ($this->model->existsByCode($code, null)) {
                $this->fail('Duplicate organization code', 409);
                return;
            }

            // optional: กันชื่อซ้ำในขอบเขต (จังหวัด+ประเภท)
            // ถ้าไม่ต้องการ rule นี้ ให้คอมเมนต์ทิ้งได้
            if ($this->model->existsByNameInScope($name, $provinceId, $organizationTypeId, null)) {
                $this->fail('Duplicate organization name in the same province and type', 409);
                return;
            }

            $created = $this->model->create($code, $name, $location, $provinceId, $organizationTypeId);
            $this->ok('created', $created, 201);
        } catch (Throwable $e) {
            $this->fail($e->getMessage(), 500);
        }
    }

    // PUT /organizations/{id}  OR  PUT /organizations?id=1
    public function update(int $id = 0): void
    {
        try {
            $id = $this->resolveId($id);
            if ($id <= 0) {
                $this->fail('organization_id is required', 422);
                return;
            }

            $body = $this->getBody();

            $code = isset($body['code']) ? trim((string)$body['code']) : '';
            $name = isset($body['name']) ? trim((string)$body['name']) : '';
            $location = isset($body['location']) ? trim((string)$body['location']) : '';

            $provinceId = isset($body['province_id']) ? (int)$body['province_id'] : 0;
            if ($provinceId <= 0 && isset($body['provinceId'])) $provinceId = (int)$body['provinceId'];

            $organizationTypeId = isset($body['organization_type_id']) ? (int)$body['organization_type_id'] : 0;
            if ($organizationTypeId <= 0 && isset($body['organizationTypeId'])) $organizationTypeId = (int)$body['organizationTypeId'];

            if ($code === '' || $name === '' || $location === '' || $provinceId <= 0 || $organizationTypeId <= 0) {
                $this->fail('code, name, location, province_id and organization_type_id are required', 422);
                return;
            }

            // code ต้องไม่ซ้ำ (ยกเว้นตัวเอง)
            if ($this->model->existsByCode($code, $id)) {
                $this->fail('Duplicate organization code', 409);
                return;
            }

            // optional: กันชื่อซ้ำในขอบเขต (จังหวัด+ประเภท) (ยกเว้นตัวเอง)
            if ($this->model->existsByNameInScope($name, $provinceId, $organizationTypeId, $id)) {
                $this->fail('Duplicate organization name in the same province and type', 409);
                return;
            }

            $updated = $this->model->update($id, $code, $name, $location, $provinceId, $organizationTypeId);
            $this->ok('updated', $updated);
        } catch (Throwable $e) {
            if (stripos($e->getMessage(), 'not found') !== false) {
                $this->fail('Organization not found', 404);
                return;
            }
            $this->fail($e->getMessage(), 500);
        }
    }

    // DELETE /organizations/{id} OR DELETE /organizations?id=1
    public function delete(int $id = 0): void
    {
        try {
            $id = $this->resolveId($id);
            if ($id <= 0) {
                $this->fail('organization_id is required', 422);
                return;
            }

            $ok = $this->model->delete($id);
            if (!$ok) {
                $this->fail('Organization not found', 404);
                return;
            }

            $this->ok('deleted', ['organization_id' => $id]);
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
        if (isset($_GET['organization_id'])) return (int)$_GET['organization_id'];

        $body = $this->getBody();
        if (isset($body['id'])) return (int)$body['id'];
        if (isset($body['organization_id'])) return (int)$body['organization_id'];

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

    /**
     * ส่ง response สำเร็จ
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

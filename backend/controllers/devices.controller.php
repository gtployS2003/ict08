<?php
// backend/controllers/devices.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../models/DeviceModel.php';

final class DevicesController
{
    public function __construct(private PDO $pdo) {}

    // GET /devices/map?q=&province_id=&organization_id=&main_type_of_device_id=&type_of_device_id=&status=
    // ใช้สำหรับหน้าแผนที่: คืนข้อมูลพร้อม lat/lng และ path icon
    public function map(): void
    {
        try {
            $q = isset($_GET['q']) ? trim((string)$_GET['q']) : '';

            $provinceId = null;
            if (isset($_GET['province_id']) && $_GET['province_id'] !== '') {
                $provinceId = (int)$_GET['province_id'];
                if ($provinceId <= 0) $provinceId = null;
            }

            $organizationId = null;
            if (isset($_GET['organization_id']) && $_GET['organization_id'] !== '') {
                $organizationId = (int)$_GET['organization_id'];
                if ($organizationId <= 0) $organizationId = null;
            }

            $mainTypeId = null;
            if (isset($_GET['main_type_of_device_id']) && $_GET['main_type_of_device_id'] !== '') {
                $mainTypeId = (int)$_GET['main_type_of_device_id'];
                if ($mainTypeId <= 0) $mainTypeId = null;
            }

            $typeId = null;
            if (isset($_GET['type_of_device_id']) && $_GET['type_of_device_id'] !== '') {
                $typeId = (int)$_GET['type_of_device_id'];
                if ($typeId <= 0) $typeId = null;
            }

            // status: all|online|offline|maintenance (ตอนนี้ map กับ is_online)
            $isOnline = null;
            if (isset($_GET['is_online']) && $_GET['is_online'] !== '') {
                $isOnline = (int)$_GET['is_online'];
                if ($isOnline !== 0 && $isOnline !== 1) $isOnline = null;
            } else if (isset($_GET['status']) && $_GET['status'] !== '') {
                $status = strtolower(trim((string)$_GET['status']));
                if ($status === 'online') $isOnline = 1;
                if ($status === 'offline' || $status === 'maintenance') $isOnline = 0;
            }

            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 5000;

            $model = new DeviceModel($this->pdo);
            $items = $model->listDevicesForMap($q, $provinceId, $organizationId, $mainTypeId, $typeId, $isOnline, $limit);

            json_response([
                'error' => false,
                'message' => 'OK',
                'data' => [
                    'items' => $items,
                ],
            ]);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to list devices for map',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    // GET /devices?q=&page=&limit=&province_id=
    public function index(): void
    {
        try {
            $q = isset($_GET['q']) ? trim((string)$_GET['q']) : '';
            $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;

            $provinceId = null;
            if (isset($_GET['province_id']) && $_GET['province_id'] !== '') {
                $provinceId = (int)$_GET['province_id'];
                if ($provinceId <= 0) $provinceId = null;
            }

            $organizationId = null;
            if (isset($_GET['organization_id']) && $_GET['organization_id'] !== '') {
                $organizationId = (int)$_GET['organization_id'];
                if ($organizationId <= 0) $organizationId = null;
            }

            $mainTypeId = null;
            if (isset($_GET['main_type_of_device_id']) && $_GET['main_type_of_device_id'] !== '') {
                $mainTypeId = (int)$_GET['main_type_of_device_id'];
                if ($mainTypeId <= 0) $mainTypeId = null;
            }

            $typeId = null;
            if (isset($_GET['type_of_device_id']) && $_GET['type_of_device_id'] !== '') {
                $typeId = (int)$_GET['type_of_device_id'];
                if ($typeId <= 0) $typeId = null;
            }

            $model = new DeviceModel($this->pdo);
            $result = $model->listDevices($q, $page, $limit, $provinceId, $organizationId, $mainTypeId, $typeId);

            json_response([
                'error' => false,
                'message' => 'OK',
                'data' => $result,
            ]);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to list devices',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    // GET /devices/{id}
    public function show(int $id): void
    {
        try {
            if ($id <= 0) {
                json_response(['error' => true, 'message' => 'Invalid device id'], 400);
                return;
            }

            $model = new DeviceModel($this->pdo);
            $row = $model->getById($id);

            if (!$row) {
                json_response(['error' => true, 'message' => 'Device not found'], 404);
                return;
            }

            json_response([
                'error' => false,
                'message' => 'OK',
                'data' => $row,
            ]);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to get device',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    // POST /devices
    public function store(): void
    {
        try {
            $body = $this->getJsonBody();

            $deviceName = trim((string)($body['device_name'] ?? ''));
            $mainTypeId = (int)($body['main_type_of_device_id'] ?? 0);
            $typeId = (int)($body['type_of_device_id'] ?? 0);
            $contactInfoId = (int)($body['contact_info_id'] ?? 0);
            $ip = isset($body['ip']) ? trim((string)$body['ip']) : '';
            $detail = isset($body['detail']) ? trim((string)$body['detail']) : '';

            $errors = [];
            if ($deviceName === '') $errors['device_name'] = 'device_name is required';
            if ($mainTypeId <= 0) $errors['main_type_of_device_id'] = 'main_type_of_device_id is required';
            if ($typeId <= 0) $errors['type_of_device_id'] = 'type_of_device_id is required';
            if ($contactInfoId <= 0) $errors['contact_info_id'] = 'contact_info_id is required';

            if (!empty($errors)) {
                json_response([
                    'error' => true,
                    'message' => 'Validation failed',
                    'errors' => $errors,
                ], 422);
                return;
            }

            // is_online: default 0 if not provided
            $isOnline = isset($body['is_online']) ? (int)$body['is_online'] : 0;

            $model = new DeviceModel($this->pdo);
            $newId = $model->create([
                'device_name' => $deviceName,
                'main_type_of_device_id' => $mainTypeId,
                'type_of_device_id' => $typeId,
                'ip' => $ip,
                'contact_info_id' => $contactInfoId,
                'detail' => $detail,
                'is_online' => $isOnline,
            ]);

            json_response([
                'error' => false,
                'message' => 'Created',
                'data' => ['device_id' => $newId],
            ], 201);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to create device',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    // PUT /devices/{id}
    public function update(int $id): void
    {
        try {
            if ($id <= 0) {
                json_response(['error' => true, 'message' => 'Invalid device id'], 400);
                return;
            }

            $body = $this->getJsonBody();

            $deviceName = trim((string)($body['device_name'] ?? ''));
            $mainTypeId = (int)($body['main_type_of_device_id'] ?? 0);
            $typeId = (int)($body['type_of_device_id'] ?? 0);
            $contactInfoId = (int)($body['contact_info_id'] ?? 0);
            $ip = isset($body['ip']) ? trim((string)$body['ip']) : '';
            $detail = isset($body['detail']) ? trim((string)$body['detail']) : '';

            $errors = [];
            if ($deviceName === '') $errors['device_name'] = 'device_name is required';
            if ($mainTypeId <= 0) $errors['main_type_of_device_id'] = 'main_type_of_device_id is required';
            if ($typeId <= 0) $errors['type_of_device_id'] = 'type_of_device_id is required';
            if ($contactInfoId <= 0) $errors['contact_info_id'] = 'contact_info_id is required';

            if (!empty($errors)) {
                json_response([
                    'error' => true,
                    'message' => 'Validation failed',
                    'errors' => $errors,
                ], 422);
                return;
            }

            $model = new DeviceModel($this->pdo);

            // check exists
            $old = $model->getById($id);
            if (!$old) {
                json_response(['error' => true, 'message' => 'Device not found'], 404);
                return;
            }

            $ok = $model->update($id, [
                'device_name' => $deviceName,
                'main_type_of_device_id' => $mainTypeId,
                'type_of_device_id' => $typeId,
                'ip' => $ip,
                'contact_info_id' => $contactInfoId,
                'detail' => $detail,
            ]);

            json_response([
                'error' => false,
                'message' => $ok ? 'Updated' : 'No changes',
                'data' => ['device_id' => $id],
            ]);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to update device',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    // DELETE /devices/{id}
    public function destroy(int $id): void
    {
        try {
            if ($id <= 0) {
                json_response(['error' => true, 'message' => 'Invalid device id'], 400);
                return;
            }

            $model = new DeviceModel($this->pdo);

            // check exists
            $old = $model->getById($id);
            if (!$old) {
                json_response(['error' => true, 'message' => 'Device not found'], 404);
                return;
            }

            $ok = $model->delete($id);

            json_response([
                'error' => false,
                'message' => $ok ? 'Deleted' : 'Delete failed',
                'data' => ['device_id' => $id],
            ]);
        } catch (Throwable $e) {
            json_response([
                'error' => true,
                'message' => 'Failed to delete device',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    private function getJsonBody(): array
    {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw ?: '', true);

        if (!is_array($data)) {
            // รองรับกรณีส่งแบบ x-www-form-urlencoded (กันพัง)
            $data = $_POST ?? [];
            if (!is_array($data)) $data = [];
        }

        return $data;
    }
}

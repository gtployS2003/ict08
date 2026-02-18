<?php
// backend/controllers/main_type_of_device.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../models/MainTypeOfDeviceModel.php';

final class MainTypeOfDeviceController
{
    public function __construct(private PDO $pdo) {}

    public function list(): void
    {
        try {
            $q = (string)($_GET['q'] ?? '');
            $page = (int)($_GET['page'] ?? 1);
            $limit = (int)($_GET['limit'] ?? 50);

            $model = new MainTypeOfDeviceModel($this->pdo);
            $data = $model->list($q, $page, $limit);

            ok($data, "OK");
        } catch (Throwable $e) {
            fail("Failed to get main type of device", 500, [
                "detail" => $e->getMessage(),
            ]);
        }
    }

    public function create(): void
    {
        try {
            $body = json_decode((string)file_get_contents('php://input'), true) ?: [];
            $title = (string)($body['title'] ?? '');

            $model = new MainTypeOfDeviceModel($this->pdo);
            $id = $model->create($title);

            ok(["id" => $id], "Created", 201);
        } catch (InvalidArgumentException $e) {
            fail("Validation error", 422, [
                "detail" => $e->getMessage(),
            ]);
        } catch (Throwable $e) {
            fail("Failed to create main type of device", 500, [
                "detail" => $e->getMessage(),
            ]);
        }
    }

    public function update(int $id): void
    {
        try {
            $body = json_decode((string)file_get_contents('php://input'), true) ?: [];
            $title = (string)($body['title'] ?? '');

            $model = new MainTypeOfDeviceModel($this->pdo);

            if (!$model->exists($id)) {
                fail("Not found", 404, [
                    "detail" => "main_type_of_device not found",
                    "id" => $id,
                ]);
            }

            $model->update($id, $title);
            ok(["id" => $id], "Updated");
        } catch (InvalidArgumentException $e) {
            fail("Validation error", 422, [
                "detail" => $e->getMessage(),
            ]);
        } catch (Throwable $e) {
            fail("Failed to update main type of device", 500, [
                "detail" => $e->getMessage(),
            ]);
        }
    }

    public function delete(int $id): void
    {
        try {
            $model = new MainTypeOfDeviceModel($this->pdo);

            if (!$model->exists($id)) {
                fail("Not found", 404, [
                    "detail" => "main_type_of_device not found",
                    "id" => $id,
                ]);
            }

            $model->delete($id);
            ok(["id" => $id], "Deleted");
        } catch (Throwable $e) {
            fail("Failed to delete main type of device", 500, [
                "detail" => $e->getMessage(),
            ]);
        }
    }
}

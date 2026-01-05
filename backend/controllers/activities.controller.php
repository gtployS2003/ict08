<?php
// backend/controllers/activities.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../models/ActivityModel.php';

class ActivitiesController {
    public function __construct(private PDO $pdo) {}

    public function list(): void {
        $limit = (int)($_GET['limit'] ?? 20);
        $model = new ActivityModel($this->pdo);
        ok($model->list($limit));
    }

    public function get(int $id): void {
        $model = new ActivityModel($this->pdo);
        $row = $model->get($id);
        if (!$row) fail("Activity not found", 404);
        ok($row);
    }
}

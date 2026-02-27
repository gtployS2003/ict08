<?php
// backend/controllers/activities.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../models/ActivityModel.php';

class ActivitiesController
{
    /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function list(): void
    {
        $page = max(1, (int) ($_GET['page'] ?? 1));
        $limit = max(1, min(500, (int) ($_GET['limit'] ?? 200)));
        $q = trim((string) ($_GET['q'] ?? ''));

        $model = new ActivityModel($this->pdo);
        $items = $model->listPublic($q, $page, $limit);
        $total = $model->countPublic($q);
        $totalPages = (int) ceil($total / max(1, $limit));
        if ($totalPages < 1)
            $totalPages = 1;

        ok([
            'items' => $items,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'totalPages' => $totalPages,
            ],
        ]);
    }

    public function get(int $id): void
    {
        $model = new ActivityModel($this->pdo);
        $row = $model->getPublic($id);
        if (!$row)
            fail("Activity not found", 404);
        ok($row);
    }
}

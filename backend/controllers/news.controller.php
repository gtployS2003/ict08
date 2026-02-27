<?php
// backend/controllers/news.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../models/NewsModel.php';

class NewsController {
        /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function list(): void {
        $limit = (int)($_GET['limit'] ?? 20);
        $model = new NewsModel($this->pdo);
        ok($model->list($limit));
    }

    public function get(int $id): void {
        $model = new NewsModel($this->pdo);
        $row = $model->get($id);
        if (!$row) fail("News not found", 404);
        ok($row);
    }

    public function create(): void {
        $user = require_auth($this->pdo);

        $body = read_json_body();
        $missing = require_fields($body, ['title', 'content']);
        if ($missing) fail("Missing fields", 422, $missing);

        // writer must be the user who creates the news
        $body['writer'] = (int)($user['user_id'] ?? 0);

        $model = new NewsModel($this->pdo);
        $id = $model->create($body);
        ok(["news_id" => $id], "Created", 201);
    }

    public function update(int $id): void {
        $model = new NewsModel($this->pdo);
        $found = $model->get($id);
        if (!$found) fail("News not found", 404);

        $body = read_json_body();
        if (!is_array($body) || count($body) === 0) {
            fail("Missing fields", 422, ['body']);
        }

        // merge to allow partial updates (e.g. is_banner toggle)
        $merged = array_merge($found, $body);

        // Update update_at only when the web-post fields are edited (not banner toggle)
        $touchUpdateAt = false;
        foreach (['title', 'content', 'link_url'] as $k) {
            if (array_key_exists($k, $body)) {
                $touchUpdateAt = true;
                break;
            }
        }
        if ($touchUpdateAt && $model->supportsUpdateAt()) {
            $merged['update_at'] = date('Y-m-d H:i:s');
        }
        $missing = require_fields($merged, ['title', 'content']);
        if ($missing) fail("Missing fields", 422, $missing);

        $model->update($id, $merged);
        ok(["news_id" => $id], "Updated");
    }

    public function delete(int $id): void {
        $model = new NewsModel($this->pdo);
        $found = $model->get($id);
        if (!$found) fail("News not found", 404);

        $model->delete($id);
        ok(["news_id" => $id], "Deleted");
    }
}

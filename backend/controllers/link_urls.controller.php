<?php
// backend/controllers/link_urls.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../models/LinkUrlModel.php';

final class LinkUrlsController
{
    public function __construct(private PDO $pdo)
    {
    }

    /**
     * GET /link-urls?q=&page=&limit=&public=1&is_banner=0|1
     * - public=1 -> no auth; by default filters is_banner=0 unless provided
     * - otherwise -> require auth
     */
    public function index(): void
    {
        $q = trim((string)($_GET['q'] ?? ''));
        $page = (int)($_GET['page'] ?? 1);
        $limit = (int)($_GET['limit'] ?? 50);
        $public = (int)($_GET['public'] ?? 0) === 1;

        $isBanner = null;

        if ($public) {
            // For public list, default to related links (not banner)
            if (isset($_GET['is_banner']) && $_GET['is_banner'] !== '') {
                $isBanner = (int)$_GET['is_banner'];
            } else {
                $isBanner = 0;
            }
        } else {
            require_auth($this->pdo);
            if (isset($_GET['is_banner']) && $_GET['is_banner'] !== '') {
                $isBanner = (int)$_GET['is_banner'];
            }
        }

        $model = new LinkUrlModel($this->pdo);
        $items = $model->list($q, $page, $limit, $isBanner);
        $total = $model->count($q, $isBanner);

        ok([
            'items' => $items,
            'pagination' => [
                'page' => max(1, $page),
                'limit' => max(1, min(200, $limit)),
                'total' => $total,
                'total_pages' => (int)ceil($total / max(1, min(200, $limit))),
            ],
        ]);
    }

    /**
     * GET /link-urls/{id}
     */
    public function show(int $id): void
    {
        require_auth($this->pdo);

        $model = new LinkUrlModel($this->pdo);
        $row = $model->find($id);
        if (!$row) fail('Link not found', 404);
        ok($row);
    }

    /**
     * POST /link-urls
     */
    public function create(): void
    {
        $user = require_auth($this->pdo);
        $writerId = (int)($user['user_id'] ?? 0);

        $body = $this->readBody();
        $title = trim((string)($body['title'] ?? ''));
        $linkUrl = trim((string)($body['link_url'] ?? ''));

        if ($title === '' || $linkUrl === '') {
            fail('Validation failed', 422, ['title and link_url are required']);
        }

        $model = new LinkUrlModel($this->pdo);
        $newId = $model->create($body, $writerId);
        $row = $model->find($newId);
        ok($row, 'Created', 201);
    }

    /**
     * PUT /link-urls/{id}
     */
    public function update(int $id): void
    {
        $user = require_auth($this->pdo);
        $writerId = (int)($user['user_id'] ?? 0);

        $model = new LinkUrlModel($this->pdo);
        $exists = $model->find($id);
        if (!$exists) fail('Link not found', 404);

        $body = $this->readBody();
        $title = trim((string)($body['title'] ?? ''));
        $linkUrl = trim((string)($body['link_url'] ?? ''));

        if ($title === '' || $linkUrl === '') {
            fail('Validation failed', 422, ['title and link_url are required']);
        }

        $model->update($id, $body, $writerId);
        $row = $model->find($id);
        ok($row, 'Updated');
    }

    /**
     * DELETE /link-urls/{id}
     */
    public function delete(int $id): void
    {
        require_auth($this->pdo);

        $model = new LinkUrlModel($this->pdo);
        $row = $model->find($id);
        if (!$row) fail('Link not found', 404);

        $ok = $model->delete($id);
        ok(['deleted' => $ok, 'url_id' => $id], 'Deleted');
    }

    /**
     * @return array<string,mixed>
     */
    private function readBody(): array
    {
        if (!empty($_POST)) return $_POST;

        $raw = file_get_contents('php://input');
        if (!$raw) return [];

        $json = json_decode($raw, true);
        if (is_array($json)) return $json;

        parse_str($raw, $data);
        return is_array($data) ? $data : [];
    }
}

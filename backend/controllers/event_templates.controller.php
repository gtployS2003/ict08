<?php
// backend/controllers/event_templates.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../models/EventTemplateModel.php';
require_once __DIR__ . '/../models/EventTemplateAssetModel.php';

// auth middleware
$authPath = __DIR__ . '/../middleware/auth.php';
if (file_exists($authPath)) {
    require_once $authPath;
}

// dev auth middleware (X-Dev-Api-Key)
$devAuthPath = __DIR__ . '/../middleware/dev_auth.php';
if (file_exists($devAuthPath)) {
    require_once $devAuthPath;
}

final class EventTemplatesController
{
    public function __construct(private PDO $pdo) {}

    /**
     * GET /event-templates/by-publicity-post/{publicityPostId}
     */
    public function showByPublicityPost(int $publicityPostId): void
    {
        try {
            $this->requireStaffAccess();

            $publicityPostId = max(1, (int)$publicityPostId);
            $m = new EventTemplateModel($this->pdo);
            $row = $m->findByPublicityPostId($publicityPostId);
            if (!$row) {
                json_response(['error' => false, 'data' => null]);
                return;
            }

            $tid = (int)($row['event_template_id'] ?? 0);
            $assets = [];
            if ($tid > 0) {
                $am = new EventTemplateAssetModel($this->pdo);
                $assets = $am->listByEventTemplateId($tid);
            }

            json_response([
                'error' => false,
                'data' => [
                    'template' => $row,
                    'assets' => $assets,
                ],
            ]);
        } catch (Throwable $e) {
            json_response(['error' => true, 'message' => 'Failed to get event template', 'detail' => $e->getMessage()], 500);
        }
    }

    /**
     * PUT /event-templates/by-publicity-post/{publicityPostId}
     * body: { template_type_id, layout_json, assets?: [{event_media_id, slot_no}] }
     */
    public function upsertByPublicityPost(int $publicityPostId): void
    {
        try {
            $me = $this->requireStaffAccess(true);

            $publicityPostId = max(1, (int)$publicityPostId);
            $body = read_json_body();

            $templateTypeId = (int)($body['template_type_id'] ?? 0);
            if ($templateTypeId <= 0) {
                json_response(['error' => true, 'message' => 'template_type_id is required'], 422);
                return;
            }

            $layoutRaw = $body['layout_json'] ?? null;
            if ($layoutRaw === null) {
                json_response(['error' => true, 'message' => 'layout_json is required'], 422);
                return;
            }

            $layoutJson = '';
            if (is_string($layoutRaw)) {
                $layoutJson = $layoutRaw;
            } else {
                $layoutJson = json_encode($layoutRaw, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }
            if (!is_string($layoutJson) || trim($layoutJson) === '') {
                json_response(['error' => true, 'message' => 'layout_json must be a JSON object or JSON string'], 422);
                return;
            }

            // Validate JSON
            json_decode($layoutJson, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                json_response(['error' => true, 'message' => 'layout_json is invalid JSON', 'detail' => json_last_error_msg()], 422);
                return;
            }

            $assets = $body['assets'] ?? [];
            if (!is_array($assets)) $assets = [];

            $uid = (int)($me['user_id'] ?? 0);
            if ($uid <= 0) $uid = 0;

            $this->pdo->beginTransaction();

            $tm = new EventTemplateModel($this->pdo);
            $eventTemplateId = $tm->upsert($publicityPostId, $templateTypeId, $layoutJson, $uid);

            $am = new EventTemplateAssetModel($this->pdo);
            $am->replaceAssets($eventTemplateId, $assets);

            $this->pdo->commit();

            $row = $tm->findByPublicityPostId($publicityPostId);
            $assetRows = $am->listByEventTemplateId($eventTemplateId);

            json_response([
                'error' => false,
                'data' => [
                    'template' => $row,
                    'assets' => $assetRows,
                ],
            ]);
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            json_response(['error' => true, 'message' => 'Failed to save event template', 'detail' => $e->getMessage()], 500);
        }
    }

    /**
     * @return array<string,mixed>|null
     */
    private function requireStaffAccess(bool $returnUser = false): ?array
    {
        $hasToken = false;
        if (function_exists('get_bearer_token')) {
            $hasToken = (get_bearer_token() !== null);
        } else {
            $auth = (string)($_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
            $hasToken = stripos($auth, 'Bearer ') !== false;
        }

        if ($hasToken && function_exists('require_auth')) {
            $u = require_auth($this->pdo);
            return $returnUser ? $u : $u;
        }

        if (function_exists('require_dev_staff')) {
            require_dev_staff();
            return null;
        }

        if (function_exists('require_auth')) {
            $u = require_auth($this->pdo);
            return $returnUser ? $u : $u;
        }

        fail('UNAUTHORIZED', 401, 'Unauthorized');
        exit;
    }
}

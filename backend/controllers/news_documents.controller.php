<?php
// backend/controllers/news_documents.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../models/NewsDocumentModel.php';
require_once __DIR__ . '/../models/NewsModel.php';
require_once __DIR__ . '/../models/DocumentModel.php';

final class NewsDocumentsController
{
        /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * GET /news/{news_id}/documents
     */
    public function listByNewsId(int $newsId): void
    {
        // Public endpoint: allow anonymous access.
        // If not authenticated, only return active & non-private documents.
        $user = get_auth_user($this->pdo);
        $publicOnly = $user ? false : true;

        $newsModel = new NewsModel($this->pdo);
        $news = $newsModel->get($newsId);
        if (!$news) fail('News not found', 404);

        $model = new NewsDocumentModel($this->pdo);
        $items = $model->listDocumentsByNewsId($newsId, $publicOnly);
        ok(['items' => $items]);
    }

    /**
     * POST /news/{news_id}/documents
     * body: { document_id: number }
     */
    public function attach(int $newsId): void
    {
        require_auth($this->pdo);

        $newsModel = new NewsModel($this->pdo);
        $news = $newsModel->get($newsId);
        if (!$news) fail('News not found', 404);

        $raw = file_get_contents('php://input');
        $body = json_decode($raw ?: '[]', true);
        if (!is_array($body) || !isset($body['document_id'])) {
            fail('Validation failed', 422, ['document_id is required']);
        }

        $documentId = (int)$body['document_id'];
        if ($documentId <= 0) {
            fail('Validation failed', 422, ['document_id must be a positive integer']);
        }

        $docModel = new DocumentModel($this->pdo);
        $doc = $docModel->find($documentId);
        if (!$doc) fail('Document not found', 404);

        $model = new NewsDocumentModel($this->pdo);
        $inserted = $model->attach($newsId, $documentId);

        ok([
            'attached' => $inserted,
            'news_id' => $newsId,
            'document_id' => $documentId,
        ], $inserted ? 'Attached' : 'Already attached');
    }

    /**
     * DELETE /news/{news_id}/documents/{document_id}
     */
    public function detach(int $newsId, int $documentId): void
    {
        require_auth($this->pdo);

        $newsModel = new NewsModel($this->pdo);
        $news = $newsModel->get($newsId);
        if (!$news) fail('News not found', 404);

        $model = new NewsDocumentModel($this->pdo);
        $deleted = $model->detach($newsId, $documentId);

        ok([
            'detached' => $deleted,
            'news_id' => $newsId,
            'document_id' => $documentId,
        ], $deleted ? 'Detached' : 'Not attached');
    }
}

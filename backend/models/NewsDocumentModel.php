<?php
// backend/models/NewsDocumentModel.php
declare(strict_types=1);

final class NewsDocumentModel
{
    /** @var string */
    private $table = '`news_document`';

    /** @var string */
    private $documentTable = '`document`';

    /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * List documents attached to a news item.
     *
     * @return array<int, array<string,mixed>>
     */
    public function listDocumentsByNewsId(int $newsId, $publicOnly = false): array
    {
        $where = "nd.news_id = :news_id";
        if ($publicOnly) {
            // Public pages must not expose private or inactive documents.
            $where .= " AND d.is_private = 0 AND d.is_active = 1";
        }

        $sql = "
            SELECT
                d.document_id,
                d.filepath,
                d.original_filename,
                d.stored_filename,
                d.file_size,
                d.is_private,
                d.is_active
            FROM {$this->documentTable} d
            INNER JOIN {$this->table} nd
                ON nd.document_id = d.document_id
            WHERE {$where}
            ORDER BY nd.news_document_id ASC
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':news_id', $newsId, PDO::PARAM_INT);
        $stmt->execute();

        /** @var array<int, array<string,mixed>> */
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Attach a document to a news item.
     * Returns true if inserted, false if already exists.
     */
    public function attach(int $newsId, int $documentId): bool
    {
        // Avoid duplicates even if DB doesn't have a UNIQUE(news_id, document_id)
        $chk = $this->pdo->prepare(
            "SELECT news_document_id FROM {$this->table} WHERE news_id = :news_id AND document_id = :document_id LIMIT 1"
        );
        $chk->bindValue(':news_id', $newsId, PDO::PARAM_INT);
        $chk->bindValue(':document_id', $documentId, PDO::PARAM_INT);
        $chk->execute();
        $exists = $chk->fetch(PDO::FETCH_ASSOC);
        if ($exists) {
            return false;
        }

        $sql = "INSERT INTO {$this->table} (news_id, document_id) VALUES (:news_id, :document_id)";
        $stmt = $this->pdo->prepare($sql);
        try {
            $stmt->bindValue(':news_id', $newsId, PDO::PARAM_INT);
            $stmt->bindValue(':document_id', $documentId, PDO::PARAM_INT);
            $stmt->execute();
            return $stmt->rowCount() > 0;
        } catch (PDOException $e) {
            // Duplicate key -> already attached
            // MySQL: 23000 (integrity constraint violation)
            if ((string) $e->getCode() === '23000') {
                return false;
            }
            throw $e;
        }
    }

    /**
     * Detach a document from a news item.
     */
    public function detach(int $newsId, int $documentId): bool
    {
        $sql = "DELETE FROM {$this->table} WHERE news_id = :news_id AND document_id = :document_id";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':news_id', $newsId, PDO::PARAM_INT);
        $stmt->bindValue(':document_id', $documentId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->rowCount() > 0;
    }
}

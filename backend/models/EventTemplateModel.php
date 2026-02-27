<?php
// backend/models/EventTemplateModel.php
declare(strict_types=1);

final class EventTemplateModel
{
    /** @var string */
    private $table = 'event_template';

    /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function findByPublicityPostId(int $publicityPostId): ?array
    {
        $publicityPostId = max(1, (int) $publicityPostId);
        $stmt = $this->pdo->prepare("SELECT * FROM {$this->table} WHERE publicity_post_id = :pid LIMIT 1");
        $stmt->execute([':pid' => $publicityPostId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * Upsert by publicity_post_id. Returns event_template_id.
     */
    public function upsert(int $publicityPostId, int $templateTypeId, string $layoutJson, int $createdBy = 0): int
    {
        $publicityPostId = max(1, (int) $publicityPostId);
        $templateTypeId = max(1, (int) $templateTypeId);
        $createdBy = max(0, (int) $createdBy);

        $existing = $this->findByPublicityPostId($publicityPostId);
        if ($existing && is_numeric($existing['event_template_id'] ?? null)) {
            $id = (int) $existing['event_template_id'];
            $stmt = $this->pdo->prepare("UPDATE {$this->table} SET template_type_id = :tid, layout_json = :layout_json WHERE event_template_id = :id");
            $stmt->execute([
                ':tid' => $templateTypeId,
                ':layout_json' => $layoutJson,
                ':id' => $id,
            ]);
            return $id;
        }

        $stmt = $this->pdo->prepare("INSERT INTO {$this->table} (publicity_post_id, template_type_id, layout_json, created_by, created_at) VALUES (:pid, :tid, :layout_json, :created_by, NOW())");
        $stmt->execute([
            ':pid' => $publicityPostId,
            ':tid' => $templateTypeId,
            ':layout_json' => $layoutJson,
            ':created_by' => $createdBy,
        ]);

        return (int) $this->pdo->lastInsertId();
    }
}

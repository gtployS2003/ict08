<?php
// backend/models/EventTemplateAssetModel.php
declare(strict_types=1);

final class EventTemplateAssetModel
{
    private string $table = 'event_template_asset';

    /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function listByEventTemplateId(int $eventTemplateId): array
    {
        $eventTemplateId = max(1, (int)$eventTemplateId);
        $stmt = $this->pdo->prepare("SELECT * FROM {$this->table} WHERE event_template_id = :id ORDER BY slot_no ASC, event_template_asset_id ASC");
        $stmt->execute([':id' => $eventTemplateId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * Replace assets for a template (delete+insert).
     * @param array<int,array{event_media_id:int,slot_no:int}> $assets
     */
    public function replaceAssets(int $eventTemplateId, array $assets): void
    {
        $eventTemplateId = max(1, (int)$eventTemplateId);

        $del = $this->pdo->prepare("DELETE FROM {$this->table} WHERE event_template_id = :id");
        $del->execute([':id' => $eventTemplateId]);

        if (!$assets) return;

        $ins = $this->pdo->prepare("INSERT INTO {$this->table} (event_template_id, event_media_id, slot_no) VALUES (:tid, :mid, :slot)");
        foreach ($assets as $a) {
            $mid = max(1, (int)($a['event_media_id'] ?? 0));
            $slot = max(1, (int)($a['slot_no'] ?? 0));
            if ($mid <= 0 || $slot <= 0) continue;
            $ins->execute([
                ':tid' => $eventTemplateId,
                ':mid' => $mid,
                ':slot' => $slot,
            ]);
        }
    }
}

<?php
// backend/models/EventTemplateExportModel.php
declare(strict_types=1);

final class EventTemplateExportModel
{
    /** @var string */
    private $table = 'event_template_export';

    /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * @return array<string,mixed>|null
     */
    public function findByEventTemplateId(int $eventTemplateId): ?array
    {
        $eventTemplateId = max(1, (int) $eventTemplateId);
        $sql = "SELECT * FROM {$this->table} WHERE event_template_id = :tid ORDER BY event_template_export_id DESC LIMIT 1";
        $st = $this->pdo->prepare($sql);
        $st->execute([':tid' => $eventTemplateId]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        return is_array($row) ? $row : null;
    }

    /**
     * Upsert by event_template_id (replace instead of inserting new row).
     *
     * @return int event_template_export_id
     */
    public function upsertByEventTemplateId(
        int $eventTemplateId,
        string $filepath,
        ?string $originalFilename,
        ?string $storedFilename,
        ?int $fileSize,
        int $exportedBy
    ): int {
        $eventTemplateId = max(1, (int) $eventTemplateId);
        $exportedBy = max(0, (int) $exportedBy);
        $fileSize = $fileSize !== null ? (int) $fileSize : null;

        $existing = $this->findByEventTemplateId($eventTemplateId);
        if ($existing) {
            $id = (int) ($existing['event_template_export_id'] ?? 0);
            $sql = "UPDATE {$this->table}
                    SET filepath = :filepath,
                        original_filename = :original_filename,
                        stored_filename = :stored_filename,
                        file_size = :file_size,
                        exported_by = :exported_by,
                        exported_at = NOW()
                    WHERE event_template_export_id = :id";
            $st = $this->pdo->prepare($sql);
            $st->execute([
                ':filepath' => $filepath,
                ':original_filename' => $originalFilename,
                ':stored_filename' => $storedFilename,
                ':file_size' => $fileSize,
                ':exported_by' => $exportedBy > 0 ? $exportedBy : null,
                ':id' => $id,
            ]);
            return $id;
        }

        $sql = "INSERT INTO {$this->table}
                (event_template_id, filepath, original_filename, stored_filename, file_size, exported_by, exported_at)
                VALUES
                (:event_template_id, :filepath, :original_filename, :stored_filename, :file_size, :exported_by, NOW())";
        $st = $this->pdo->prepare($sql);
        $st->execute([
            ':event_template_id' => $eventTemplateId,
            ':filepath' => $filepath,
            ':original_filename' => $originalFilename,
            ':stored_filename' => $storedFilename,
            ':file_size' => $fileSize,
            ':exported_by' => $exportedBy > 0 ? $exportedBy : null,
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    /**
     * @return array<string,mixed>|null
     */
    public function findById(int $id): ?array
    {
        $id = max(1, (int) $id);
        $sql = "SELECT * FROM {$this->table} WHERE event_template_export_id = :id";
        $st = $this->pdo->prepare($sql);
        $st->execute([':id' => $id]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        return is_array($row) ? $row : null;
    }
}

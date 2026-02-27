<?php
// backend/models/TemplateTypeModel.php
declare(strict_types=1);

final class TemplateTypeModel
{
    /** @var string */
    private $table = 'template_type';

    /** @var PDO */
    private $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?: db();
    }

    /**
     * @return array<int, array<string,mixed>>
     */
    public function list(string $q = '', int $page = 1, int $limit = 50): array
    {
        $page = max(1, $page);
        $limit = max(1, min(200, $limit));
        $offset = ($page - 1) * $limit;

        $q = trim($q);
        $where = '';
        $params = [];

        if ($q !== '') {
            $where = "WHERE (t.template_name LIKE :q1 OR t.detail LIKE :q2 OR CAST(t.template_type_id AS CHAR) LIKE :q3)";
            $like = '%' . $q . '%';
            $params[':q1'] = $like;
            $params[':q2'] = $like;
            $params[':q3'] = $like;
        }

        $sql = "
            SELECT
                t.template_type_id,
                t.template_name,
                t.detail,
                t.create_at,
                t.bg_filepath,
                t.bg_original_filename,
                t.bg_stored_filename,
                t.bg_file_size,
                t.bg_uploaded_by,
                t.bg_uploaded_at,
                t.canvas_width,
                t.canvas_height
            FROM {$this->table} t
            {$where}
            ORDER BY t.template_type_id ASC
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v, PDO::PARAM_STR);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        /** @var array<int, array<string,mixed>> */
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function count(string $q = ''): int
    {
        $q = trim($q);
        $where = '';
        $params = [];

        if ($q !== '') {
            $where = "WHERE (t.template_name LIKE :q1 OR t.detail LIKE :q2 OR CAST(t.template_type_id AS CHAR) LIKE :q3)";
            $like = '%' . $q . '%';
            $params[':q1'] = $like;
            $params[':q2'] = $like;
            $params[':q3'] = $like;
        }

        $sql = "SELECT COUNT(*) AS cnt FROM {$this->table} t {$where}";
        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v, PDO::PARAM_STR);
        }
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return (int) ($row['cnt'] ?? 0);
    }

    /**
     * @return array<string,mixed>|null
     */
    public function find(int $id): ?array
    {
        $sql = "
            SELECT
                t.template_type_id,
                t.template_name,
                t.detail,
                t.create_at,
                t.bg_filepath,
                t.bg_original_filename,
                t.bg_stored_filename,
                t.bg_file_size,
                t.bg_uploaded_by,
                t.bg_uploaded_at,
                t.canvas_width,
                t.canvas_height
            FROM {$this->table} t
            WHERE t.template_type_id = :id
            LIMIT 1
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row !== false ? $row : null;
    }

    /**
     * @param array<string,mixed> $data
     */
    public function create(array $data): int
    {
        $name = trim((string) ($data['template_name'] ?? ''));
        $detail = (string) ($data['detail'] ?? '');

        $bgFilepath = (string) ($data['bg_filepath'] ?? '');
        $bgOriginal = (string) ($data['bg_original_filename'] ?? '');
        $bgStored = (string) ($data['bg_stored_filename'] ?? '');
        $bgSize = (int) ($data['bg_file_size'] ?? 0);
        $bgUploadedBy = (int) ($data['bg_uploaded_by'] ?? 0);
        $bgUploadedAt = (string) ($data['bg_uploaded_at'] ?? '');

        $cw = (int) ($data['canvas_width'] ?? 0);
        $ch = (int) ($data['canvas_height'] ?? 0);

        $sql = "
            INSERT INTO {$this->table} (
                template_name,
                detail,
                create_at,
                bg_filepath,
                bg_original_filename,
                bg_stored_filename,
                bg_file_size,
                bg_uploaded_by,
                bg_uploaded_at,
                canvas_width,
                canvas_height
            ) VALUES (
                :name,
                :detail,
                NOW(),
                :bg_filepath,
                :bg_original,
                :bg_stored,
                :bg_size,
                :bg_uploaded_by,
                :bg_uploaded_at,
                :cw,
                :ch
            )
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':name', $name, PDO::PARAM_STR);
        $stmt->bindValue(':detail', $detail, PDO::PARAM_STR);
        $stmt->bindValue(':bg_filepath', $bgFilepath, PDO::PARAM_STR);
        $stmt->bindValue(':bg_original', $bgOriginal, PDO::PARAM_STR);
        $stmt->bindValue(':bg_stored', $bgStored, PDO::PARAM_STR);
        $stmt->bindValue(':bg_size', $bgSize, PDO::PARAM_INT);
        $stmt->bindValue(':bg_uploaded_by', $bgUploadedBy, PDO::PARAM_INT);
        $stmt->bindValue(':bg_uploaded_at', $bgUploadedAt !== '' ? $bgUploadedAt : null, $bgUploadedAt !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':cw', $cw, PDO::PARAM_INT);
        $stmt->bindValue(':ch', $ch, PDO::PARAM_INT);
        $stmt->execute();

        return (int) $this->pdo->lastInsertId();
    }

    /**
     * @param array<string,mixed> $data
     */
    public function update(int $id, array $data): bool
    {
        $name = trim((string) ($data['template_name'] ?? ''));
        $detail = (string) ($data['detail'] ?? '');

        $bgFilepath = (string) ($data['bg_filepath'] ?? '');
        $bgOriginal = (string) ($data['bg_original_filename'] ?? '');
        $bgStored = (string) ($data['bg_stored_filename'] ?? '');
        $bgSize = (int) ($data['bg_file_size'] ?? 0);
        $bgUploadedBy = (int) ($data['bg_uploaded_by'] ?? 0);
        $bgUploadedAt = (string) ($data['bg_uploaded_at'] ?? '');

        $cw = (int) ($data['canvas_width'] ?? 0);
        $ch = (int) ($data['canvas_height'] ?? 0);

        $sql = "
            UPDATE {$this->table}
            SET
                template_name = :name,
                detail = :detail,
                bg_filepath = :bg_filepath,
                bg_original_filename = :bg_original,
                bg_stored_filename = :bg_stored,
                bg_file_size = :bg_size,
                bg_uploaded_by = :bg_uploaded_by,
                bg_uploaded_at = :bg_uploaded_at,
                canvas_width = :cw,
                canvas_height = :ch
            WHERE template_type_id = :id
            LIMIT 1
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':name', $name, PDO::PARAM_STR);
        $stmt->bindValue(':detail', $detail, PDO::PARAM_STR);
        $stmt->bindValue(':bg_filepath', $bgFilepath, PDO::PARAM_STR);
        $stmt->bindValue(':bg_original', $bgOriginal, PDO::PARAM_STR);
        $stmt->bindValue(':bg_stored', $bgStored, PDO::PARAM_STR);
        $stmt->bindValue(':bg_size', $bgSize, PDO::PARAM_INT);
        $stmt->bindValue(':bg_uploaded_by', $bgUploadedBy, PDO::PARAM_INT);
        $stmt->bindValue(':bg_uploaded_at', $bgUploadedAt !== '' ? $bgUploadedAt : null, $bgUploadedAt !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':cw', $cw, PDO::PARAM_INT);
        $stmt->bindValue(':ch', $ch, PDO::PARAM_INT);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }

    public function delete(int $id): bool
    {
        $sql = "DELETE FROM {$this->table} WHERE template_type_id = :id LIMIT 1";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }
}

<?php
// backend/models/DocumentModel.php
declare(strict_types=1);

final class DocumentModel
{
    /** @var string */
    private $table = '`document`';

    /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * @return array<int, array<string,mixed>>
     */
    public function list(
        string $q = '',
        int $page = 1,
        int $limit = 50,
        $isPrivate = null,
        $isActive = null
    ): array {
        $page = max(1, $page);
        $limit = max(1, min(200, $limit));
        $offset = ($page - 1) * $limit;

        $q = trim($q);
        $where = [];
        $params = [];

        if ($q !== '') {
            $like = '%' . $q . '%';
            $where[] = "(d.original_filename LIKE :q1 OR d.stored_filename LIKE :q2 OR d.filepath LIKE :q3 OR CAST(d.document_id AS CHAR) LIKE :q4)";
            $params[':q1'] = $like;
            $params[':q2'] = $like;
            $params[':q3'] = $like;
            $params[':q4'] = $like;
        }

        if ($isPrivate !== null) {
            $where[] = 'd.is_private = :is_private';
            $params[':is_private'] = $isPrivate;
        }

        if ($isActive !== null) {
            $where[] = 'd.is_active = :is_active';
            $params[':is_active'] = $isActive;
        }

        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $sql = "
            SELECT
                d.document_id,
                d.filepath,
                d.original_filename,
                d.stored_filename,
                d.file_size,
                d.is_private,
                d.is_active
            FROM {$this->table} d
            {$whereSql}
            ORDER BY d.document_id ASC
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v, is_int($v) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        /** @var array<int, array<string,mixed>> */
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function count(string $q = '', $isPrivate = null, $isActive = null): int
    {
        $q = trim($q);
        $where = [];
        $params = [];

        if ($q !== '') {
            $like = '%' . $q . '%';
            $where[] = "(d.original_filename LIKE :q1 OR d.stored_filename LIKE :q2 OR d.filepath LIKE :q3 OR CAST(d.document_id AS CHAR) LIKE :q4)";
            $params[':q1'] = $like;
            $params[':q2'] = $like;
            $params[':q3'] = $like;
            $params[':q4'] = $like;
        }

        if ($isPrivate !== null) {
            $where[] = 'd.is_private = :is_private';
            $params[':is_private'] = $isPrivate;
        }

        if ($isActive !== null) {
            $where[] = 'd.is_active = :is_active';
            $params[':is_active'] = $isActive;
        }

        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $sql = "SELECT COUNT(*) AS cnt FROM {$this->table} d {$whereSql}";
        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v, is_int($v) ? PDO::PARAM_INT : PDO::PARAM_STR);
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
                d.document_id,
                d.filepath,
                d.original_filename,
                d.stored_filename,
                d.file_size,
                d.is_private,
                d.is_active
            FROM {$this->table} d
            WHERE d.document_id = :id
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
        $filepath = trim((string) ($data['filepath'] ?? ''));
        $original = trim((string) ($data['original_filename'] ?? ''));
        $stored = trim((string) ($data['stored_filename'] ?? ''));
        $size = (int) ($data['file_size'] ?? 0);
        $isPrivate = (int) ($data['is_private'] ?? 0);
        $isActive = (int) ($data['is_active'] ?? 1);

        $sql = "
            INSERT INTO {$this->table} (
                filepath,
                original_filename,
                stored_filename,
                file_size,
                is_private,
                is_active
            ) VALUES (
                :filepath,
                :original_filename,
                :stored_filename,
                :file_size,
                :is_private,
                :is_active
            )
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':filepath', $filepath, PDO::PARAM_STR);
        $stmt->bindValue(':original_filename', $original, PDO::PARAM_STR);
        $stmt->bindValue(':stored_filename', $stored, PDO::PARAM_STR);
        $stmt->bindValue(':file_size', $size, PDO::PARAM_INT);
        $stmt->bindValue(':is_private', $isPrivate, PDO::PARAM_INT);
        $stmt->bindValue(':is_active', $isActive, PDO::PARAM_INT);
        $stmt->execute();

        return (int) $this->pdo->lastInsertId();
    }

    /**
     * @param array<string,mixed> $data
     */
    public function update(int $id, array $data): bool
    {
        $filepath = trim((string) ($data['filepath'] ?? ''));
        $original = trim((string) ($data['original_filename'] ?? ''));
        $stored = trim((string) ($data['stored_filename'] ?? ''));
        $size = (int) ($data['file_size'] ?? 0);
        $isPrivate = (int) ($data['is_private'] ?? 0);
        $isActive = (int) ($data['is_active'] ?? 1);

        $sql = "
            UPDATE {$this->table}
            SET
                filepath = :filepath,
                original_filename = :original_filename,
                stored_filename = :stored_filename,
                file_size = :file_size,
                is_private = :is_private,
                is_active = :is_active
            WHERE document_id = :id
            LIMIT 1
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':filepath', $filepath, PDO::PARAM_STR);
        $stmt->bindValue(':original_filename', $original, PDO::PARAM_STR);
        $stmt->bindValue(':stored_filename', $stored, PDO::PARAM_STR);
        $stmt->bindValue(':file_size', $size, PDO::PARAM_INT);
        $stmt->bindValue(':is_private', $isPrivate, PDO::PARAM_INT);
        $stmt->bindValue(':is_active', $isActive, PDO::PARAM_INT);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }

    public function delete(int $id): bool
    {
        $sql = "DELETE FROM {$this->table} WHERE document_id = :id LIMIT 1";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->rowCount() > 0;
    }
}

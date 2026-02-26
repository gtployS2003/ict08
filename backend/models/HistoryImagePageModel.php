<?php
// backend/models/HistoryImagePageModel.php
declare(strict_types=1);

final class HistoryImagePageModel
{
    public function __construct(private PDO $pdo)
    {
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function list(int $page = 1, int $limit = 50): array
    {
        return $this->listWithSearch($page, $limit, '');
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function listWithSearch(int $page = 1, int $limit = 50, string $q = ''): array
    {
        $page = max(1, $page);
        $limit = max(1, min(200, $limit));
        $offset = ($page - 1) * $limit;

        $q = trim($q);
        $where = '';
        $params = [];

        if ($q !== '') {
            $conds = ['path LIKE :q'];
            $params[':q'] = '%' . $q . '%';

            if (ctype_digit($q)) {
                $conds[] = 'history_image_page_id = :id';
                $params[':id'] = (int)$q;
            }

            $where = 'WHERE ' . implode(' OR ', $conds);
        }

        $sql = "SELECT history_image_page_id, path, is_active
                FROM history_image_page
                $where
                ORDER BY is_active DESC, history_image_page_id DESC
                LIMIT :limit OFFSET :offset";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);

        if (isset($params[':q'])) {
            $stmt->bindValue(':q', (string)$params[':q'], PDO::PARAM_STR);
        }
        if (isset($params[':id'])) {
            $stmt->bindValue(':id', (int)$params[':id'], PDO::PARAM_INT);
        }

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function count(): int
    {
        return $this->countWithSearch('');
    }

    public function countWithSearch(string $q = ''): int
    {
        $q = trim($q);

        if ($q === '') {
            $stmt = $this->pdo->query('SELECT COUNT(*) FROM history_image_page');
            $n = $stmt ? $stmt->fetchColumn() : 0;
            return (int)($n ?: 0);
        }

        $conds = ['path LIKE :q'];
        $params = [':q' => '%' . $q . '%'];

        if (ctype_digit($q)) {
            $conds[] = 'history_image_page_id = :id';
            $params[':id'] = (int)$q;
        }

        $sql = 'SELECT COUNT(*) FROM history_image_page WHERE ' . implode(' OR ', $conds);
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':q', (string)$params[':q'], PDO::PARAM_STR);
        if (isset($params[':id'])) {
            $stmt->bindValue(':id', (int)$params[':id'], PDO::PARAM_INT);
        }
        $stmt->execute();
        $n = $stmt->fetchColumn();
        return (int)($n ?: 0);
    }

    /**
     * @return array<string,mixed>|null
     */
    public function find(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT history_image_page_id, path, is_active FROM history_image_page WHERE history_image_page_id = :id');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return is_array($row) ? $row : null;
    }

    /**
     * @return array<string,mixed>|null
     */
    public function getActive(): ?array
    {
        $sql = 'SELECT history_image_page_id, path, is_active
                FROM history_image_page
                WHERE is_active = 1
                ORDER BY history_image_page_id DESC
                LIMIT 1';
        $stmt = $this->pdo->query($sql);
        $row = $stmt ? $stmt->fetch(PDO::FETCH_ASSOC) : false;
        return is_array($row) ? $row : null;
    }

    public function create(string $path, int $isActive = 0): int
    {
        $stmt = $this->pdo->prepare('INSERT INTO history_image_page (path, is_active) VALUES (:path, :is_active)');
        $stmt->execute([
            ':path' => $path,
            ':is_active' => $isActive,
        ]);
        return (int)$this->pdo->lastInsertId();
    }

    public function setActive(int $id): void
    {
        $this->pdo->beginTransaction();
        try {
            $this->pdo->exec('UPDATE history_image_page SET is_active = 0');
            $stmt = $this->pdo->prepare('UPDATE history_image_page SET is_active = 1 WHERE history_image_page_id = :id');
            $stmt->execute([':id' => $id]);
            $this->pdo->commit();
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM history_image_page WHERE history_image_page_id = :id');
        $stmt->execute([':id' => $id]);
        return $stmt->rowCount() > 0;
    }
}

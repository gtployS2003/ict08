<?php
// backend/models/HomeMissionImgModel.php
declare(strict_types=1);

final class HomeMissionImgModel
{
    /** @var string */
    private $table = 'home_mission_img';

    /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
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
                $conds[] = 'home_mission_img_id = :id';
                $params[':id'] = (int) $q;
            }

            $where = 'WHERE ' . implode(' OR ', $conds);
        }

        $sql = "SELECT home_mission_img_id, path
                FROM {$this->table}
                {$where}
                ORDER BY home_mission_img_id DESC
                LIMIT :limit OFFSET :offset";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);

        if (isset($params[':q'])) {
            $stmt->bindValue(':q', (string) $params[':q'], PDO::PARAM_STR);
        }
        if (isset($params[':id'])) {
            $stmt->bindValue(':id', (int) $params[':id'], PDO::PARAM_INT);
        }

        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function countWithSearch(string $q = ''): int
    {
        $q = trim($q);

        if ($q === '') {
            $stmt = $this->pdo->query("SELECT COUNT(*) FROM {$this->table}");
            $n = $stmt ? $stmt->fetchColumn() : 0;
            return (int) ($n ?: 0);
        }

        $conds = ['path LIKE :q'];
        $params = [':q' => '%' . $q . '%'];

        if (ctype_digit($q)) {
            $conds[] = 'home_mission_img_id = :id';
            $params[':id'] = (int) $q;
        }

        $sql = "SELECT COUNT(*) FROM {$this->table} WHERE " . implode(' OR ', $conds);
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':q', (string) $params[':q'], PDO::PARAM_STR);
        if (isset($params[':id'])) {
            $stmt->bindValue(':id', (int) $params[':id'], PDO::PARAM_INT);
        }
        $stmt->execute();
        $n = $stmt->fetchColumn();
        return (int) ($n ?: 0);
    }

    public function countAll(): int
    {
        $stmt = $this->pdo->query("SELECT COUNT(*) FROM {$this->table}");
        $n = $stmt ? $stmt->fetchColumn() : 0;
        return (int) ($n ?: 0);
    }

    /**
     * @return array<string,mixed>|null
     */
    public function find(int $id): ?array
    {
        $stmt = $this->pdo->prepare("SELECT home_mission_img_id, path FROM {$this->table} WHERE home_mission_img_id = :id");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return is_array($row) ? $row : null;
    }

    public function create(string $path): int
    {
        $stmt = $this->pdo->prepare("INSERT INTO {$this->table} (path) VALUES (:path)");
        $stmt->execute([':path' => $path]);
        return (int) $this->pdo->lastInsertId();
    }

    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare("DELETE FROM {$this->table} WHERE home_mission_img_id = :id");
        $stmt->execute([':id' => $id]);
        return $stmt->rowCount() > 0;
    }

    /**
     * Public list: newest 3 images.
     *
     * @return array<int,array<string,mixed>>
     */
    public function listPublic(int $limit = 3): array
    {
        $limit = max(1, min(3, $limit));

        $sql = "SELECT home_mission_img_id, path
                FROM {$this->table}
                ORDER BY home_mission_img_id DESC
                LIMIT :limit";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }
}

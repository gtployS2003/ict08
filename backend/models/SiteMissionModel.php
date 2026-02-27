<?php
// backend/models/SiteMissionModel.php
declare(strict_types=1);

final class SiteMissionModel
{
    public function __construct(private PDO $pdo)
    {
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

        // MySQL native prepared statements don't allow reusing named placeholders.
        if ($q !== '') {
            $like = '%' . $q . '%';
            $conds = [
                'm.title LIKE :q1',
                'm.discription LIKE :q2',
                'm.img_path LIKE :q3',
            ];
            $params[':q1'] = $like;
            $params[':q2'] = $like;
            $params[':q3'] = $like;

            if (ctype_digit($q)) {
                $conds[] = 'm.site_mission_id = :id';
                $params[':id'] = (int)$q;
            }

            $where = 'WHERE ' . implode(' OR ', $conds);
        }

        $sql = "
            SELECT
                m.site_mission_id,
                m.title,
                m.discription,
                m.img_path,
                m.sort_order
            FROM site_mission m
            {$where}
            ORDER BY m.sort_order IS NULL, m.sort_order ASC, m.site_mission_id ASC
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);

        foreach ([':q1', ':q2', ':q3'] as $k) {
            if (isset($params[$k])) {
                $stmt->bindValue($k, (string)$params[$k], PDO::PARAM_STR);
            }
        }
        if (isset($params[':id'])) {
            $stmt->bindValue(':id', (int)$params[':id'], PDO::PARAM_INT);
        }

        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function countWithSearch(string $q = ''): int
    {
        $q = trim($q);
        if ($q === '') {
            $stmt = $this->pdo->query('SELECT COUNT(*) FROM site_mission');
            $n = $stmt ? $stmt->fetchColumn() : 0;
            return (int)($n ?: 0);
        }

        $like = '%' . $q . '%';
        $conds = [
            'm.title LIKE :q1',
            'm.discription LIKE :q2',
            'm.img_path LIKE :q3',
        ];

        $params = [
            ':q1' => $like,
            ':q2' => $like,
            ':q3' => $like,
        ];

        if (ctype_digit($q)) {
            $conds[] = 'm.site_mission_id = :id';
            $params[':id'] = (int)$q;
        }

        $sql = 'SELECT COUNT(*) FROM site_mission m WHERE ' . implode(' OR ', $conds);

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':q1', (string)$params[':q1'], PDO::PARAM_STR);
        $stmt->bindValue(':q2', (string)$params[':q2'], PDO::PARAM_STR);
        $stmt->bindValue(':q3', (string)$params[':q3'], PDO::PARAM_STR);
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
        $stmt = $this->pdo->prepare('SELECT site_mission_id, title, discription, img_path, sort_order FROM site_mission WHERE site_mission_id = :id');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return is_array($row) ? $row : null;
    }

    /**
     * Raw row for update/delete.
     * @return array<string,mixed>|null
     */
    public function findRaw(int $id): ?array
    {
        return $this->find($id);
    }

    public function nextSortOrder(): int
    {
        $stmt = $this->pdo->query('SELECT COALESCE(MAX(sort_order), 0) AS mx FROM site_mission');
        $mx = $stmt ? (int)($stmt->fetchColumn() ?: 0) : 0;
        return $mx + 1;
    }

    public function create(string $title, string $discription, ?string $imgPath, int $sortOrder): int
    {
        $stmt = $this->pdo->prepare('INSERT INTO site_mission (title, discription, img_path, sort_order) VALUES (:title, :discription, :img_path, :sort_order)');
        $stmt->execute([
            ':title' => $title,
            ':discription' => $discription,
            ':img_path' => $imgPath,
            ':sort_order' => $sortOrder,
        ]);
        return (int)$this->pdo->lastInsertId();
    }

    public function update(int $id, string $title, string $discription, ?string $imgPath, ?int $sortOrder): bool
    {
        $stmt = $this->pdo->prepare('UPDATE site_mission SET title = :title, discription = :discription, img_path = :img_path, sort_order = :sort_order WHERE site_mission_id = :id');
        $stmt->execute([
            ':title' => $title,
            ':discription' => $discription,
            ':img_path' => $imgPath,
            ':sort_order' => $sortOrder,
            ':id' => $id,
        ]);
        return $stmt->rowCount() > 0;
    }

    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM site_mission WHERE site_mission_id = :id');
        $stmt->execute([':id' => $id]);
        return $stmt->rowCount() > 0;
    }

    /**
     * Reorder by the given ordered list of IDs. sort_order becomes 1..N.
     * @param array<int,int> $ids
     */
    public function reorder(array $ids): void
    {
        $ids = array_values(array_filter(array_map('intval', $ids), fn($x) => $x > 0));
        if (!$ids) {
            return;
        }

        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare('UPDATE site_mission SET sort_order = ? WHERE site_mission_id = ?');
            $i = 1;
            foreach ($ids as $id) {
                $stmt->execute([$i, $id]);
                $i++;
            }
            $this->pdo->commit();
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
}

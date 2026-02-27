<?php
// backend/models/SiteDiractorModel.php
declare(strict_types=1);

final class SiteDiractorModel
{
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
            $conds = [
                'firstname LIKE :q',
                'lastname LIKE :q',
                "CONCAT(firstname, ' ', lastname) LIKE :q",
                'photo_path LIKE :q',
            ];
            $params[':q'] = '%' . $q . '%';

            if (ctype_digit($q)) {
                $conds[] = 'diractor_id = :id';
                $params[':id'] = (int)$q;
            }

            $where = 'WHERE ' . implode(' OR ', $conds);
        }

        $sql = "SELECT diractor_id, firstname, lastname, photo_path, start, end
                FROM site_diractor
                $where
                ORDER BY start IS NULL, start ASC, diractor_id ASC
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

    public function countWithSearch(string $q = ''): int
    {
        $q = trim($q);
        if ($q === '') {
            $stmt = $this->pdo->query('SELECT COUNT(*) FROM site_diractor');
            $n = $stmt ? $stmt->fetchColumn() : 0;
            return (int)($n ?: 0);
        }

        $conds = [
            'firstname LIKE :q',
            'lastname LIKE :q',
            "CONCAT(firstname, ' ', lastname) LIKE :q",
            'photo_path LIKE :q',
        ];
        $params = [':q' => '%' . $q . '%'];

        if (ctype_digit($q)) {
            $conds[] = 'diractor_id = :id';
            $params[':id'] = (int)$q;
        }

        $sql = 'SELECT COUNT(*) FROM site_diractor WHERE ' . implode(' OR ', $conds);
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
        $stmt = $this->pdo->prepare('SELECT diractor_id, firstname, lastname, photo_path, start, end FROM site_diractor WHERE diractor_id = :id');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return is_array($row) ? $row : null;
    }

    public function create(string $firstname, string $lastname, ?string $photoPath, string $start, ?string $end): int
    {
        $stmt = $this->pdo->prepare('INSERT INTO site_diractor (firstname, lastname, photo_path, start, end) VALUES (:firstname, :lastname, :photo_path, :start, :end)');
        $stmt->execute([
            ':firstname' => $firstname,
            ':lastname' => $lastname,
            ':photo_path' => $photoPath,
            ':start' => $start,
            ':end' => $end,
        ]);
        return (int)$this->pdo->lastInsertId();
    }

    public function update(int $id, string $firstname, string $lastname, ?string $photoPath, string $start, ?string $end): bool
    {
        $stmt = $this->pdo->prepare('UPDATE site_diractor SET firstname = :firstname, lastname = :lastname, photo_path = :photo_path, start = :start, end = :end WHERE diractor_id = :id');
        $stmt->execute([
            ':firstname' => $firstname,
            ':lastname' => $lastname,
            ':photo_path' => $photoPath,
            ':start' => $start,
            ':end' => $end,
            ':id' => $id,
        ]);
        return $stmt->rowCount() > 0;
    }

    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM site_diractor WHERE diractor_id = :id');
        $stmt->execute([':id' => $id]);
        return $stmt->rowCount() > 0;
    }
}

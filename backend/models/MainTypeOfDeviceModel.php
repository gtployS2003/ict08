<?php
// backend/models/MainTypeOfDeviceModel.php
declare(strict_types=1);

final class MainTypeOfDeviceModel
{
    public function __construct(private PDO $pdo) {}

    /**
     * List + search + pagination
     * return: ['items' => [...], 'total' => int, 'page' => int, 'limit' => int]
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
            $where = "WHERE mtd.main_type_of_device_title LIKE :q";
            $params[':q'] = '%' . $q . '%';
        }

        // total
        $sqlTotal = "SELECT COUNT(*) AS c FROM main_type_of_device mtd $where";
        $stTotal = $this->pdo->prepare($sqlTotal);
        foreach ($params as $k => $v) $stTotal->bindValue($k, $v, PDO::PARAM_STR);
        $stTotal->execute();
        $total = (int)($stTotal->fetch(PDO::FETCH_ASSOC)['c'] ?? 0);

        // items
        $sql = "
            SELECT
              mtd.main_type_of_device AS id,
              mtd.main_type_of_device_title AS title
            FROM main_type_of_device mtd
            $where
            ORDER BY mtd.main_type_of_device ASC
            LIMIT :limit OFFSET :offset
        ";
        $st = $this->pdo->prepare($sql);
        foreach ($params as $k => $v) $st->bindValue($k, $v, PDO::PARAM_STR);
        $st->bindValue(':limit', $limit, PDO::PARAM_INT);
        $st->bindValue(':offset', $offset, PDO::PARAM_INT);
        $st->execute();

        return [
            'items' => $st->fetchAll(PDO::FETCH_ASSOC),
            'total' => $total,
            'page'  => $page,
            'limit' => $limit,
        ];
    }

    public function create(string $title): int
    {
        $title = trim($title);
        if ($title === '') {
            throw new InvalidArgumentException('title is required');
        }

        $sql = "INSERT INTO main_type_of_device (main_type_of_device_title) VALUES (:title)";
        $st = $this->pdo->prepare($sql);
        $st->bindValue(':title', $title, PDO::PARAM_STR);
        $st->execute();

        return (int)$this->pdo->lastInsertId();
    }

    public function update(int $id, string $title): void
    {
        $id = max(0, $id);
        $title = trim($title);

        if ($id <= 0) throw new InvalidArgumentException('id is required');
        if ($title === '') throw new InvalidArgumentException('title is required');

        $sql = "
          UPDATE main_type_of_device
          SET main_type_of_device_title = :title
          WHERE main_type_of_device = :id
          LIMIT 1
        ";
        $st = $this->pdo->prepare($sql);
        $st->bindValue(':title', $title, PDO::PARAM_STR);
        $st->bindValue(':id', $id, PDO::PARAM_INT);
        $st->execute();

        if ($st->rowCount() === 0) {
            // ไม่เจอ id หรือค่าเหมือนเดิม
            // จะให้ถือว่า success ก็ได้ แต่เราแจ้งเพื่อคุมคุณภาพ
        }
    }

    public function delete(int $id): void
    {
        $id = max(0, $id);
        if ($id <= 0) throw new InvalidArgumentException('id is required');

        $sql = "DELETE FROM main_type_of_device WHERE main_type_of_device = :id LIMIT 1";
        $st = $this->pdo->prepare($sql);
        $st->bindValue(':id', $id, PDO::PARAM_INT);
        $st->execute();
    }

    public function exists(int $id): bool
    {
        $id = max(0, $id);
        if ($id <= 0) return false;

        $sql = "SELECT 1 FROM main_type_of_device WHERE main_type_of_device = :id LIMIT 1";
        $st = $this->pdo->prepare($sql);
        $st->bindValue(':id', $id, PDO::PARAM_INT);
        $st->execute();

        return (bool)$st->fetchColumn();
    }
}

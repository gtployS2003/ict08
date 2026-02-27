<?php
// backend/models/TypeOfDeviceModel.php
declare(strict_types=1);

final class TypeOfDeviceModel
{
    /** @var string */
    private $table = 'type_of_device';

    /** @var PDO */
    private $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?: db();
    }

    /**
     * List with search + pagination
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
            $where = "WHERE (
                t.type_of_device_title LIKE :q1
                OR CAST(t.type_of_device_id AS CHAR) LIKE :q2
            )";
            $like = '%' . $q . '%';
            $params[':q1'] = $like;
            $params[':q2'] = $like;
        }

        $sql = "
            SELECT
                t.type_of_device_id,
                t.type_of_device_title,
                t.has_network,
                t.icon_path_online,
                t.icon_path_offline
            FROM {$this->table} t
            {$where}
            ORDER BY t.type_of_device_id ASC
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $this->pdo->prepare($sql);

        // bind search params
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v, PDO::PARAM_STR);
        }

        // bind pagination params (must be int)
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
            $where = "WHERE (
                t.type_of_device_title LIKE :q1
                OR CAST(t.type_of_device_id AS CHAR) LIKE :q2
            )";
            $like = '%' . $q . '%';
            $params[':q1'] = $like;
            $params[':q2'] = $like;
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
     * Find by id
     * @return array<string,mixed>|null
     */
    public function find(int $id): ?array
    {
        $sql = "
            SELECT
                t.type_of_device_id,
                t.type_of_device_title,
                t.has_network,
                t.icon_path_online,
                t.icon_path_offline
            FROM {$this->table} t
            WHERE t.type_of_device_id = :id
            LIMIT 1
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row !== false ? $row : null;
    }

    /**
     * Create
     * @param array<string,mixed> $data
     * @return int inserted id
     */
    public function create(array $data): int
    {
        $title = trim((string) ($data['type_of_device_title'] ?? ''));
        $hasNetwork = (int) ($data['has_network'] ?? 0);
        $iconOnline = (string) ($data['icon_path_online'] ?? '');
        $iconOffline = (string) ($data['icon_path_offline'] ?? '');

        $hasNetwork = ($hasNetwork === 1) ? 1 : 0;

        $sql = "
            INSERT INTO {$this->table} (
                type_of_device_title,
                has_network,
                icon_path_online,
                icon_path_offline
            ) VALUES (
                :title,
                :has_network,
                :icon_online,
                :icon_offline
            )
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':title', $title, PDO::PARAM_STR);
        $stmt->bindValue(':has_network', $hasNetwork, PDO::PARAM_INT);
        $stmt->bindValue(':icon_online', $iconOnline, PDO::PARAM_STR);
        $stmt->bindValue(':icon_offline', $iconOffline, PDO::PARAM_STR);

        $stmt->execute();
        return (int) $this->pdo->lastInsertId();
    }

    /**
     * Update
     * @param array<string,mixed> $data
     */
    public function update(int $id, array $data): bool
    {
        $title = trim((string) ($data['type_of_device_title'] ?? ''));
        $hasNetwork = (int) ($data['has_network'] ?? 0);
        $iconOnline = (string) ($data['icon_path_online'] ?? '');
        $iconOffline = (string) ($data['icon_path_offline'] ?? '');

        $hasNetwork = ($hasNetwork === 1) ? 1 : 0;

        $sql = "
            UPDATE {$this->table}
            SET
                type_of_device_title = :title,
                has_network = :has_network,
                icon_path_online = :icon_online,
                icon_path_offline = :icon_offline
            WHERE type_of_device_id = :id
            LIMIT 1
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':title', $title, PDO::PARAM_STR);
        $stmt->bindValue(':has_network', $hasNetwork, PDO::PARAM_INT);
        $stmt->bindValue(':icon_online', $iconOnline, PDO::PARAM_STR);
        $stmt->bindValue(':icon_offline', $iconOffline, PDO::PARAM_STR);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);

        $stmt->execute();
        return $stmt->rowCount() > 0;
    }

    public function delete(int $id): bool
    {
        $sql = "DELETE FROM {$this->table} WHERE type_of_device_id = :id LIMIT 1";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }
}

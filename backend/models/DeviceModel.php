<?php
// backend/models/DeviceModel.php
declare(strict_types=1);

final class DeviceModel
{
    public function __construct(private PDO $pdo) {}

    /**
     * Map devices (no pagination):
     * - include coordinates from contact_info (map_lat/map_lng)
     * - include icon path from type_of_device (icon_path_online/offline)
     * - support filters/search and is_online
     */
    public function listDevicesForMap(
        string $q = '',
        ?int $provinceId = null,
        ?int $organizationId = null,
        ?int $mainTypeId = null,
        ?int $typeId = null,
        ?int $isOnline = null,
        int $limit = 5000
    ): array
    {
        $q = trim($q);
        $limit = max(1, min(5000, $limit));

        $where = [];
        $params = [];

        if ($q !== '') {
            $where[] = "("
                . "d.device_name LIKE :q1 OR d.ip LIKE :q2 OR "
                . "org.name LIKE :q3 OR p.nameTH LIKE :q4 OR p.nameEN LIKE :q5 OR "
                . "mtd.main_type_of_device_title LIKE :q6 OR tod.type_of_device_title LIKE :q7"
                . ")";
            $like = '%' . $q . '%';
            $params[':q1'] = $like;
            $params[':q2'] = $like;
            $params[':q3'] = $like;
            $params[':q4'] = $like;
            $params[':q5'] = $like;
            $params[':q6'] = $like;
            $params[':q7'] = $like;
        }

        if ($provinceId !== null && $provinceId > 0) {
            $where[] = "org.province_id = :province_id";
            $params[':province_id'] = $provinceId;
        }

        if ($organizationId !== null && $organizationId > 0) {
            $where[] = "org.organization_id = :organization_id";
            $params[':organization_id'] = $organizationId;
        }

        if ($mainTypeId !== null && $mainTypeId > 0) {
            $where[] = "d.main_type_of_device_id = :main_type_of_device_id";
            $params[':main_type_of_device_id'] = $mainTypeId;
        }

        if ($typeId !== null && $typeId > 0) {
            $where[] = "d.type_of_device_id = :type_of_device_id";
            $params[':type_of_device_id'] = $typeId;
        }

        if ($isOnline !== null) {
            $where[] = "d.is_online = :is_online";
            $params[':is_online'] = $isOnline;
        }

        $whereSql = '';
        if (!empty($where)) {
            $whereSql = "WHERE " . implode(" AND ", $where);
        }

        $sql = "
            SELECT
                d.device_id,
                d.device_name,
                d.main_type_of_device_id,
                mtd.main_type_of_device_title,
                d.type_of_device_id,
                tod.type_of_device_title,
                tod.icon_path_online,
                tod.icon_path_offline,
                d.ip,
                d.detail,
                d.contact_info_id,
                ci.map_lat,
                ci.map_lng,
                org.organization_id,
                org.name AS organization_name,
                org.province_id,
                p.nameTH AS province_name_th,
                p.nameEN AS province_name_en,
                d.is_online
            FROM device d
            LEFT JOIN main_type_of_device mtd ON mtd.main_type_of_device = d.main_type_of_device_id
            LEFT JOIN type_of_device tod ON tod.type_of_device_id = d.type_of_device_id
            LEFT JOIN contact_info ci ON ci.contact_info_id = d.contact_info_id
            LEFT JOIN organization org ON org.organization_id = ci.organization_id
            LEFT JOIN province p ON p.province_id = org.province_id
            $whereSql
            ORDER BY d.device_id ASC
            LIMIT :limit
        ";

        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $k => $v) $stmt->bindValue($k, $v);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * List devices with:
     * - search (q) : match device_name, ip, org name, province
     * - filter province_id
     * - pagination page/limit
     *
     * Return:
     * [
     *   "items" => [...],
     *   "total" => int,
     *   "page" => int,
     *   "limit" => int
     * ]
     */
    public function listDevices(
        string $q = '',
        int $page = 1,
        int $limit = 50,
        ?int $provinceId = null,
        ?int $organizationId = null,
        ?int $mainTypeId = null,
        ?int $typeId = null
    ): array
    {
        $page = max(1, $page);
        $limit = max(1, min(200, $limit));
        $offset = ($page - 1) * $limit;

        $q = trim($q);

        $where = [];
        $params = [];

        if ($q !== '') {
            $where[] = "("
                . "d.device_name LIKE :q1 OR d.ip LIKE :q2 OR "
                . "org.name LIKE :q3 OR p.nameTH LIKE :q4 OR p.nameEN LIKE :q5 OR "
                . "mtd.main_type_of_device_title LIKE :q6 OR tod.type_of_device_title LIKE :q7"
                . ")";
            $like = '%' . $q . '%';
            $params[':q1'] = $like;
            $params[':q2'] = $like;
            $params[':q3'] = $like;
            $params[':q4'] = $like;
            $params[':q5'] = $like;
            $params[':q6'] = $like;
            $params[':q7'] = $like;
        }

        if ($provinceId !== null && $provinceId > 0) {
            $where[] = "org.province_id = :province_id";
            $params[':province_id'] = $provinceId;
        }

        if ($organizationId !== null && $organizationId > 0) {
            $where[] = "org.organization_id = :organization_id";
            $params[':organization_id'] = $organizationId;
        }

        if ($mainTypeId !== null && $mainTypeId > 0) {
            $where[] = "d.main_type_of_device_id = :main_type_of_device_id";
            $params[':main_type_of_device_id'] = $mainTypeId;
        }

        if ($typeId !== null && $typeId > 0) {
            $where[] = "d.type_of_device_id = :type_of_device_id";
            $params[':type_of_device_id'] = $typeId;
        }

        $whereSql = '';
        if (!empty($where)) {
            $whereSql = "WHERE " . implode(" AND ", $where);
        }

        // count total
        $countSql = "
            SELECT COUNT(*) AS c
            FROM device d
            LEFT JOIN main_type_of_device mtd ON mtd.main_type_of_device = d.main_type_of_device_id
            LEFT JOIN type_of_device tod ON tod.type_of_device_id = d.type_of_device_id
            LEFT JOIN contact_info ci ON ci.contact_info_id = d.contact_info_id
            LEFT JOIN organization org ON org.organization_id = ci.organization_id
            LEFT JOIN province p ON p.province_id = org.province_id
            $whereSql
        ";
        $stmt = $this->pdo->prepare($countSql);
        foreach ($params as $k => $v) $stmt->bindValue($k, $v);
        $stmt->execute();
        $total = (int)($stmt->fetch(PDO::FETCH_ASSOC)['c'] ?? 0);

        // list items
        $sql = "
            SELECT
                d.device_id,
                d.device_name,
                d.main_type_of_device_id,
                mtd.main_type_of_device_title,
                d.type_of_device_id,
                tod.type_of_device_title,
                d.ip,
                d.detail,
                d.contact_info_id,
                org.organization_id,
                org.name AS organization_name,
                org.province_id,
                p.nameTH AS province_name_th,
                p.nameEN AS province_name_en,
                d.is_online
            FROM device d
            LEFT JOIN main_type_of_device mtd ON mtd.main_type_of_device = d.main_type_of_device_id
            LEFT JOIN type_of_device tod ON tod.type_of_device_id = d.type_of_device_id
            LEFT JOIN contact_info ci ON ci.contact_info_id = d.contact_info_id
            LEFT JOIN organization org ON org.organization_id = ci.organization_id
            LEFT JOIN province p ON p.province_id = org.province_id
            $whereSql
            ORDER BY d.device_id ASC
            LIMIT :limit OFFSET :offset
        ";
        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $k => $v) $stmt->bindValue($k, $v);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'items' => $items,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
        ];
    }

    public function getById(int $id): ?array
    {
        $sql = "
            SELECT
                d.device_id,
                d.device_name,
                d.main_type_of_device_id,
                d.type_of_device_id,
                d.ip,
                d.contact_info_id,
                d.detail,
                d.is_online
            FROM device d
            WHERE d.device_id = :id
            LIMIT 1
        ";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function create(array $data): int
    {
        $sql = "
            INSERT INTO device
                (device_name, main_type_of_device_id, type_of_device_id, ip, contact_info_id, detail, is_online)
            VALUES
                (:device_name, :main_type_of_device_id, :type_of_device_id, :ip, :contact_info_id, :detail, :is_online)
        ";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':device_name', (string)($data['device_name'] ?? ''));
        $stmt->bindValue(':main_type_of_device_id', (int)($data['main_type_of_device_id'] ?? 0), PDO::PARAM_INT);
        $stmt->bindValue(':type_of_device_id', (int)($data['type_of_device_id'] ?? 0), PDO::PARAM_INT);

        $ip = trim((string)($data['ip'] ?? ''));
        $stmt->bindValue(':ip', $ip === '' ? null : $ip, $ip === '' ? PDO::PARAM_NULL : PDO::PARAM_STR);

        $stmt->bindValue(':contact_info_id', (int)($data['contact_info_id'] ?? 0), PDO::PARAM_INT);

        $detail = (string)($data['detail'] ?? '');
        $stmt->bindValue(':detail', $detail === '' ? null : $detail, $detail === '' ? PDO::PARAM_NULL : PDO::PARAM_STR);

        $isOnline = isset($data['is_online']) ? (int)$data['is_online'] : 0;
        $stmt->bindValue(':is_online', $isOnline, PDO::PARAM_INT);

        $stmt->execute();
        return (int)$this->pdo->lastInsertId();
    }

    public function update(int $id, array $data): bool
    {
        $sql = "
            UPDATE device
            SET
                device_name = :device_name,
                main_type_of_device_id = :main_type_of_device_id,
                type_of_device_id = :type_of_device_id,
                ip = :ip,
                contact_info_id = :contact_info_id,
                detail = :detail
            WHERE device_id = :id
            LIMIT 1
        ";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->bindValue(':device_name', (string)($data['device_name'] ?? ''));
        $stmt->bindValue(':main_type_of_device_id', (int)($data['main_type_of_device_id'] ?? 0), PDO::PARAM_INT);
        $stmt->bindValue(':type_of_device_id', (int)($data['type_of_device_id'] ?? 0), PDO::PARAM_INT);

        $ip = trim((string)($data['ip'] ?? ''));
        $stmt->bindValue(':ip', $ip === '' ? null : $ip, $ip === '' ? PDO::PARAM_NULL : PDO::PARAM_STR);

        $stmt->bindValue(':contact_info_id', (int)($data['contact_info_id'] ?? 0), PDO::PARAM_INT);

        $detail = (string)($data['detail'] ?? '');
        $stmt->bindValue(':detail', $detail === '' ? null : $detail, $detail === '' ? PDO::PARAM_NULL : PDO::PARAM_STR);

        $stmt->execute();
        return $stmt->rowCount() > 0;
    }

    public function delete(int $id): bool
    {
        $sql = "DELETE FROM device WHERE device_id = :id LIMIT 1";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->rowCount() > 0;
    }
}

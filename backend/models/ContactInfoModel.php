<?php
// backend/models/ContactInfoModel.php
declare(strict_types=1);

final class ContactInfoModel
{
    /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /* =========================
       LIST (JOIN) + SEARCH + PAGINATION
       ========================= */

    /**
     * @return array{items: array<int,array<string,mixed>>, total:int, page:int, limit:int}
     */
    public function list(string $q = '', int $page = 1, int $limit = 50): array
    {
        $page  = max(1, $page);
        $limit = max(1, min(200, $limit));
        $offset = ($page - 1) * $limit;

        $q = trim($q);
        $where = '';
        $params = [];

        if ($q !== '') {
            // search ทั้งข้อมูลติดต่อ + ข้อมูลองค์กร + จังหวัด
            $where = "WHERE (
                o.name LIKE :q1
                OR o.code LIKE :q2
                OR o.location LIKE :q3
                OR p.nameTH LIKE :q4
                OR p.nameEN LIKE :q5
                OR ci.phone_number LIKE :q6
                OR ci.email LIKE :q7
                OR ci.line_id LIKE :q8
            )";
            $like = '%' . $q . '%';
            $params = [
                ':q1' => $like,
                ':q2' => $like,
                ':q3' => $like,
                ':q4' => $like,
                ':q5' => $like,
                ':q6' => $like,
                ':q7' => $like,
                ':q8' => $like,
            ];
        }

        // total
        $sqlTotal = "
            SELECT COUNT(*) AS cnt
            FROM contact_info ci
            INNER JOIN organization o ON ci.organization_id = o.organization_id
            INNER JOIN province p ON o.province_id = p.province_id
            $where
        ";
        $stmtT = $this->pdo->prepare($sqlTotal);
        $stmtT->execute($params);
        $total = (int)($stmtT->fetch(PDO::FETCH_ASSOC)['cnt'] ?? 0);

        // items
        $sql = "
            SELECT
                ci.contact_info_id,
                ci.organization_id,

                o.code AS organization_code,
                o.name AS organization_name,
                o.location AS organization_location,
                o.province_id,

                p.nameTH AS province_nameTH,
                p.nameEN AS province_nameEN,

                ci.phone_number,
                ci.fax,
                ci.fax_extension,
                ci.email,
                ci.facebook_name,
                ci.facebook_url,
                ci.line_id,
                ci.line_url,
                ci.map_embed_url,
                ci.map_lat,
                ci.map_lng,
                ci.create_at
            FROM contact_info ci
            INNER JOIN organization o ON ci.organization_id = o.organization_id
            INNER JOIN province p ON o.province_id = p.province_id
            $where
            ORDER BY ci.contact_info_id DESC
            LIMIT :limit OFFSET :offset
        ";
        $stmt = $this->pdo->prepare($sql);

        // bind search params
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v, PDO::PARAM_STR);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);

        $stmt->execute();
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        return [
            'items' => $items,
            'total' => $total,
            'page'  => $page,
            'limit' => $limit,
        ];
    }

    /* =========================
       GET ONE (JOIN)
       ========================= */

    /**
     * @return array<string,mixed>|null
     */
    public function get(int $id): ?array
    {
        $sql = "
            SELECT
                ci.contact_info_id,
                ci.organization_id,

                o.code AS organization_code,
                o.name AS organization_name,
                o.location AS organization_location,
                o.province_id,

                p.nameTH AS province_nameTH,
                p.nameEN AS province_nameEN,

                ci.phone_number,
                ci.fax,
                ci.fax_extension,
                ci.email,
                ci.facebook_name,
                ci.facebook_url,
                ci.line_id,
                ci.line_url,
                ci.map_embed_url,
                ci.map_lat,
                ci.map_lng,
                ci.create_at
            FROM contact_info ci
            INNER JOIN organization o ON ci.organization_id = o.organization_id
            INNER JOIN province p ON o.province_id = p.province_id
            WHERE ci.contact_info_id = :id
            LIMIT 1
        ";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    /* =========================
       CREATE
       ========================= */

    /**
     * @param array<string,mixed> $data
     * @return int new id
     */
    public function create(array $data): int
    {
        $orgId = (int)($data['organization_id'] ?? 0);
        if ($orgId <= 0) {
            throw new InvalidArgumentException('organization_id is required');
        }

        // บังคับ 1 หน่วยงานมี 1 contact_info (ถ้าคุณต้องการ)
        if ($this->existsByOrganization($orgId)) {
            throw new RuntimeException('Contact info for this organization already exists');
        }

        $sql = "
            INSERT INTO contact_info (
                organization_id,
                phone_number, fax, fax_extension, email,
                facebook_name, facebook_url,
                line_id, line_url,
                map_embed_url, map_lat, map_lng,
                create_at
            ) VALUES (
                :organization_id,
                :phone_number, :fax, :fax_extension, :email,
                :facebook_name, :facebook_url,
                :line_id, :line_url,
                :map_embed_url, :map_lat, :map_lng,
                NOW()
            )
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':organization_id' => $orgId,
            ':phone_number'    => $this->nullableStr($data['phone_number'] ?? null),
            ':fax'             => $this->nullableStr($data['fax'] ?? null),
            ':fax_extension'   => $this->nullableStr($data['fax_extension'] ?? null),
            ':email'           => $this->nullableStr($data['email'] ?? null),
            ':facebook_name'   => $this->nullableStr($data['facebook_name'] ?? null),
            ':facebook_url'    => $this->nullableStr($data['facebook_url'] ?? null),
            ':line_id'         => $this->nullableStr($data['line_id'] ?? null),
            ':line_url'        => $this->nullableStr($data['line_url'] ?? null),
            ':map_embed_url'   => $this->nullableStr($data['map_embed_url'] ?? null),
            ':map_lat'         => $this->nullableStr($data['map_lat'] ?? null),
            ':map_lng'         => $this->nullableStr($data['map_lng'] ?? null),
        ]);

        return (int)$this->pdo->lastInsertId();
    }

    /* =========================
       UPDATE
       ========================= */

    /**
     * @param array<string,mixed> $data
     */
    public function update(int $id, array $data): bool
    {
        // กันแก้ id ผิด
        if ($id <= 0) {
            throw new InvalidArgumentException('Invalid id');
        }

        // อนุญาตให้แก้ org ได้ไหม? (ปกติไม่ควร)
        $sql = "
            UPDATE contact_info
            SET
                phone_number = :phone_number,
                fax = :fax,
                fax_extension = :fax_extension,
                email = :email,
                facebook_name = :facebook_name,
                facebook_url = :facebook_url,
                line_id = :line_id,
                line_url = :line_url,
                map_embed_url = :map_embed_url,
                map_lat = :map_lat,
                map_lng = :map_lng
            WHERE contact_info_id = :id
            LIMIT 1
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':id'             => $id,
            ':phone_number'   => $this->nullableStr($data['phone_number'] ?? null),
            ':fax'            => $this->nullableStr($data['fax'] ?? null),
            ':fax_extension'  => $this->nullableStr($data['fax_extension'] ?? null),
            ':email'          => $this->nullableStr($data['email'] ?? null),
            ':facebook_name'  => $this->nullableStr($data['facebook_name'] ?? null),
            ':facebook_url'   => $this->nullableStr($data['facebook_url'] ?? null),
            ':line_id'        => $this->nullableStr($data['line_id'] ?? null),
            ':line_url'       => $this->nullableStr($data['line_url'] ?? null),
            ':map_embed_url'  => $this->nullableStr($data['map_embed_url'] ?? null),
            ':map_lat'        => $this->nullableStr($data['map_lat'] ?? null),
            ':map_lng'        => $this->nullableStr($data['map_lng'] ?? null),
        ]);

        return $stmt->rowCount() > 0;
    }

    /* =========================
       DELETE
       ========================= */

    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare("DELETE FROM contact_info WHERE contact_info_id = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        return $stmt->rowCount() > 0;
    }

    /* =========================
       HELPERS
       ========================= */

    private function existsByOrganization(int $organizationId): bool
    {
        $stmt = $this->pdo->prepare("
            SELECT 1
            FROM contact_info
            WHERE organization_id = :orgId
            LIMIT 1
        ");
        $stmt->execute([':orgId' => $organizationId]);
        return (bool)$stmt->fetchColumn();
    }

    private function nullableStr(mixed $v): ?string
    {
        if ($v === null) return null;
        $s = trim((string)$v);
        return $s === '' ? null : $s;
    }

        /* =========================
           DROPDOWN (JOIN organization + province)
           - คืน: contact_info_id, organization_id, organization_name, province_id, province_name
           ========================= */

    /**
     * @return array<int, array{
    *   contact_info_id:int,
    *   organization_id:int,
     *   organization_name:string,
     *   province_id:int,
     *   province_name:string
     * }>
     */
    public function dropdown(string $q = ''): array
    {
        $q = trim($q);
        $where = '';
        $params = [];

        if ($q !== '') {
            // search ได้ทั้งชื่อหน่วยงาน/รหัส/จังหวัด
            $where = "WHERE (
                o.name LIKE :q1
                OR o.code LIKE :q2
                OR p.nameTH LIKE :q3
                OR p.nameEN LIKE :q4
            )";
            $like = '%' . $q . '%';
            $params = [
                ':q1' => $like,
                ':q2' => $like,
                ':q3' => $like,
                ':q4' => $like,
            ];
        }

        $sql = "
            SELECT
                ci.contact_info_id,
                ci.organization_id,
                o.name AS organization_name,
                o.province_id,
                -- เลือกใช้ TH ก่อน ถ้าไม่มีค่อยใช้ EN
                COALESCE(NULLIF(p.nameTH, ''), p.nameEN) AS province_name
            FROM contact_info ci
            INNER JOIN organization o ON ci.organization_id = o.organization_id
            INNER JOIN province p ON o.province_id = p.province_id
            $where
            ORDER BY province_name ASC, organization_name ASC
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

}



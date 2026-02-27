<?php
// backend/models/SiteStructureModel.php
declare(strict_types=1);

final class SiteStructureModel
{
    public function __construct(private PDO $pdo)
    {
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function listWithSearch(int $page = 1, int $limit = 50, string $q = '', int $organizationId = 7): array
    {
        $page = max(1, $page);
        $limit = max(1, min(200, $limit));
        $offset = ($page - 1) * $limit;

        $q = trim($q);
        $where = '';
        $params = [];

        // NOTE: MySQL native prepared statements (ATTR_EMULATE_PREPARES=false)
        // do NOT allow reusing the same named placeholder multiple times.
        // Therefore we generate unique placeholders for each LIKE condition.
        if ($q !== '') {
            $like = '%' . $q . '%';
            $conds = [
                'pp.prefix_th LIKE :q1',
                's.fristname LIKE :q2',
                's.lastname LIKE :q3',
                "CONCAT(pp.prefix_th, s.fristname, ' ', s.lastname) LIKE :q4",
                'd.department_title LIKE :q5',
                'pt.position_title LIKE :q6',
                's.pic_path LIKE :q7',
            ];
            $params[':q1'] = $like;
            $params[':q2'] = $like;
            $params[':q3'] = $like;
            $params[':q4'] = $like;
            $params[':q5'] = $like;
            $params[':q6'] = $like;
            $params[':q7'] = $like;

            if (ctype_digit($q)) {
                $conds[] = 's.site_structure = :id';
                $params[':id'] = (int)$q;
            }

            $where = 'WHERE ' . implode(' OR ', $conds);
        }

        $sql = "
            SELECT
                s.site_structure AS structure_id,
                s.prefix_person_id,
                pp.prefix_th,
                s.fristname,
                s.lastname,
                s.department_id,
                d.department_title,
                s.position_id,
                pt.position_title,
                s.pic_path,
                s.created_at
            FROM site_structure s
            INNER JOIN person_prefix pp
                ON pp.person_prefix_id = s.prefix_person_id
            LEFT JOIN department d
                ON d.department_id = s.department_id
               AND d.organization_id = :orgIdDept
            INNER JOIN position_title pt
                ON pt.position_title_id = s.position_id
               AND pt.organization_id = :orgIdPos
               AND (
                    (s.department_id IS NULL AND pt.department_id IS NULL)
                 OR (s.department_id IS NOT NULL AND pt.department_id = s.department_id)
               )
            $where
            ORDER BY (pt.position_title LIKE '%ผู้อำนวยการ%') ASC,
                     d.department_title DESC,
                     pt.position_title DESC,
                     s.fristname ASC,
                     s.lastname ASC,
                     s.site_structure ASC
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':orgIdDept', (int)$organizationId, PDO::PARAM_INT);
        $stmt->bindValue(':orgIdPos', (int)$organizationId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);

        foreach ([':q1', ':q2', ':q3', ':q4', ':q5', ':q6', ':q7'] as $k) {
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

    public function countWithSearch(string $q = '', int $organizationId = 7): int
    {
        $q = trim($q);

        $where = '';
        $params = [];

        if ($q !== '') {
            $like = '%' . $q . '%';
            $conds = [
                'pp.prefix_th LIKE :q1',
                's.fristname LIKE :q2',
                's.lastname LIKE :q3',
                "CONCAT(pp.prefix_th, s.fristname, ' ', s.lastname) LIKE :q4",
                'd.department_title LIKE :q5',
                'pt.position_title LIKE :q6',
                's.pic_path LIKE :q7',
            ];
            $params[':q1'] = $like;
            $params[':q2'] = $like;
            $params[':q3'] = $like;
            $params[':q4'] = $like;
            $params[':q5'] = $like;
            $params[':q6'] = $like;
            $params[':q7'] = $like;

            if (ctype_digit($q)) {
                $conds[] = 's.site_structure = :id';
                $params[':id'] = (int)$q;
            }

            $where = 'WHERE ' . implode(' OR ', $conds);
        }

        $sql = "
            SELECT COUNT(*)
            FROM site_structure s
            INNER JOIN person_prefix pp
                ON pp.person_prefix_id = s.prefix_person_id
            LEFT JOIN department d
                ON d.department_id = s.department_id
               AND d.organization_id = :orgIdDept
            INNER JOIN position_title pt
                ON pt.position_title_id = s.position_id
               AND pt.organization_id = :orgIdPos
               AND (
                    (s.department_id IS NULL AND pt.department_id IS NULL)
                 OR (s.department_id IS NOT NULL AND pt.department_id = s.department_id)
               )
            $where
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':orgIdDept', (int)$organizationId, PDO::PARAM_INT);
        $stmt->bindValue(':orgIdPos', (int)$organizationId, PDO::PARAM_INT);
        foreach ([':q1', ':q2', ':q3', ':q4', ':q5', ':q6', ':q7'] as $k) {
            if (isset($params[$k])) {
                $stmt->bindValue($k, (string)$params[$k], PDO::PARAM_STR);
            }
        }
        if (isset($params[':id'])) {
            $stmt->bindValue(':id', (int)$params[':id'], PDO::PARAM_INT);
        }
        $stmt->execute();
        $n = $stmt->fetchColumn();
        return (int)($n ?: 0);
    }

    /**
     * Joined row for UI.
     * @return array<string,mixed>|null
     */
    public function find(int $id, int $organizationId = 7): ?array
    {
        $sql = "
            SELECT
                s.site_structure AS structure_id,
                s.prefix_person_id,
                pp.prefix_th,
                s.fristname,
                s.lastname,
                s.department_id,
                d.department_title,
                s.position_id,
                pt.position_title,
                s.pic_path,
                s.created_at
            FROM site_structure s
            INNER JOIN person_prefix pp
                ON pp.person_prefix_id = s.prefix_person_id
            LEFT JOIN department d
                ON d.department_id = s.department_id
               AND d.organization_id = :orgIdDept
            INNER JOIN position_title pt
                ON pt.position_title_id = s.position_id
               AND pt.organization_id = :orgIdPos
               AND (
                    (s.department_id IS NULL AND pt.department_id IS NULL)
                 OR (s.department_id IS NOT NULL AND pt.department_id = s.department_id)
               )
            WHERE s.site_structure = :id
            LIMIT 1
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':orgIdDept', (int)$organizationId, PDO::PARAM_INT);
        $stmt->bindValue(':orgIdPos', (int)$organizationId, PDO::PARAM_INT);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return is_array($row) ? $row : null;
    }

    /**
     * Raw row for update/delete (no joins).
     * @return array<string,mixed>|null
     */
    public function findRaw(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT site_structure, prefix_person_id, fristname, lastname, department_id, position_id, pic_path, created_at FROM site_structure WHERE site_structure = :id');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return is_array($row) ? $row : null;
    }

    public function create(int $prefixPersonId, string $fristname, string $lastname, ?int $departmentId, int $positionId, ?string $picPath): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO site_structure (prefix_person_id, fristname, lastname, department_id, position_id, pic_path) VALUES (:prefix_person_id, :fristname, :lastname, :department_id, :position_id, :pic_path)'
        );
        $stmt->execute([
            ':prefix_person_id' => $prefixPersonId,
            ':fristname' => $fristname,
            ':lastname' => $lastname,
            ':department_id' => $departmentId,
            ':position_id' => $positionId,
            ':pic_path' => $picPath,
        ]);

        return (int)$this->pdo->lastInsertId();
    }

    public function update(int $id, int $prefixPersonId, string $fristname, string $lastname, ?int $departmentId, int $positionId, ?string $picPath): bool
    {
        $stmt = $this->pdo->prepare(
            'UPDATE site_structure SET prefix_person_id = :prefix_person_id, fristname = :fristname, lastname = :lastname, department_id = :department_id, position_id = :position_id, pic_path = :pic_path WHERE site_structure = :id'
        );
        $stmt->execute([
            ':prefix_person_id' => $prefixPersonId,
            ':fristname' => $fristname,
            ':lastname' => $lastname,
            ':department_id' => $departmentId,
            ':position_id' => $positionId,
            ':pic_path' => $picPath,
            ':id' => $id,
        ]);

        return $stmt->rowCount() > 0;
    }

    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM site_structure WHERE site_structure = :id');
        $stmt->execute([':id' => $id]);
        return $stmt->rowCount() > 0;
    }
}

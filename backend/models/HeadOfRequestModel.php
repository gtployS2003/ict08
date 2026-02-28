<?php
// backend/models/HeadOfRequestModel.php
declare(strict_types=1);

/**
 * Table: head_of_request
 * Columns:
 * - id (int)
 * - staff_id (int)            // references user.user_id
 * - request_sub_type_id (int) // references request_sub_type.request_sub_type_id
 */
final class HeadOfRequestModel
{
	/** @var PDO */
	private $pdo;

	public function __construct(PDO $pdo)
	{
		$this->pdo = $pdo;
	}

	/**
	 * List request_sub_type (for settings page) with optional filters.
	 * NOTE: This does NOT include assignees yet. Use listAssignmentsBySubTypeIds().
	 *
	 * @return array<int, array<string, mixed>>
	 */
	public function listSubTypes(string $q = '', int $subtypeOf = 0, int $page = 1, int $limit = 50): array
	{
		$page = max(1, $page);
		$limit = max(1, min(200, $limit));
		$offset = ($page - 1) * $limit;

		$tmp = $this->buildSubTypeWhere($q, $subtypeOf);
		$whereSql = $tmp[0];
		$params = $tmp[1];
		$sql = "
			SELECT
				rst.request_sub_type_id,
				rst.name AS request_sub_type_name,
				rst.discription,
				rst.subtype_of,
				rt.type_name AS request_type_name
			FROM request_sub_type rst
			LEFT JOIN request_type rt
				ON rt.request_type_id = rst.subtype_of
			{$whereSql}
			ORDER BY rst.request_sub_type_id ASC
			LIMIT :limit OFFSET :offset
		";

		$stmt = $this->pdo->prepare($sql);

		foreach ($params as $k => $v) {
			$stmt->bindValue($k, $v, is_int($v) ? PDO::PARAM_INT : PDO::PARAM_STR);
		}
		$stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
		$stmt->bindValue(':offset', $offset, PDO::PARAM_INT);

		$stmt->execute();
		return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
	}

	public function countSubTypes(string $q = '', int $subtypeOf = 0): int
	{
		$tmp = $this->buildSubTypeWhere($q, $subtypeOf);
		$whereSql = $tmp[0];
		$params = $tmp[1];

		$sql = "
			SELECT COUNT(*) AS c
			FROM request_sub_type rst
			{$whereSql}
		";

		$stmt = $this->pdo->prepare($sql);
		foreach ($params as $k => $v) {
			$stmt->bindValue($k, $v, is_int($v) ? PDO::PARAM_INT : PDO::PARAM_STR);
		}
		$stmt->execute();

		$row = $stmt->fetch(PDO::FETCH_ASSOC);
		return (int) ($row['c'] ?? 0);
	}

	/**
	 * Fetch head_of_request assignments for a set of request_sub_type_ids.
	 *
	 * @param array<int, int> $subTypeIds
	 * @return array<int, array<string, mixed>>
	 */
	public function listAssignmentsBySubTypeIds(array $subTypeIds): array
	{
		$ids = array_values(array_unique(array_filter(array_map('intval', $subTypeIds), function ($v) {
			return $v > 0;
		})));
		if (empty($ids))
			return [];

		$in = implode(',', array_fill(0, count($ids), '?'));

		$sql = "
			SELECT
				hor.id,
				hor.request_sub_type_id,
				hor.staff_id AS user_id,

				u.line_user_name,
				u.user_role_id,
				p.display_name
			FROM head_of_request hor
			INNER JOIN `user` u
				ON u.user_id = hor.staff_id
			LEFT JOIN person p
				ON p.person_user_id = u.user_id
			WHERE hor.request_sub_type_id IN ({$in})
			ORDER BY hor.request_sub_type_id ASC, hor.id ASC
		";

		$stmt = $this->pdo->prepare($sql);
		foreach ($ids as $i => $v) {
			$stmt->bindValue($i + 1, $v, PDO::PARAM_INT);
		}
		$stmt->execute();
		return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
	}

	/**
	 * Replace (delete then insert) assignments for one request_sub_type.
	 * @param array<int, int> $staffIds user_ids
	 */
	public function replaceAssignments(int $requestSubTypeId, array $staffIds): int
	{
		$requestSubTypeId = max(1, $requestSubTypeId);
		$ids = array_values(array_unique(array_filter(array_map('intval', $staffIds), function ($v) {
			return $v > 0;
		})));

		$this->pdo->beginTransaction();
		try {
			$del = $this->pdo->prepare('DELETE FROM head_of_request WHERE request_sub_type_id = :sid');
			$del->bindValue(':sid', $requestSubTypeId, PDO::PARAM_INT);
			$del->execute();

			if (empty($ids)) {
				$this->pdo->commit();
				return 0;
			}

			$ins = $this->pdo->prepare('INSERT INTO head_of_request (staff_id, request_sub_type_id) VALUES (:uid, :sid)');
			$count = 0;
			foreach ($ids as $uid) {
				$ins->bindValue(':uid', $uid, PDO::PARAM_INT);
				$ins->bindValue(':sid', $requestSubTypeId, PDO::PARAM_INT);
				$ins->execute();
				$count += (int) $ins->rowCount();
			}

			$this->pdo->commit();
			return $count;
		} catch (Throwable $e) {
			$this->pdo->rollBack();
			throw $e;
		}
	}

	/**
	 * Filter staff ids to only eligible users (user_role_id IN (2,3)).
	 * @param array<int, int> $staffIds
	 * @return array<int, int>
	 */
	public function filterEligibleStaffIds(array $staffIds): array
	{
		$ids = array_values(array_unique(array_filter(array_map('intval', $staffIds), function ($v) {
			return $v > 0;
		})));
		if (empty($ids))
			return [];

		$in = implode(',', array_fill(0, count($ids), '?'));
		$sql = "SELECT user_id FROM `user` WHERE user_id IN ({$in}) AND user_role_id IN (2,3)";

		$stmt = $this->pdo->prepare($sql);
		foreach ($ids as $i => $v) {
			$stmt->bindValue($i + 1, $v, PDO::PARAM_INT);
		}
		$stmt->execute();

		$rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
		$allowed = array_map(function ($r) {
			return (int) ($r['user_id'] ?? 0);
		}, $rows);
		$allowed = array_values(array_unique(array_filter($allowed, function ($v) {
			return $v > 0;
		})));
		sort($allowed);
		return $allowed;
	}

	public function deleteBySubType(int $requestSubTypeId): bool
	{
		$requestSubTypeId = max(1, $requestSubTypeId);
		$stmt = $this->pdo->prepare('DELETE FROM head_of_request WHERE request_sub_type_id = :sid');
		$stmt->bindValue(':sid', $requestSubTypeId, PDO::PARAM_INT);
		$stmt->execute();
		return $stmt->rowCount() > 0;
	}

	/**
	 * Eligible users: user_role_id IN (2,3)
	 * @return array<int, array<string, mixed>>
	 */
	public function listEligibleUsers(string $q = '', int $page = 1, int $limit = 50): array
	{
		$page = max(1, $page);
		$limit = max(1, min(200, $limit));
		$offset = ($page - 1) * $limit;

		$q = trim($q);
		$where = 'WHERE u.user_role_id IN (2,3)';
		$params = [];

		if ($q !== '') {
			$where .= ' AND (p.display_name LIKE :q1 OR u.line_user_name LIKE :q2)';
			$like = '%' . $q . '%';
			$params[':q1'] = $like;
			$params[':q2'] = $like;
		}

		$sql = "
			SELECT
				u.user_id,
				u.line_user_name,
				u.user_role_id,
				p.display_name
			FROM `user` u
			LEFT JOIN person p
				ON p.person_user_id = u.user_id
			{$where}
			ORDER BY COALESCE(p.display_name, u.line_user_name) ASC, u.user_id ASC
			LIMIT :limit OFFSET :offset
		";

		$stmt = $this->pdo->prepare($sql);
		foreach ($params as $k => $v) {
			$stmt->bindValue($k, $v, PDO::PARAM_STR);
		}
		$stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
		$stmt->bindValue(':offset', $offset, PDO::PARAM_INT);

		$stmt->execute();
		return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
	}

	public function countEligibleUsers(string $q = ''): int
	{
		$q = trim($q);
		$where = 'WHERE u.user_role_id IN (2,3)';
		$params = [];
		if ($q !== '') {
			$where .= ' AND (p.display_name LIKE :q1 OR u.line_user_name LIKE :q2)';
			$like = '%' . $q . '%';
			$params[':q1'] = $like;
			$params[':q2'] = $like;
		}

		$sql = "
			SELECT COUNT(*) AS c
			FROM `user` u
			LEFT JOIN person p ON p.person_user_id = u.user_id
			{$where}
		";

		$stmt = $this->pdo->prepare($sql);
		foreach ($params as $k => $v) {
			$stmt->bindValue($k, $v, PDO::PARAM_STR);
		}
		$stmt->execute();
		$row = $stmt->fetch(PDO::FETCH_ASSOC);
		return (int) ($row['c'] ?? 0);
	}

	/**
	 * @return array{0:string,1:array<string,mixed>}
	 */
	private function buildSubTypeWhere(string $q, int $subtypeOf): array
	{
		$conds = [];
		$params = [];

		$q = trim($q);
		if ($q !== '') {
			$conds[] = '(rst.name LIKE :q1 OR rst.discription LIKE :q2)';
			$params[':q1'] = '%' . $q . '%';
			$params[':q2'] = '%' . $q . '%';
		}

		if ($subtypeOf > 0) {
			$conds[] = 'rst.subtype_of = :subtype_of';
			$params[':subtype_of'] = $subtypeOf;
		}

		if (!empty($conds)) {
			return ['WHERE ' . implode(' AND ', $conds), $params];
		}
		return ['', $params];
	}
}


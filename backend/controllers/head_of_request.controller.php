<?php
// backend/controllers/head_of_request.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';

require_once __DIR__ . '/../models/HeadOfRequestModel.php';

final class HeadOfRequestController
{
	public function __construct(private PDO $pdo)
	{
	}

	/**
	 * GET /head-of-request?q=&subtype_of=&page=&limit=
	 * List request sub types with assigned staff (user_role_id 2/3 are selectable; but existing assignments are returned as-is).
	 */
	public function index(): void
	{
		try {
			$q = trim((string)($_GET['q'] ?? ''));
			$subtypeOf = (int)($_GET['subtype_of'] ?? 0);
			$page = (int)($_GET['page'] ?? 1);
			$limit = (int)($_GET['limit'] ?? 50);

			$model = new HeadOfRequestModel($this->pdo);
			$items = $model->listSubTypes($q, $subtypeOf, $page, $limit);
			$total = $model->countSubTypes($q, $subtypeOf);

			$subTypeIds = array_map(fn($r) => (int)($r['request_sub_type_id'] ?? 0), $items);
			$assignments = $model->listAssignmentsBySubTypeIds($subTypeIds);

			// group assignments by request_sub_type_id
			$grouped = [];
			foreach ($assignments as $a) {
				$sid = (int)($a['request_sub_type_id'] ?? 0);
				if ($sid <= 0) continue;
				if (!isset($grouped[$sid])) $grouped[$sid] = [];

				$display = (string)($a['display_name'] ?? '');
				if ($display === '') $display = (string)($a['line_user_name'] ?? '');

				$grouped[$sid][] = [
					'id' => (int)($a['id'] ?? 0),
					'user_id' => (int)($a['user_id'] ?? 0),
					'display_name' => $display,
					'line_user_name' => (string)($a['line_user_name'] ?? ''),
					'user_role_id' => (int)($a['user_role_id'] ?? 0),
				];
			}

			$out = [];
			foreach ($items as $row) {
				$sid = (int)($row['request_sub_type_id'] ?? 0);
				$row['staff'] = $grouped[$sid] ?? [];
				$out[] = $row;
			}

			json_response([
				'error' => false,
				'data' => $out,
				'pagination' => [
					'page' => max(1, $page),
					'limit' => max(1, min(200, $limit)),
					'total' => $total,
					'totalPages' => (int)ceil($total / max(1, min(200, $limit))),
				],
			]);
		} catch (Throwable $e) {
			json_response([
				'error' => true,
				'message' => 'Failed to get head of request settings',
				'detail' => $e->getMessage(),
			], 500);
		}
	}

	/**
	 * GET /head-of-request/eligible-users?q=&page=&limit=
	 */
	public function eligibleUsers(): void
	{
		try {
			$q = trim((string)($_GET['q'] ?? ''));
			$page = (int)($_GET['page'] ?? 1);
			$limit = (int)($_GET['limit'] ?? 50);

			$model = new HeadOfRequestModel($this->pdo);
			$items = $model->listEligibleUsers($q, $page, $limit);
			$total = $model->countEligibleUsers($q);

			json_response([
				'error' => false,
				'data' => $items,
				'pagination' => [
					'page' => max(1, $page),
					'limit' => max(1, min(200, $limit)),
					'total' => $total,
					'totalPages' => (int)ceil($total / max(1, min(200, $limit))),
				],
			]);
		} catch (Throwable $e) {
			json_response([
				'error' => true,
				'message' => 'Failed to list eligible users',
				'detail' => $e->getMessage(),
			], 500);
		}
	}

	/**
	 * POST /head-of-request
	 * body: { request_sub_type_id: number, staff_ids: number[] }
	 * - replaces assignments for the given request_sub_type_id
	 */
	public function save(): void
	{
		try {
			$body = read_json_body();

			$requestSubTypeId = (int)($body['request_sub_type_id'] ?? 0);
			$staffIds = $body['staff_ids'] ?? [];
			if (!is_array($staffIds)) $staffIds = [];

			if ($requestSubTypeId <= 0) {
				json_response([
					'error' => true,
					'message' => 'request_sub_type_id is required',
				], 400);
				return;
			}

			$ids = array_values(array_unique(array_filter(array_map('intval', $staffIds), fn($v) => $v > 0)));

			$model = new HeadOfRequestModel($this->pdo);
			$allowed = $model->filterEligibleStaffIds($ids);
			if (count($allowed) !== count($ids)) {
				$diff = array_values(array_diff($ids, $allowed));
				json_response([
					'error' => true,
					'message' => 'Some staff_ids are not eligible (allowed roles: 2,3)',
					'errors' => [
						'invalid_staff_ids' => $diff,
					],
				], 422);
				return;
			}

			$model->replaceAssignments($requestSubTypeId, $allowed);

			json_response([
				'error' => false,
				'message' => 'Saved',
			]);
		} catch (Throwable $e) {
			json_response([
				'error' => true,
				'message' => 'Failed to save head of request',
				'detail' => $e->getMessage(),
			], 500);
		}
	}

	/**
	 * DELETE /head-of-request/{request_sub_type_id}
	 */
	public function deleteBySubType(int $requestSubTypeId): void
	{
		try {
			$requestSubTypeId = max(1, $requestSubTypeId);
			$model = new HeadOfRequestModel($this->pdo);
			$ok = $model->deleteBySubType($requestSubTypeId);

			json_response([
				'error' => false,
				'message' => $ok ? 'Deleted' : 'No change',
			]);
		} catch (Throwable $e) {
			json_response([
				'error' => true,
				'message' => 'Failed to delete head of request',
				'detail' => $e->getMessage(),
			], 500);
		}
	}
}


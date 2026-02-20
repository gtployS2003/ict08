<?php
// backend/routes/head_of_request.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/head_of_request.controller.php';

function head_of_request_routes(string $method, array $segments, PDO $pdo): bool
{
	// path: /head-of-request/...
	if (($segments[0] ?? '') !== 'head-of-request') {
		return false;
	}

	$controller = new HeadOfRequestController($pdo);

	// GET /head-of-request
	if ($method === 'GET' && count($segments) === 1) {
		$controller->index();
		return true;
	}

	// GET /head-of-request/eligible-users
	if ($method === 'GET' && ($segments[1] ?? '') === 'eligible-users') {
		$controller->eligibleUsers();
		return true;
	}

	// GET /head-of-request/staff/{request_sub_type_id}
	if ($method === 'GET' && ($segments[1] ?? '') === 'staff' && isset($segments[2]) && ctype_digit((string)$segments[2])) {
		$controller->staffBySubType((int)$segments[2]);
		return true;
	}

	// POST /head-of-request
	if ($method === 'POST' && count($segments) === 1) {
		$controller->save();
		return true;
	}

	// DELETE /head-of-request/{request_sub_type_id}
	if ($method === 'DELETE' && isset($segments[1]) && ctype_digit((string)$segments[1])) {
		$controller->deleteBySubType((int)$segments[1]);
		return true;
	}

	return false;
}


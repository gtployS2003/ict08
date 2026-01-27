<?php
// backend/routes/user_approvals.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/user_approvals.controller.php';

/**
 * Routes: user-approvals
 *
 * รองรับ:
 *  - GET  /user-approvals/pending     (ดึงรายการรออนุมัติ)
 *  - POST /user-approvals/approve     (อนุมัติ / เปลี่ยน role แล้วอนุมัติ)
 */
function user_approvals_routes(string $method, array $segments, PDO $pdo): bool
{
    // segments[0] ต้องเป็น "user-approvals"
    if (($segments[0] ?? '') !== 'user-approvals') {
        return false;
    }

    $controller = new UserApprovalsController($pdo);
    $action = $segments[1] ?? '';

    // GET /user-approvals/pending
    if ($method === 'GET' && $action === 'pending') {
        $controller->pending();
        return true;
    }

    // POST /user-approvals/approve
    if ($method === 'POST' && $action === 'approve') {
        $controller->approve();
        return true;
    }

    return false;
}

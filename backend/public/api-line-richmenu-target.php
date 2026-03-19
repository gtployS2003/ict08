<?php
/**
 * API: Resolve target rich menu for a LINE user
 *
 * Query:
 * - lineUserId (required)
 *
 * Auth:
 * - X-API-Key: must match DEV_API_KEY in .env
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    require_once __DIR__ . '/../config/env.php';
    env_load(__DIR__ . '/../.env');
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Env load failed']);
    exit;
}

$expectedApiKey = (string) (getenv('DEV_API_KEY') ?: '');
$providedApiKey = (string) ($_SERVER['HTTP_X_API_KEY'] ?? '');

if ($expectedApiKey !== '' && !hash_equals($expectedApiKey, $providedApiKey)) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'message' => 'Unauthorized']);
    exit;
}

$lineUserId = trim((string) ($_GET['lineUserId'] ?? ''));
if ($lineUserId === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'lineUserId is required']);
    exit;
}

$rmBefore = (string) (getenv('LINE_RICHMENU_BEFORE') ?: '');
$rmInternal = (string) (getenv('LINE_RICHMENU_INTERNAL') ?: '');
$rmExternal = (string) (getenv('LINE_RICHMENU_EXTERNAL') ?: '');

$targetCode = 'before';
$targetRichMenuId = $rmBefore;
$roleCode = 'GUEST';
$isApproved = false;

try {
    require_once __DIR__ . '/../config/db.php';
    require_once __DIR__ . '/../models/UserModel.php';
    require_once __DIR__ . '/../models/UserRoleModel.php';
    require_once __DIR__ . '/../models/PersonModel.php';

    $pdo = db();
    $userModel = new UserModel($pdo);
    $userRoleModel = new UserRoleModel($pdo);
    $personModel = new PersonModel($pdo);

    $user = $userModel->findByLineUserId($lineUserId);

    if ($user) {
        try {
            $person = $personModel->findByUserId((int) ($user['user_id'] ?? 0));
            $isApproved = ((int) ($person['is_active'] ?? 0) === 1);
        } catch (Throwable $e) {
            $isApproved = false;
        }

        if (!empty($user['user_role_id'])) {
            try {
                $roleRow = $userRoleModel->getById((int) $user['user_role_id']);
                $roleCode = strtoupper((string) ($roleRow['code'] ?? 'EXTERNAL'));
            } catch (Throwable $e) {
                $roleCode = 'EXTERNAL';
            }
        }
    }
} catch (Throwable $e) {
    // DB failure fallback -> before_login
}

$internalRoleCodes = ['INTERNAL', 'ADMIN', 'STAFF'];
$externalRoleCodes = ['EXTERNAL', 'USER'];

if ($isApproved) {
    if (in_array($roleCode, $internalRoleCodes, true)) {
        $targetCode = 'internal';
        $targetRichMenuId = $rmInternal;
    } elseif (in_array($roleCode, $externalRoleCodes, true)) {
        $targetCode = 'external';
        $targetRichMenuId = $rmExternal;
    }
}

http_response_code(200);
echo json_encode([
    'ok' => true,
    'lineUserId' => $lineUserId,
    'roleCode' => $roleCode,
    'isApproved' => $isApproved,
    'targetCode' => $targetCode,
    'targetRichMenuId' => $targetRichMenuId,
], JSON_UNESCAPED_UNICODE);

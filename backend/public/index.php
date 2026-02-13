<?php
// backend/public/index.php
declare(strict_types=1);

ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/env.php';
env_load(__DIR__ . '/../.env');

require_once __DIR__ . '/../helpers/response.php';


require_once __DIR__ . '/../routes/news.routes.php';
require_once __DIR__ . '/../routes/activities.routes.php';
require_once __DIR__ . '/../routes/auth.routes.php';
require_once __DIR__ . '/../routes/provinces.routes.php';
require_once __DIR__ . '/../routes/organization_types.routes.php';
require_once __DIR__ . '/../routes/organization.routes.php';
require_once __DIR__ . '/../routes/person_prefixes.routes.php';
require_once __DIR__ . '/../routes/departments.routes.php';
require_once __DIR__ . '/../routes/position_titles.routes.php';
require_once __DIR__ . '/../routes/user_roles.routes.php';
require_once __DIR__ . '/../routes/user_approvals.routes.php';
require_once __DIR__ . '/../routes/users.routes.php';
require_once __DIR__ . '/../routes/request_types.routes.php';
require_once __DIR__ . '/../routes/request_sub_types.routes.php';
require_once __DIR__ . '/../routes/requests.routes.php';
require_once __DIR__ . '/../routes/request_status.routes.php';
require_once __DIR__ . '/../routes/notification_types.routes.php';
require_once __DIR__ . '/../routes/notification_type_staff.routes.php';



cors_apply();
cors_handle_preflight();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// path จาก rewrite หรือ query string
$path = $_GET['path'] ?? '';
if ($path === '') {
    // ถ้าเข้ามาแบบ /public/news ให้ดึงจาก REQUEST_URI
    $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
    // ตัดส่วนก่อน /backend/public/
    $base = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/'); // .../backend/public
    if (str_starts_with($uri, $base)) {
        $path = ltrim(substr($uri, strlen($base)), '/');
    }
}

$segments = array_values(array_filter(explode('/', trim($path, '/'))));

try {
    $pdo = db();

    // route matching
    if (auth_routes($method, $segments, $pdo)) exit;
    if (news_routes($method, $segments, $pdo)) exit;
    if (activities_routes($method, $segments, $pdo)) exit;
    if (provinces_routes($method, $segments, $pdo)) exit;
    if (organization_types_routes($method, $segments, $pdo)) exit;
    if (organization_routes($method, $segments, $pdo)) exit;
    if (person_prefixes_routes($method, $segments, $pdo)) exit;
    if (departments_routes($method, $segments, $pdo)) exit;
    if (position_titles_routes($method, $segments, $pdo)) exit;
    if (user_roles_routes($method, $segments, $pdo)) exit;
    if (user_approvals_routes($method, $segments, $pdo)) exit;
    if (users_routes($method, $segments, $pdo)) exit;
    if (request_types_routes($method, $segments, $pdo)) exit;
    if (request_sub_types_routes($method, $segments, $pdo)) exit;
    if (requests_routes($method, $segments, $pdo)) exit;
    if (request_status_routes($method, $segments, $pdo)) exit;
    if (notification_types_routes($method, $segments, $pdo)) exit;
    if (notification_type_staff_routes($method, $segments, $pdo)) exit;

    fail("Route not found", 404, ["path" => $path, "method" => $method]);

} catch (Throwable $e) {
    fail("Server error", 500, $e->getMessage());
}

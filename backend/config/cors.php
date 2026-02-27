<?php
// backend/config/cors.php
declare(strict_types=1);

function cors_apply(): void {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Dev-Api-Key, X-HTTP-Method-Override');
    header('Access-Control-Expose-Headers: Content-Type, Authorization, X-Dev-Api-Key, X-HTTP-Method-Override');
    header('Access-Control-Max-Age: 86400');
}


function cors_handle_preflight(): void {
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        cors_apply();
        http_response_code(204);
        exit;
    }
}

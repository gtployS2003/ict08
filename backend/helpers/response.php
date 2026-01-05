<?php
// backend/helpers/response.php
declare(strict_types=1);

function json_response(array $payload, int $statusCode = 200): void {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function ok($data = null, string $message = "OK", int $statusCode = 200): void {
    json_response([
        "ok" => true,
        "message" => $message,
        "data" => $data
    ], $statusCode);
}

function fail(string $message = "Error", int $statusCode = 400, $errors = null): void {
    json_response([
        "ok" => false,
        "message" => $message,
        "errors" => $errors
    ], $statusCode);
}

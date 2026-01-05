<?php
// backend/controllers/auth.controller.php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../models/UserModel.php';

class AuthController {
    public function __construct(private PDO $pdo) {}

    public function login(): void {
        $body = read_json_body();
        $missing = require_fields($body, ['username', 'password']);
        if ($missing) fail("Missing fields", 422, $missing);

        $model = new UserModel($this->pdo);
        $user = $model->findByUsername($body['username']);
        if (!$user) fail("Invalid credentials", 401);

        $okPass = password_verify($body['password'], $user['password_hash'] ?? '');
        if (!$okPass) fail("Invalid credentials", 401);

        $userId = (string)$user['user_id'];
        $token = auth_sign($userId);

        ok([
            "token" => $token,
            "user" => [
                "user_id" => (int)$user['user_id'],
                "username" => $user['username'],
                "role" => $user['role'] ?? null
            ]
        ], "Login success");
    }
}

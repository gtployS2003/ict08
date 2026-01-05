<?php
// backend/models/UserModel.php
declare(strict_types=1);

class UserModel {
    public function __construct(private PDO $pdo) {}

    public function findByUsername(string $username): ?array {
        $sql = "SELECT user_id, username, password_hash, role
                FROM users WHERE username = :u LIMIT 1";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['u' => $username]);
        $row = $stmt->fetch();
        return $row ?: null;
    }
}

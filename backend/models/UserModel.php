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
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    // ✅ เพิ่ม: ใช้หา user จาก LINE userId
    public function findByLineUserId(string $lineUserId): ?array {
        $sql = "SELECT user_id, username, role, line_user_id
                FROM users
                WHERE line_user_id = :l
                LIMIT 1";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['l' => $lineUserId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    // ✅ แนะนำเพิ่ม: ถ้ายังไม่มี user ใน DB ให้สร้างไว้ก่อน (role = guest/external ชั่วคราว)
    public function upsertLineUser(string $lineUserId, string $defaultRole = 'guest'): array {
        // 1) หา user ก่อน
        $existing = $this->findByLineUserId($lineUserId);
        if ($existing) return $existing;

        // 2) ถ้าไม่มี ให้ insert
        // หมายเหตุ: ต้องมีคอลัมน์ line_user_id และ role ในตาราง users
        $sql = "INSERT INTO users (line_user_id, role)
                VALUES (:l, :r)";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['l' => $lineUserId, 'r' => $defaultRole]);

        // 3) ดึงกลับมาให้ครบ
        return $this->findByLineUserId($lineUserId) ?? [
            'user_id' => (int)$this->pdo->lastInsertId(),
            'line_user_id' => $lineUserId,
            'role' => $defaultRole
        ];
    }

    // ✅ (ถ้าต้องการ) ใช้ตอนสมัครสมาชิกเสร็จ เพื่อ set role เป็น internal/external
    public function setRoleByLineUserId(string $lineUserId, string $role): bool {
        $sql = "UPDATE users SET role = :r WHERE line_user_id = :l";
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute(['r' => $role, 'l' => $lineUserId]);
    }
}

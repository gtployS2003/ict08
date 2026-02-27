<?php
// backend/models/UserModel.php
declare(strict_types=1);

class UserModel
{
    /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * ใช้กับ LINE login: หา user จาก line_user_id
     * ตารางจริงของคุณคือ `user`
     */
    public function findByLineUserId(string $lineUserId): ?array
    {
        $sql = "SELECT user_id, line_user_id, line_user_name, user_role_id
            FROM `user`
            WHERE line_user_id = :l
            LIMIT 1";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':l' => $lineUserId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * ✅ ใช้กับ approvals: หา user จาก user_id
     */
    public function findById(int $userId): ?array
    {
        $sql = "SELECT user_id, line_user_id, line_user_name, user_role_id
                FROM `user`
                WHERE user_id = :id
                LIMIT 1";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':id' => $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * สร้าง user ใหม่จาก LINE (ตอนสมัครสมาชิก)
     * - user_role_id: ถ้าไม่ใช่เจ้าหน้าที่ศูนย์ให้เป็น user อัตโนมัติ
     */
    public function createFromLine(string $lineUserId, string $lineUserName, int $userRoleId): int
    {
        $sql = "INSERT INTO user (line_user_id, line_user_name, user_role_id)
                VALUES (:line_user_id, :line_user_name, :user_role_id)";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':line_user_id' => $lineUserId,
            ':line_user_name' => $lineUserName,
            ':user_role_id' => $userRoleId
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    /**
     * (optional) อัปเดตชื่อที่มาจาก LINE ถ้ามีการเปลี่ยน display name
     */
    public function updateLineUserName(int $userId, string $lineUserName): bool
    {
        $sql = "UPDATE user SET line_user_name = :n WHERE user_id = :id";
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute([
            ':n' => $lineUserName,
            ':id' => $userId
        ]);
    }

    public function updateRole(int $userId, int $userRoleId): bool
    {
        $sql = "UPDATE `user`
            SET user_role_id = :rid
            WHERE user_id = :uid
            LIMIT 1";
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute([
            ':rid' => $userRoleId,
            ':uid' => $userId
        ]);
    }

    public function updateUserRole(int $userId, int $roleId): bool
    {
        return $this->updateRole($userId, $roleId);
    }

}
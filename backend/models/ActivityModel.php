<?php
// backend/models/ActivityModel.php
declare(strict_types=1);

class ActivityModel {
    public function __construct(private PDO $pdo) {}

    public function list(int $limit = 20): array {
        $sql = "SELECT activity_id, title, description, cover_image, activity_date
                FROM activities
                ORDER BY activity_date DESC
                LIMIT :lim";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function get(int $id): ?array {
        $sql = "SELECT activity_id, title, description, cover_image, activity_date
                FROM activities WHERE activity_id = :id LIMIT 1";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }
}

<?php
// backend/models/PublicityPostMediaModel.php
declare(strict_types=1);

final class PublicityPostMediaModel
{
    /** @var string */
    private $table = 'publicity_post_media';

    /** @var PDO */
    private $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?: db();
    }

    /**
     * @return array<int,array{publicity_post_media_id:int,post_id:int,event_media_id:int,sort_order:int,is_cover:int,created_at:mixed}>
     */
    public function listByPostId(int $postId): array
    {
        $postId = max(1, (int) $postId);
        $sql = "
            SELECT
                ppm.publicity_post_media_id,
                ppm.post_id,
                ppm.event_media_id,
                ppm.sort_order,
                ppm.is_cover,
                ppm.created_at
            FROM {$this->table} ppm
            WHERE ppm.post_id = :pid
            ORDER BY ppm.is_cover DESC, ppm.sort_order ASC, ppm.publicity_post_media_id ASC
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':pid' => $postId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * Replace all media rows for a post.
     *
     * @param array<int,array{event_media_id:int,sort_order?:int,is_cover?:int}> $items
     */
    public function replaceForPostId(int $postId, array $items): void
    {
        $postId = max(1, (int) $postId);

        $this->pdo->beginTransaction();
        try {
            $del = $this->pdo->prepare("DELETE FROM {$this->table} WHERE post_id = :pid");
            $del->execute([':pid' => $postId]);

            if (!empty($items)) {
                $ins = $this->pdo->prepare("
                    INSERT INTO {$this->table}
                        (post_id, event_media_id, sort_order, is_cover, created_at)
                    VALUES
                        (:pid, :mid, :sort, :cover, NOW())
                ");

                foreach ($items as $it) {
                    $mid = max(1, (int) ($it['event_media_id'] ?? 0));
                    if ($mid <= 0)
                        continue;
                    $sort = max(1, (int) ($it['sort_order'] ?? 1));
                    $cover = (int) ($it['is_cover'] ?? 0) ? 1 : 0;

                    $ins->execute([
                        ':pid' => $postId,
                        ':mid' => $mid,
                        ':sort' => $sort,
                        ':cover' => $cover,
                    ]);
                }
            }

            $this->pdo->commit();
        } catch (\Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
}

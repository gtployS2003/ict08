<?php
// backend/models/EventParticipantModel.php
declare(strict_types=1);

final class EventParticipantModel
{
    public function __construct(private PDO $pdo) {}

    /**
     * @return array<int,array<string,mixed>>
     */
    public function listByEventId(int $eventId): array
    {
        $eventId = max(1, (int)$eventId);

        $sql = '
            SELECT
                ep.*, 
                u.user_id,
                u.line_user_id,
                u.line_user_name,
                u.user_role_id
            FROM event_participant ep
            INNER JOIN `user` u ON u.user_id = ep.user_id
            WHERE ep.event_id = :eid
              AND (ep.is_active = 1 OR ep.is_active IS NULL)
            ORDER BY u.user_role_id DESC, u.line_user_name ASC, u.user_id ASC
        ';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':eid' => $eventId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * @param array<int,int> $userIds
     */
    public function insertMany(int $eventId, array $userIds, int $isNotificationRecipient = 1, int $isActive = 1): int
    {
        $eventId = max(1, (int)$eventId);
        $userIds = array_values(array_unique(array_filter(array_map('intval', $userIds), fn($v) => $v > 0)));

        if ($eventId <= 0) {
            throw new InvalidArgumentException('event_id is required');
        }

        if (empty($userIds)) {
            return 0;
        }

        $sql = '
            INSERT INTO event_participant (
                event_id,
                user_id,
                is_notification_recipient,
                is_active
            ) VALUES (
                :event_id,
                :user_id,
                :is_notification_recipient,
                :is_active
            )
        ';

        $stmt = $this->pdo->prepare($sql);
        $count = 0;

        foreach ($userIds as $uid) {
            $stmt->execute([
                ':event_id' => $eventId,
                ':user_id' => $uid,
                ':is_notification_recipient' => $isNotificationRecipient,
                ':is_active' => $isActive,
            ]);
            $count += $stmt->rowCount() > 0 ? 1 : 0;
        }

        return $count;
    }

    public function deleteByEventId(int $eventId): int
    {
        $eventId = max(1, (int)$eventId);
        $stmt = $this->pdo->prepare('DELETE FROM event_participant WHERE event_id = :eid');
        $stmt->execute([':eid' => $eventId]);
        return $stmt->rowCount();
    }
}

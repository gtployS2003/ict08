<?php
// backend/models/EventParticipantModel.php
declare(strict_types=1);

final class EventParticipantModel
{
    /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Sync participants for an event.
     * - Existing participants not in $userIds will be set is_active=0
     * - Participants in $userIds will be ensured is_active=1 (and inserted if missing)
     *
     * NOTE: This intentionally does NOT delete rows so that unchecked participants remain
     * in the table with is_active=0.
     *
     * @param array<int,int> $userIds
     * @return array{activated:int,deactivated:int,inserted:int}
     */
    public function syncByEventId(int $eventId, array $userIds, int $isNotificationRecipient = 1): array
    {
        $eventId = max(1, (int)$eventId);
        $userIds = array_values(array_unique(array_filter(array_map('intval', $userIds), function ($v) { return $v > 0; })));

        if ($eventId <= 0) {
            throw new InvalidArgumentException('event_id is required');
        }

        // Load existing user_ids (include inactive)
        $stmt = $this->pdo->prepare('SELECT DISTINCT user_id FROM event_participant WHERE event_id = :eid');
        $stmt->execute([':eid' => $eventId]);
        $existing = $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
        $existingIds = array_values(array_unique(array_filter(array_map('intval', $existing), function ($v) { return $v > 0; })));

        $want = $userIds;
        $haveSet = array_fill_keys($existingIds, true);
        $wantSet = array_fill_keys($want, true);

        $toInsert = [];
        foreach ($want as $uid) {
            if (!isset($haveSet[$uid])) {
                $toInsert[] = $uid;
            }
        }

        $toDeactivate = [];
        foreach ($existingIds as $uid) {
            if (!isset($wantSet[$uid])) {
                $toDeactivate[] = $uid;
            }
        }

        $activated = 0;
        $deactivated = 0;
        $inserted = 0;

        if (!empty($want)) {
            $placeholders = implode(',', array_fill(0, count($want), '?'));
            $sql = "UPDATE event_participant SET is_active = 1, is_notification_recipient = ? WHERE event_id = ? AND user_id IN ($placeholders)";
            $params = array_merge([(int)$isNotificationRecipient, $eventId], $want);
            $up = $this->pdo->prepare($sql);
            $up->execute($params);
            $activated = (int)$up->rowCount();
        }

        if (!empty($toDeactivate)) {
            $placeholders = implode(',', array_fill(0, count($toDeactivate), '?'));
            $sql = "UPDATE event_participant SET is_active = 0 WHERE event_id = ? AND user_id IN ($placeholders)";
            $params = array_merge([$eventId], $toDeactivate);
            $up = $this->pdo->prepare($sql);
            $up->execute($params);
            $deactivated = (int)$up->rowCount();
        }

        if (!empty($toInsert)) {
            $inserted = $this->insertMany($eventId, $toInsert, $isNotificationRecipient, 1);
        }

        return [
            'activated' => $activated,
            'deactivated' => $deactivated,
            'inserted' => $inserted,
        ];
    }

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
        $userIds = array_values(array_unique(array_filter(array_map('intval', $userIds), function ($v) { return $v > 0; })));

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

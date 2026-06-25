<?php
// backend/services/NotificationService.php
declare(strict_types=1);

require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/../models/NotificationModel.php';
require_once __DIR__ . '/../models/NotificationTypeModel.php';
require_once __DIR__ . '/../models/NotificationTypeStaffModel.php';
require_once __DIR__ . '/../models/UserNotificationChannelModel.php';
require_once __DIR__ . '/LineService.php';

final class NotificationService
{
    /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    // notification_type_id ที่คุณต้องการใช้ (ปรับได้)
    const NOTIF_TYPE_REQUEST_REPAIR = 5;
    const NOTIF_TYPE_REQUEST_OTHER = 6;
    const NOTIF_TYPE_REQUEST_CONFERENCE = 4;


    /**
     * Create notification row for a newly created request.
     * Returns: ['notification_id' => int, 'notification_type_id' => int, 'message' => string]
     *
     * @return array{notification_id:int, notification_type_id:int, message:string}
     */
    public function createNewRequestNotification(int $requestId, int $requestTypeId, string $subject = ''): array
    {
        $requestId = max(0, $requestId);
        if ($requestId <= 0) {
            throw new InvalidArgumentException('requestId is required');
        }

        $typeId = $this->resolveRequestNotificationTypeId($requestTypeId);

        $message = $this->buildRequestMessage($requestTypeId, $requestId, $subject);

        $notificationModel = new NotificationModel($this->pdo);
        $notificationId = $notificationModel->createRequestPending([
            'request_id' => $requestId,
            'notification_type_id' => $typeId,
            'message' => $message,
        ]);

        return [
            'notification_id' => $notificationId,
            'notification_type_id' => $typeId,
            'message' => $message,
        ];
    }

    /**
     * Dispatch notification to enabled staff via enabled channels.
     * - LINE: push message if recipient has channel 'line' enabled
     * - WEB: no-op (notification already saved in DB)
     */
    public function dispatchToStaff(int $notificationTypeId, string $message): array
    {
        $notificationTypeId = max(1, $notificationTypeId);
        $message = trim($message);
        if ($message === '') {
            return ['ok' => false, 'error' => 'Empty message'];
        }

        $recipientsModel = new NotificationTypeStaffModel($this->pdo);
        $recipients = $recipientsModel->listEnabledRecipientsByType($notificationTypeId);

        $uncModel = new UserNotificationChannelModel($this->pdo);

        $token = env('LINE_CHANNEL_ACCESS_TOKEN');
        $line = ($token !== null && $token !== '') ? new LineService($token) : null;

        $sentLine = 0;
        $skipped = 0;
        $errors = [];

        foreach ($recipients as $r) {
            $uid = (int) ($r['user_id'] ?? 0);
            if ($uid <= 0) {
                $skipped++;
                continue;
            }

            // Ensure default channel rows exist (idempotent)
            try {
                if ($uncModel->countByUser($uid) <= 0) {
                    $roleId = $this->getUserRoleId($uid);
                    $uncModel->bootstrapDefaults($uid, $roleId);
                }
            } catch (Throwable $e) {
                // ถ้าสร้าง default ไม่ได้ ก็ยังพยายาม dispatch ต่อ (best effort)
                $errors[] = ['user_id' => $uid, 'step' => 'bootstrapDefaults', 'error' => $e->getMessage()];
            }

            $enabledChannels = [];
            try {
                $enabledChannels = $uncModel->listEnabledChannelNamesByUser($uid);
            } catch (Throwable $e) {
                $errors[] = ['user_id' => $uid, 'step' => 'listEnabledChannels', 'error' => $e->getMessage()];
                $skipped++;
                continue;
            }

            // LINE
            if (in_array('line', $enabledChannels, true)) {
                $lineUserId = trim((string) ($r['line_user_id'] ?? ''));
                if ($line && $lineUserId !== '') {
                    try {
                        $resp = $line->pushMessage($lineUserId, [
                            ['type' => 'text', 'text' => $message]
                        ]);
                        if (($resp['ok'] ?? false) === true) {
                            $sentLine++;
                        } else {
                            $errors[] = ['user_id' => $uid, 'step' => 'linePush', 'resp' => $resp];
                        }
                    } catch (Throwable $e) {
                        $errors[] = ['user_id' => $uid, 'step' => 'linePush', 'error' => $e->getMessage()];
                    }
                } else {
                    $skipped++;
                }
            }

            // WEB: no-op (stored in notification table already)
        }

        return [
            'ok' => true,
            'recipients' => count($recipients),
            'sent_line' => $sentLine,
            'skipped' => $skipped,
            'errors' => $errors,
        ];
    }

    /**
     * Dispatch a message to specific user IDs (best effort).
     * - Respects user_notification_channel.enable
     * - LINE: push message if enabled and user has line_user_id
     * - WEB: no-op (caller may have already inserted notification rows)
     *
     * @param array<int,int> $userIds
     */
    public function dispatchToUsers(array $userIds, string $message): array
    {
        return $this->dispatchToUsersAdvanced($userIds, $message, []);
    }

    /**
     * @param array<int,int> $userIds
     * @param array<string,mixed> $options
     */
    public function dispatchToUsersAdvanced(array $userIds, string $message, array $options = []): array
    {
        $message = trim($message);
        if ($message === '') {
            return ['ok' => false, 'error' => 'Empty message'];
        }

        $clean = [];
        foreach ($userIds as $id) {
            $id = (int) $id;
            if ($id > 0)
                $clean[] = $id;
        }
        $clean = array_values(array_unique($clean));
        if (empty($clean)) {
            return ['ok' => true, 'recipients' => 0, 'sent_line' => 0, 'skipped' => 0, 'errors' => []];
        }

        $uncModel = new UserNotificationChannelModel($this->pdo);

        $token = env('LINE_CHANNEL_ACCESS_TOKEN');
        $line = ($token !== null && $token !== '') ? new LineService($token) : null;

        $ackUrl = trim((string) ($options['ack_url'] ?? ''));
        $emailSubject = trim((string) ($options['email_subject'] ?? ''));
        $sendEmail = (bool) ($options['email'] ?? false);

        $sentLine = 0;
        $sentEmail = 0;
        $skipped = 0;
        $errors = [];

        if ($line === null) {
            return [
                'ok' => true,
                'recipients' => count($clean),
                'sent_line' => 0,
                'skipped' => count($clean),
                'errors' => [
                    ['step' => 'token', 'error' => 'Missing LINE_CHANNEL_ACCESS_TOKEN'],
                ],
            ];
        }

        foreach ($clean as $uid) {
            // Ensure default channel rows exist (idempotent)
            try {
                if ($uncModel->countByUser($uid) <= 0) {
                    $roleId = $this->getUserRoleId($uid);
                    $uncModel->bootstrapDefaults($uid, $roleId);
                }
            } catch (Throwable $e) {
                $errors[] = ['user_id' => $uid, 'step' => 'bootstrapDefaults', 'error' => $e->getMessage()];
            }

            $enabledChannels = [];
            try {
                $enabledChannels = $uncModel->listEnabledChannelNamesByUser($uid);
            } catch (Throwable $e) {
                $errors[] = ['user_id' => $uid, 'step' => 'listEnabledChannels', 'error' => $e->getMessage()];
                $skipped++;
                continue;
            }

            if (in_array('line', $enabledChannels, true)) {
                $lineUserId = $this->getLineUserId($uid);
                if ($lineUserId === '') {
                    $errors[] = ['user_id' => $uid, 'step' => 'lineUserId', 'error' => 'Missing line_user_id'];
                    $skipped++;
                    continue;
                }

                try {
                    $messages = $ackUrl !== ''
                        ? [$this->buildLineAckTemplate($message, $ackUrl)]
                        : [['type' => 'text', 'text' => $message]];
                    $resp = $line->pushMessage($lineUserId, $messages);
                    if (($resp['ok'] ?? false) === true) {
                        $sentLine++;
                    } else {
                        $errors[] = ['user_id' => $uid, 'step' => 'linePush', 'resp' => $resp];
                    }
                } catch (Throwable $e) {
                    $errors[] = ['user_id' => $uid, 'step' => 'linePush', 'error' => $e->getMessage()];
                }
            } else {
                // LINE channel disabled for this user
                $skipped++;
            }

            if ($sendEmail) {
                $emails = $this->getUserEmails($uid);
                if (!empty($emails)) {
                    $subject = $emailSubject !== '' ? $emailSubject : 'แจ้งเตือนงาน';
                    foreach ($emails as $email) {
                        $emailResp = $this->sendEmail($email, $subject, $message . ($ackUrl !== '' ? "\n\nรับทราบงาน: {$ackUrl}" : ''));
                        if (($emailResp['ok'] ?? false) === true) {
                            $sentEmail++;
                        } else {
                            $errors[] = [
                                'user_id' => $uid,
                                'email' => $email,
                                'step' => 'email',
                                'error' => (string) ($emailResp['error'] ?? 'send email failed'),
                            ];
                        }
                    }
                } else {
                    $errors[] = ['user_id' => $uid, 'step' => 'email', 'error' => 'Missing recipient email'];
                }
            }
        }

        return [
            'ok' => true,
            'recipients' => count($clean),
            'sent_line' => $sentLine,
            'sent_email' => $sentEmail,
            'skipped' => $skipped,
            'errors' => $errors,
        ];
    }

    /* ===================== internal helpers ===================== */

    private function getUserRoleId(int $userId): int
    {
        $stmt = $this->pdo->prepare("SELECT user_role_id FROM `user` WHERE user_id = :uid LIMIT 1");
        $stmt->bindValue(':uid', $userId, PDO::PARAM_INT);
        $stmt->execute();
        $role = $stmt->fetchColumn();
        return $role ? (int) $role : 1;
    }

    private function getLineUserId(int $userId): string
    {
        $stmt = $this->pdo->prepare('SELECT line_user_id FROM `user` WHERE user_id = :uid LIMIT 1');
        $stmt->bindValue(':uid', $userId, PDO::PARAM_INT);
        $stmt->execute();
        return trim((string) ($stmt->fetchColumn() ?? ''));
    }

    /**
     * @return array<int,string>
     */
    private function getUserEmails(int $userId): array
    {
        $stmt = $this->pdo->prepare('
            SELECT
                p.email AS person_email,
                ci.email AS organization_email
            FROM person p
            LEFT JOIN contact_info ci
                ON ci.organization_id = p.organization_id
            WHERE p.person_user_id = :uid
            LIMIT 1
        ');
        $stmt->bindValue(':uid', $userId, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

        $emails = [];
        foreach (['person_email', 'organization_email'] as $key) {
            $raw = trim((string) ($row[$key] ?? ''));
            if ($raw === '') {
                continue;
            }

            $parts = preg_split('/[;,\\s]+/', $raw) ?: [];
            foreach ($parts as $email) {
                $email = trim($email);
                if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    $emails[] = strtolower($email);
                }
            }
        }

        return array_values(array_unique($emails));
    }

    /**
     * @return array{ok:bool,error?:string}
     */
    private function sendEmail(string $to, string $subject, string $body): array
    {
        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
            return ['ok' => false, 'error' => 'Invalid recipient email'];
        }

        $host = trim((string) env('MAIL_HOST', ''));
        if ($host !== '') {
            return $this->sendEmailSmtp($to, $subject, $body);
        }

        $headers = [
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'From: ' . (env('MAIL_FROM', 'no-reply@localhost') ?: 'no-reply@localhost'),
        ];
        $ok = @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, implode("\r\n", $headers));
        return $ok ? ['ok' => true] : ['ok' => false, 'error' => 'mail() failed; configure MAIL_HOST SMTP in .env'];
    }

    /**
     * @return array{ok:bool,error?:string}
     */
    private function sendEmailSmtp(string $to, string $subject, string $body): array
    {
        $host = trim((string) env('MAIL_HOST', ''));
        $port = (int) (env('MAIL_PORT', '587') ?: '587');
        $username = trim((string) env('MAIL_USERNAME', ''));
        $password = (string) env('MAIL_PASSWORD', '');
        $encryption = strtolower(trim((string) env('MAIL_ENCRYPTION', 'tls')));
        $from = trim((string) (env('MAIL_FROM', '') ?: $username));
        $fromName = trim((string) env('MAIL_FROM_NAME', 'ICT8'));

        if ($host === '' || $from === '') {
            return ['ok' => false, 'error' => 'Missing MAIL_HOST or MAIL_FROM'];
        }

        $remote = ($encryption === 'ssl' ? 'ssl://' : '') . $host . ':' . $port;
        $errno = 0;
        $errstr = '';
        $fp = @stream_socket_client($remote, $errno, $errstr, 15, STREAM_CLIENT_CONNECT);
        if (!$fp) {
            return ['ok' => false, 'error' => "SMTP connect failed: {$errstr} ({$errno})"];
        }

        stream_set_timeout($fp, 20);

        $read = function () use ($fp): string {
            $data = '';
            while (($line = fgets($fp, 515)) !== false) {
                $data .= $line;
                if (strlen($line) >= 4 && $line[3] === ' ') {
                    break;
                }
            }
            return $data;
        };

        $write = function (string $command) use ($fp): void {
            fwrite($fp, $command . "\r\n");
        };

        $expect = function (array $codes, string $step) use ($read): ?string {
            $resp = $read();
            $code = (int) substr($resp, 0, 3);
            if (!in_array($code, $codes, true)) {
                return "{$step} failed: " . trim($resp);
            }
            return null;
        };

        $err = $expect([220], 'connect');
        if ($err !== null) {
            fclose($fp);
            return ['ok' => false, 'error' => $err];
        }

        $serverName = $_SERVER['SERVER_NAME'] ?? 'localhost';
        $write('EHLO ' . $serverName);
        $err = $expect([250], 'EHLO');
        if ($err !== null) {
            fclose($fp);
            return ['ok' => false, 'error' => $err];
        }

        if ($encryption === 'tls') {
            $write('STARTTLS');
            $err = $expect([220], 'STARTTLS');
            if ($err !== null) {
                fclose($fp);
                return ['ok' => false, 'error' => $err];
            }
            if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                fclose($fp);
                return ['ok' => false, 'error' => 'TLS negotiation failed'];
            }
            $write('EHLO ' . $serverName);
            $err = $expect([250], 'EHLO after STARTTLS');
            if ($err !== null) {
                fclose($fp);
                return ['ok' => false, 'error' => $err];
            }
        }

        if ($username !== '') {
            $write('AUTH LOGIN');
            $err = $expect([334], 'AUTH LOGIN');
            if ($err !== null) {
                fclose($fp);
                return ['ok' => false, 'error' => $err];
            }
            $write(base64_encode($username));
            $err = $expect([334], 'AUTH username');
            if ($err !== null) {
                fclose($fp);
                return ['ok' => false, 'error' => $err];
            }
            $write(base64_encode($password));
            $err = $expect([235], 'AUTH password');
            if ($err !== null) {
                fclose($fp);
                return ['ok' => false, 'error' => $err];
            }
        }

        $write('MAIL FROM:<' . $from . '>');
        $err = $expect([250], 'MAIL FROM');
        if ($err !== null) {
            fclose($fp);
            return ['ok' => false, 'error' => $err];
        }

        $write('RCPT TO:<' . $to . '>');
        $err = $expect([250, 251], 'RCPT TO');
        if ($err !== null) {
            fclose($fp);
            return ['ok' => false, 'error' => $err];
        }

        $write('DATA');
        $err = $expect([354], 'DATA');
        if ($err !== null) {
            fclose($fp);
            return ['ok' => false, 'error' => $err];
        }

        $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
        $encodedFromName = '=?UTF-8?B?' . base64_encode($fromName) . '?=';
        $headers = [
            'Date: ' . date('r'),
            'From: ' . $encodedFromName . ' <' . $from . '>',
            'To: <' . $to . '>',
            'Subject: ' . $encodedSubject,
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
        ];
        $message = implode("\r\n", $headers) . "\r\n\r\n" . str_replace(["\r\n", "\r"], "\n", $body);
        $message = str_replace("\n.", "\n..", $message);
        fwrite($fp, str_replace("\n", "\r\n", $message) . "\r\n.\r\n");

        $err = $expect([250], 'message body');
        if ($err !== null) {
            fclose($fp);
            return ['ok' => false, 'error' => $err];
        }

        $write('QUIT');
        fclose($fp);
        return ['ok' => true];
    }

    private function buildLineAckTemplate(string $message, string $ackUrl): array
    {
        return [
            'type' => 'template',
            'altText' => $message,
            'template' => [
                'type' => 'buttons',
                'text' => mb_substr($message, 0, 160),
                'actions' => [
                    [
                        'type' => 'uri',
                        'label' => 'รับทราบงาน',
                        'uri' => $ackUrl,
                    ],
                ],
            ],
        ];
    }

    private function resolveRequestNotificationTypeId(int $requestTypeId): int
    {
        // default mapping ตาม requirement
        $desired = 0;
        switch ($requestTypeId) {
            case 3: // repair
                $desired = self::NOTIF_TYPE_REQUEST_REPAIR;
                break;
            case 4: // other
                $desired = self::NOTIF_TYPE_REQUEST_OTHER;
                break;
            case 2: // conference
                $desired = self::NOTIF_TYPE_REQUEST_CONFERENCE;
                break;
            default:
                $desired = 0;
        }

        $typeModel = new NotificationTypeModel($this->pdo);

        // 1) ถ้า desired มีจริงใน DB ก็ใช้เลย
        if ($desired > 0 && $typeModel->existsById($desired)) {
            return $desired;
        }

        // 2) fallback by known names (รองรับ typo: conferance)
        $fallbackNames = [];
        if ($requestTypeId === 3) {
            $fallbackNames = ['request_repair_pending'];
        } elseif ($requestTypeId === 4) {
            $fallbackNames = ['request_other_pending'];
        } elseif ($requestTypeId === 2) {
            $fallbackNames = ['request_conference_pending', 'request_conferance_pending'];
        }

        foreach ($fallbackNames as $name) {
            $row = $typeModel->findByName($name);
            if ($row && isset($row['notification_type_id']) && is_numeric($row['notification_type_id'])) {
                return (int) $row['notification_type_id'];
            }
        }

        // 3) fallback hard-coded (เผื่อ DB ใช้ id เดิม)
        if ($requestTypeId === 2 && $typeModel->existsById(4)) {
            return 4;
        }

        throw new RuntimeException('Cannot resolve notification_type_id for request_type=' . $requestTypeId);
    }

    private function buildRequestMessage(int $requestTypeId, int $requestId, string $subject = ''): string
    {
        $subject = trim($subject);
        $suffix = $subject !== '' ? (" — " . $subject) : '';

        // สร้างลิงก์สำหรับตรวจสอบ/อนุมัติคำขอ
        $link = $this->buildCheckRequestUrl($requestId);
        $linkLine = $link !== '' ? ("\nตรวจสอบ/อนุมัติ: " . $link) : '';

        if ($requestTypeId === 3) {
            return "แจ้งเสีย (#{$requestId}){$suffix}{$linkLine}";
        }
        if ($requestTypeId === 4) {
            return "คำร้องอื่น ๆ (#{$requestId}){$suffix}{$linkLine}";
        }
        if ($requestTypeId === 2) {
            return "ขอใช้ห้องประชุม (#{$requestId}){$suffix}{$linkLine}";
        }

        return "มีคำขอใหม่เข้ามา (#{$requestId}){$suffix}{$linkLine}";
    }

    private function buildCheckRequestUrl(int $requestId): string
    {
        $requestId = max(0, $requestId);
        if ($requestId <= 0)
            return '';

        // ถ้ามี API_BASE ใน env (เช่น ngrok) ให้ derive base url จาก host ของ request ณ runtime จะดีกว่า
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host = (string) ($_SERVER['HTTP_HOST'] ?? '');
        if ($host === '')
            return '';

        $basePath = env('BASE_PATH', '/ict8') ?: '/ict8';
        if ($basePath === '')
            $basePath = '/ict8';
        if ($basePath[0] !== '/')
            $basePath = '/' . $basePath;

        return $scheme . '://' . $host . rtrim($basePath, '/') . '/check_request.html?request_id=' . $requestId;
    }
}

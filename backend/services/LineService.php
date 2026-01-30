<?php
// backend/services/LineService.php
declare(strict_types=1);

class LineService
{
    private string $accessToken;

    public function __construct(string $accessToken)
    {
        $this->accessToken = $accessToken;
    }

    /**
     * ยิง HTTP ไป LINE Messaging API
     * - รองรับ JSON body หรือไม่มี body
     * - คืน ok/http/data/raw/error ให้ debug ได้ง่าย
     */
    private function request(string $method, string $url, ?array $jsonBody = null, array $headers = []): array
{
    $ch = curl_init($url);

    $methodU = strtoupper($method);

    $baseHeaders = [
        'Authorization: Bearer ' . $this->accessToken,
    ];

    // ถ้ามี body เป็น JSON
    if ($jsonBody !== null) {
        $baseHeaders[] = 'Content-Type: application/json';
    }

    // ✅ FIX: POST/PUT/PATCH ที่ไม่มี body ให้ส่ง Content-Length: 0
    $needsLen0 = in_array($methodU, ['POST', 'PUT', 'PATCH'], true) && $jsonBody === null;
    if ($needsLen0) {
        $baseHeaders[] = 'Content-Length: 0';
    }

    $allHeaders = array_merge($baseHeaders, $headers);

    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $methodU);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $allHeaders);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);

    if ($jsonBody !== null) {
        $payload = json_encode($jsonBody, JSON_UNESCAPED_UNICODE);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    } elseif ($needsLen0) {
        // ✅ ให้ cURL ส่ง body ว่างจริง เพื่อให้มี Content-Length ออกไป
        curl_setopt($ch, CURLOPT_POSTFIELDS, '');
    }

    $resp = curl_exec($ch);
    $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    $curlErrNo = curl_errno($ch);

    curl_close($ch);

    if ($resp === false) {
        return [
            'ok' => false,
            'http' => $httpCode,
            'error' => $curlErr ?: 'cURL error',
            'errno' => $curlErrNo,
            'raw' => null,
            'data' => null,
            'url' => $url,
            'method' => $methodU,
        ];
    }

    $trim = trim((string)$resp);
    $decoded = null;
    $jsonOk = false;

    if ($trim !== '') {
        $decoded = json_decode($resp, true);
        $jsonOk = (json_last_error() === JSON_ERROR_NONE);
    }

    return [
        'ok' => $httpCode >= 200 && $httpCode < 300,
        'http' => $httpCode,
        'data' => $jsonOk ? $decoded : null,
        'raw' => $resp,
        'url' => $url,
        'method' => $methodU,
    ];
}


    /** Reply message (ใช้ใน webhook) */
    public function replyMessage(string $replyToken, array $messages): array
    {
        return $this->request('POST', 'https://api.line.me/v2/bot/message/reply', [
            'replyToken' => $replyToken,
            'messages' => $messages
        ]);
    }

    /** Push message (optional: ใช้ทดสอบ/แจ้งเตือนผู้ใช้) */
    public function pushMessage(string $userId, array $messages): array
    {
        return $this->request('POST', 'https://api.line.me/v2/bot/message/push', [
            'to' => $userId,
            'messages' => $messages
        ]);
    }

    /** Link rich menu ให้ user */
    public function linkRichMenuToUser(string $userId, string $richMenuId): array
    {
        $url = "https://api.line.me/v2/bot/user/{$userId}/richmenu/{$richMenuId}";
        // LINE ใช้ POST แบบไม่มี body
        return $this->request('POST', $url, null);
    }

    /** Unlink rich menu ออกจาก user (แนะนำให้มี เผื่ออยากเคลียร์ก่อน link) */
    public function unlinkRichMenuFromUser(string $userId): array
    {
        $url = "https://api.line.me/v2/bot/user/{$userId}/richmenu";
        return $this->request('DELETE', $url, null);
    }
}

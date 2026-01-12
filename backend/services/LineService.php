<?php
// backend/services/LineService.php

class LineService
{
    private string $accessToken;

    public function __construct(string $accessToken)
    {
        $this->accessToken = $accessToken;
    }

    private function request(string $method, string $url, ?array $jsonBody = null, array $headers = []): array
    {
        $ch = curl_init($url);
        $baseHeaders = [
            'Authorization: Bearer ' . $this->accessToken,
        ];
        if ($jsonBody !== null) {
            $baseHeaders[] = 'Content-Type: application/json';
        }
        $allHeaders = array_merge($baseHeaders, $headers);

        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $allHeaders);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

        if ($jsonBody !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($jsonBody, JSON_UNESCAPED_UNICODE));
        }

        $resp = curl_exec($ch);
        $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);

        if ($resp === false) {
            return ['ok' => false, 'http' => $httpCode, 'error' => $err];
        }

        $decoded = json_decode($resp, true);
        return ['ok' => $httpCode >= 200 && $httpCode < 300, 'http' => $httpCode, 'data' => $decoded, 'raw' => $resp];
    }

    public function replyMessage(string $replyToken, array $messages): array
    {
        return $this->request('POST', 'https://api.line.me/v2/bot/message/reply', [
            'replyToken' => $replyToken,
            'messages' => $messages
        ]);
    }

    public function linkRichMenuToUser(string $userId, string $richMenuId): array
    {
        $url = "https://api.line.me/v2/bot/user/{$userId}/richmenu/{$richMenuId}";
        return $this->request('POST', $url, null);
    }
}

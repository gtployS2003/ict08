<?php
// backend/helpers/validator.php
declare(strict_types=1);

function require_fields(array $data, array $fields): array {
    $missing = [];
    foreach ($fields as $f) {
        if (!array_key_exists($f, $data) || $data[$f] === null || $data[$f] === '') {
            $missing[] = $f;
        }
    }
    return $missing;
}

function read_json_body(): array {
    $raw = file_get_contents('php://input') ?: '';
    if ($raw === '') return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function bearer_token(): ?string {
    $hdr = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if ($hdr === '') return null;
    if (preg_match('/Bearer\s+(.*)$/i', $hdr, $m)) {
        return trim($m[1]);
    }
    return null;
}

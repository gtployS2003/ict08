<?php
// backend/config/env.php
declare(strict_types=1);

function env_load(string $envFilePath): void {
    if (!file_exists($envFilePath)) return;

    $lines = file($envFilePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;

        $parts = explode('=', $line, 2);
        if (count($parts) !== 2) continue;

        $key = trim($parts[0]);
        $val = trim($parts[1]);

        // remove wrapping quotes
        if ((str_starts_with($val, '"') && str_ends_with($val, '"')) ||
            (str_starts_with($val, "'") && str_ends_with($val, "'"))) {
            $val = substr($val, 1, -1);
        }

        if (getenv($key) === false) {
            putenv("$key=$val");
            $_ENV[$key] = $val;
        }
    }
}

function env(string $key, ?string $default = null): ?string {
    $v = getenv($key);
    if ($v === false) return $default;
    return $v;
}


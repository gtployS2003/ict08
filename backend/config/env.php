<?php
// backend/config/env.php
declare(strict_types=1);

// ✅ รองรับ PHP < 8.0 (กัน 500)
if (!function_exists('str_starts_with')) {
    function str_starts_with($haystack, $needle): bool {
        return $needle === '' || strpos((string)$haystack, (string)$needle) === 0;
    }
}

if (!function_exists('str_ends_with')) {
    function str_ends_with($haystack, $needle): bool {
        $haystack = (string)$haystack;
        $needle   = (string)$needle;
        if ($needle === '') return true;
        $len = strlen($needle);
        return substr($haystack, -$len) === $needle;
    }
}

function env_load(string $envFilePath): void
{
    if (!file_exists($envFilePath)) return;

    $lines = file($envFilePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;

        $parts = explode('=', $line, 2);
        if (count($parts) !== 2) continue;

        $key = trim($parts[0]);
        $val = trim($parts[1]);

        // ถ้าไม่ได้ครอบด้วย quotes ให้ตัด inline comment (# ...)
        $isQuoted =
            (str_starts_with($val, '"') && str_ends_with($val, '"')) ||
            (str_starts_with($val, "'") && str_ends_with($val, "'"));

        if (!$isQuoted) {
            $hashPos = strpos($val, '#');
            if ($hashPos !== false) {
                $val = rtrim(substr($val, 0, $hashPos));
            }
        }

        // remove wrapping quotes
        if ((str_starts_with($val, '"') && str_ends_with($val, '"')) ||
            (str_starts_with($val, "'") && str_ends_with($val, "'"))) {
            $val = substr($val, 1, -1);
        }

        if ($key === '') continue;

        // ✅ แนะนำให้ "ทับค่าเดิม" ได้เสมอ (กันกรณีค้างค่าเก่า)
        putenv("$key=$val");
        $_ENV[$key] = $val;
    }
}

function env(string $key, ?string $default = null): ?string
{
    $v = getenv($key);
    if ($v === false) return $default;
    return $v;
}
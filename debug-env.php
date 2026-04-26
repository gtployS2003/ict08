<?php
$envPath = __DIR__ . '/backend/.env';
$serverName = $_SERVER['SERVER_NAME'] ?? 'unknown';

echo "Test Environment Debug\n";
echo "======================\n";
echo "Server: $serverName\n";
echo "ENV Path: $envPath\n";
echo "File Exists: " . (file_exists($envPath) ? 'YES' : 'NO') . "\n";
echo "Is Readable: " . (is_readable($envPath) ? 'YES' : 'NO') . "\n";

if (file_exists($envPath)) {
  $content = file_get_contents($envPath);
  echo "Content Length: " . strlen($content) . " bytes\n";
  echo "First 200 chars:\n" . substr($content, 0, 200) . "\n";
  
  // Parse ENV
  $lines = explode("\n", $content);
  $liffLine = '';
  foreach ($lines as $line) {
    if (strpos($line, 'LIFF_ID') !== false) {
      $liffLine = $line;
      break;
    }
  }
  echo "LIFF Line: $liffLine\n";
}
?>

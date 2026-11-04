<?php
/**
 * Sinkronisasi Pengaturan Terpusat Lintas Perangkat (Multi-Device Persistence)
 * Menyimpan konfigurasi Asisten Tiara ke direktori server .data/ yang dilindungi .htaccess
 * sehingga seluruh perangkat (Laptop, Tablet, HP) yang mengakses server ini langsung
 * memuat pengaturan yang sama tanpa perlu mengatur ulang.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

$projectRoot = dirname(__DIR__, 2);
if (!is_dir($projectRoot . '/src') && is_dir(dirname(__DIR__) . '/assets')) {
    // Jika dijalankan langsung dari folder dist/ hasil build di webroot
    $projectRoot = dirname(__DIR__);
}

$dataDir = $projectRoot . DIRECTORY_SEPARATOR . '.data';
$settingsFile = $dataDir . DIRECTORY_SEPARATOR . 'tiara-settings.json';

if (!is_dir($dataDir)) {
    @mkdir($dataDir, 0750, true);
}

$htaccessFile = $dataDir . DIRECTORY_SEPARATOR . '.htaccess';
if (!file_exists($htaccessFile)) {
    @file_put_contents(
        $htaccessFile,
        "<IfModule mod_authz_core.c>\n  Require all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n  Order deny,allow\n  Deny from all\n</IfModule>\n"
    );
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    if (!file_exists($settingsFile)) {
        echo json_encode(['ok' => true, 'found' => false]);
        exit;
    }
    $raw = @file_get_contents($settingsFile);
    $parsed = $raw ? json_decode($raw, true) : null;
    if (!is_array($parsed) || !isset($parsed['settings'])) {
        echo json_encode(['ok' => true, 'found' => false]);
        exit;
    }
    echo json_encode([
        'ok' => true,
        'found' => true,
        'updatedAt' => $parsed['updatedAt'] ?? null,
        'settings' => $parsed['settings'],
        'elevenVoices' => $parsed['elevenVoices'] ?? null,
        'cartesiaVoices' => $parsed['cartesiaVoices'] ?? null,
    ]);
    exit;
}

if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    if ($rawInput === false || strlen($rawInput) > 512000) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'message' => 'Ukuran payload tidak valid']);
        exit;
    }
    $incoming = json_decode($rawInput, true);
    if (!is_array($incoming) || !isset($incoming['settings']) || !is_array($incoming['settings'])) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'message' => 'Format pengaturan tidak valid']);
        exit;
    }

    $existing = [];
    if (file_exists($settingsFile)) {
        $prev = json_decode((string) @file_get_contents($settingsFile), true);
        if (is_array($prev)) {
            $existing = $prev;
        }
    }

    $updatedAt = gmdate('c');
    $toSave = array_merge($existing, [
        'updatedAt' => $updatedAt,
        'settings' => $incoming['settings'],
    ]);
    if (isset($incoming['elevenVoices']) && is_array($incoming['elevenVoices'])) {
        $toSave['elevenVoices'] = $incoming['elevenVoices'];
    }
    if (isset($incoming['cartesiaVoices']) && is_array($incoming['cartesiaVoices'])) {
        $toSave['cartesiaVoices'] = $incoming['cartesiaVoices'];
    }

    $tmpFile = $settingsFile . '.tmp';
    if (@file_put_contents($tmpFile, json_encode($toSave, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)) === false) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'message' => 'Gagal menulis file pengaturan di server']);
        exit;
    }
    @rename($tmpFile, $settingsFile);

    echo json_encode(['ok' => true, 'updatedAt' => $updatedAt]);
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'message' => 'Method not allowed']);

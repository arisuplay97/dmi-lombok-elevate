<?php
/**
 * Sinkronisasi Data Utama Lintas Perangkat (Web Desktop <-> Mobile PWA)
 * Menyimpan agenda, notulen rapat, tugas tindak lanjut, penerima WA, dan log pengiriman
 * ke direktori .data/tiara-state.json yang dilindungi .htaccess.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

$projectRoot = dirname(__DIR__, 2);
if (!is_dir($projectRoot . '/src') && is_dir(dirname(__DIR__) . '/assets')) {
    $projectRoot = dirname(__DIR__);
}

$dataDir = $projectRoot . DIRECTORY_SEPARATOR . '.data';
$stateFile = $dataDir . DIRECTORY_SEPARATOR . 'tiara-state.json';

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
    if (!file_exists($stateFile)) {
        echo json_encode(['ok' => true, 'found' => false]);
        exit;
    }
    $raw = @file_get_contents($stateFile);
    $parsed = $raw ? json_decode($raw, true) : null;
    if (!is_array($parsed) || !isset($parsed['agendas'])) {
        echo json_encode(['ok' => true, 'found' => false]);
        exit;
    }
    echo json_encode([
        'ok' => true,
        'found' => true,
        'updatedAt' => $parsed['updatedAt'] ?? null,
        'agendas' => $parsed['agendas'] ?? null,
        'notulenList' => $parsed['notulenList'] ?? null,
        'tugasList' => $parsed['tugasList'] ?? null,
        'waLogs' => $parsed['waLogs'] ?? null,
        'recipients' => $parsed['recipients'] ?? null,
    ]);
    exit;
}

if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    if ($rawInput === false || strlen($rawInput) > 10485760) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'message' => 'Ukuran payload state terlalu besar']);
        exit;
    }
    $incoming = json_decode($rawInput, true);
    if (!is_array($incoming) || !isset($incoming['agendas']) || !is_array($incoming['agendas'])) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'message' => 'Format data state tidak valid']);
        exit;
    }

    $updatedAt = gmdate('c');
    $toSave = [
        'updatedAt' => $updatedAt,
        'agendas' => $incoming['agendas'],
        'notulenList' => $incoming['notulenList'] ?? [],
        'tugasList' => $incoming['tugasList'] ?? [],
        'waLogs' => $incoming['waLogs'] ?? [],
        'recipients' => $incoming['recipients'] ?? [],
    ];

    $tmpFile = $stateFile . '.tmp';
    if (@file_put_contents($tmpFile, json_encode($toSave, JSON_UNESCAPED_SLASHES)) === false) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'message' => 'Gagal menulis state di server']);
        exit;
    }
    @rename($tmpFile, $stateFile);

    echo json_encode(['ok' => true, 'updatedAt' => $updatedAt]);
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'message' => 'Method not allowed']);

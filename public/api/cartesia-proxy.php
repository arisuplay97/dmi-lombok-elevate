<?php
/**
 * Relay Anti-CORS Resmi untuk Cartesia Sonic TTS API (https://api.cartesia.ai)
 * Meneruskan header X-API-Key / Authorization & Cartesia-Version secara aman.
 */
header('Cache-Control: no-store');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$endpoint = isset($_GET['endpoint']) ? trim((string) $_GET['endpoint']) : '';
$allowed = ['/tts/bytes', '/voices'];
if (!in_array($endpoint, $allowed, true)) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(400);
    echo json_encode(['message' => 'Endpoint Cartesia tidak diizinkan']);
    exit;
}

$apiKey = $_SERVER['HTTP_X_API_KEY'] ?? '';
if ($apiKey === '' && isset($_SERVER['HTTP_AUTHORIZATION'])) {
    if (preg_match('/^Bearer\s+(.+)$/i', $_SERVER['HTTP_AUTHORIZATION'], $m)) {
        $apiKey = trim($m[1]);
    }
}
$version = $_SERVER['HTTP_CARTESIA_VERSION'] ?? '2025-04-16';
$baseUrl = $_SERVER['HTTP_X_CARTESIA_BASE'] ?? 'https://api.cartesia.ai';
$baseUrl = rtrim($baseUrl, '/');

if (!preg_match('#^https://([a-z0-9-]+\.)*cartesia\.ai(/.*)?$#i', $baseUrl)) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(400);
    echo json_encode(['message' => 'Base URL Cartesia tidak valid']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$targetUrl = $baseUrl . $endpoint;
if ($endpoint === '/voices' && isset($_GET['limit'])) {
    $targetUrl .= '?limit=' . intval($_GET['limit']);
}

$ch = curl_init($targetUrl);
$headers = [
    'X-API-Key: ' . $apiKey,
    'Authorization: Bearer ' . $apiKey,
    'Cartesia-Version: ' . $version,
];

if ($method === 'POST') {
    $rawBody = file_get_contents('php://input');
    $headers[] = 'Content-Type: application/json';
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $rawBody ?: '{}');
} else {
    $headers[] = 'Accept: application/json';
}

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_SSL_VERIFYPEER => true,
]);

$responseBody = curl_exec($ch);
$httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = (string) curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$curlErr = curl_error($ch);
curl_close($ch);

if ($responseBody === false) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(502);
    echo json_encode(['message' => 'Gagal menghubungi Cartesia API: ' . $curlErr]);
    exit;
}

if ($contentType !== '') {
    header('Content-Type: ' . $contentType);
}
http_response_code($httpCode > 0 ? $httpCode : 200);
echo $responseBody;

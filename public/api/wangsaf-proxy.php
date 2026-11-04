<?php
/**
 * Relay Server-to-Server Resmi untuk Wangsaf WhatsApp API v1 (https://api.wangsaf.com/v1)
 * Menghindari blokir CORS browser pada produksi Laragon Apache/Nginx tanpa mengekspos kunci di URL.
 */
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["status" => 405, "message" => "Method Not Allowed"]);
    exit;
}

$allowedPaths = ["/device/status", "/chat/send-text"];
$subPath = isset($_GET["path"]) ? (string) $_GET["path"] : "";

if (!in_array($subPath, $allowedPaths, true)) {
    http_response_code(400);
    echo json_encode(["status" => 400, "message" => "Endpoint Wangsaf tidak diizinkan"]);
    exit;
}

$apiKey = "";
if (!empty($_SERVER["HTTP_API_KEY"])) {
    $apiKey = trim($_SERVER["HTTP_API_KEY"]);
} elseif (function_exists("getallheaders")) {
    foreach (getallheaders() as $k => $v) {
        if (strtolower($k) === "api-key") {
            $apiKey = trim($v);
            break;
        }
    }
}

if ($apiKey === "") {
    http_response_code(401);
    echo json_encode(["status" => 401, "message" => "Header Api-Key kosong"]);
    exit;
}

$rawBody = file_get_contents("php://input");
$targetUrl = "https://api.wangsaf.com/v1" . $subPath;

$ch = curl_init($targetUrl);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 20,
    CURLOPT_HTTPHEADER => [
        "Accept: application/json",
        "Content-Type: application/json",
        "Api-Key: " . $apiKey,
    ],
    CURLOPT_POSTFIELDS => $rawBody ?: "{}",
]);

$response = curl_exec($ch);
$httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr = curl_error($ch);
curl_close($ch);

if ($response === false) {
    http_response_code(502);
    echo json_encode(["status" => 502, "message" => "Gagal menghubungi server Wangsaf: " . $curlErr]);
    exit;
}

http_response_code($httpCode > 0 ? $httpCode : 200);
echo $response;

<?php
/**
 * Proxy PHP para backend-gateway (Node.js puerto 3001)
 */

// Permitir CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Manejar preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Obtener la ruta - mantener /api en la URL para el gateway
$requestUri = $_SERVER['REQUEST_URI'];
// El gateway espera /api/... así que lo mantenemos
$path = $requestUri;
if (empty($path) || $path === '/api' || $path === '/api/') $path = '/api';

// Asegurar que la query string se incluye (para OAuth code=xxx&state=xxx)
if (!empty($_SERVER['QUERY_STRING']) && strpos($path, '?') === false) {
    $path .= '?' . $_SERVER['QUERY_STRING'];
}

// URL del backend
$backendUrl = 'http://127.0.0.1:3001' . $path;

// Iniciar cURL
$ch = curl_init();

// Configurar la petición
curl_setopt($ch, CURLOPT_URL, $backendUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

// Método HTTP
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);

// Headers de la petición original
$headers = [];
$allHeaders = getallheaders();
if ($allHeaders === false) {
    $allHeaders = [];
}
foreach ($allHeaders as $name => $value) {
    $lowerName = strtolower($name);
    if ($lowerName !== 'host' && $lowerName !== 'content-length') {
        $headers[] = "$name: $value";
    }
}
// Asegurar que Authorization se pasa si existe en $_SERVER
if (empty($allHeaders['Authorization']) && !empty($_SERVER['HTTP_AUTHORIZATION'])) {
    $headers[] = "Authorization: " . $_SERVER['HTTP_AUTHORIZATION'];
}
// Para Apache con CGI/FastCGI que usa REDIRECT_HTTP_AUTHORIZATION
if (empty($allHeaders['Authorization']) && !empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
    $headers[] = "Authorization: " . $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
}
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

// Body para POST/PUT/PATCH
if (in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'PATCH'])) {
    $body = file_get_contents('php://input');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

// Ejecutar
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$error = curl_error($ch);
curl_close($ch);

// Manejar errores
if ($error) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Backend gateway unavailable', 'details' => $error]);
    exit;
}

// Responder
http_response_code($httpCode);
if ($contentType) {
    header('Content-Type: ' . $contentType);
}
echo $response;

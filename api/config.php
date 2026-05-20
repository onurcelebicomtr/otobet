<?php
define('DATA_DIR', __DIR__ . '/../data/');
define('UPLOAD_DIR', __DIR__ . '/../uploads/');
define('ADMIN_USER', 'admin');
define('ADMIN_PASS_HASH', password_hash('otobet2025', PASSWORD_BCRYPT));
define('TOKEN_SECRET', 'bb_s3cr3t_k3y_' . md5(__DIR__));
define('MAX_LOGIN_ATTEMPTS', 5);
define('LOGIN_BLOCK_MINUTES', 15);

// Hata mesajlarını gizle
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Güvenlik headerları
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
header('Strict-Transport-Security: max-age=31536000; includeSubDomains');

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed_origins = [$_SERVER['HTTP_HOST'] ?? '', 'localhost'];
if (in_array(parse_url($origin, PHP_URL_HOST), $allowed_origins)) {
    header('Access-Control-Allow-Origin: ' . $origin);
} else {
    header('Access-Control-Allow-Origin: ' . ($_SERVER['REQUEST_SCHEME'] ?? 'https') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost'));
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

function read_json($file) {
    $path = DATA_DIR . basename($file);
    if (!file_exists($path)) return [];
    return json_decode(file_get_contents($path), true) ?: [];
}

function write_json($file, $data) {
    $path = DATA_DIR . basename($file);
    $tmp = $path . '.tmp';
    file_put_contents($tmp, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
    rename($tmp, $path);
}

function generate_token($username) {
    $payload = [
        'user' => $username,
        'exp' => time() + 86400,
        'iat' => time()
    ];
    $data = base64_encode(json_encode($payload));
    $sig = hash_hmac('sha256', $data, TOKEN_SECRET);
    return $data . '.' . $sig;
}

function verify_token($token) {
    $parts = explode('.', $token);
    if (count($parts) !== 2) return false;
    [$data, $sig] = $parts;
    if (!hash_equals(hash_hmac('sha256', $data, TOKEN_SECRET), $sig)) return false;
    $payload = json_decode(base64_decode($data), true);
    if (!$payload || ($payload['exp'] ?? 0) < time()) return false;
    return $payload;
}

function check_auth() {
    $headers = getallheaders();
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    if (!$auth) {
        http_response_code(401);
        echo json_encode(['error' => 'Yetkisiz erişim']);
        exit;
    }
    $token = str_replace('Bearer ', '', $auth);
    $payload = verify_token($token);
    if (!$payload) {
        http_response_code(401);
        echo json_encode(['error' => 'Geçersiz veya süresi dolmuş oturum']);
        exit;
    }
    return $payload;
}

// Rate limiting
function check_rate_limit($action, $max, $window_minutes) {
    $file = DATA_DIR . '.rate_limits.json';
    $limits = file_exists($file) ? json_decode(file_get_contents($file), true) ?: [] : [];
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $key = $action . '_' . md5($ip);
    $now = time();
    $window = $window_minutes * 60;

    if (isset($limits[$key])) {
        $limits[$key] = array_filter($limits[$key], fn($t) => ($now - $t) < $window);
        if (count($limits[$key]) >= $max) {
            http_response_code(429);
            echo json_encode(['error' => 'Çok fazla deneme. ' . $window_minutes . ' dakika bekleyin.']);
            exit;
        }
    }

    $limits[$key][] = $now;
    file_put_contents($file, json_encode($limits), LOCK_EX);
}

// XSS temizleme
function sanitize($input) {
    if (is_array($input)) {
        return array_map('sanitize', $input);
    }
    return htmlspecialchars(strip_tags($input), ENT_QUOTES, 'UTF-8');
}

function sanitize_html($html) {
    $allowed = '<p><br><b><strong><i><em><u><h2><h3><h4><ul><ol><li><a><img><blockquote><span>';
    $clean = strip_tags($html, $allowed);
    $clean = preg_replace('/on\w+="[^"]*"/i', '', $clean);
    $clean = preg_replace('/on\w+=\'[^\']*\'/i', '', $clean);
    $clean = preg_replace('/javascript\s*:/i', '', $clean);
    return $clean;
}

function slug($text) {
    $tr = ['ç'=>'c','ğ'=>'g','ı'=>'i','ö'=>'o','ş'=>'s','ü'=>'u','Ç'=>'c','Ğ'=>'g','İ'=>'i','Ö'=>'o','Ş'=>'s','Ü'=>'u'];
    $text = strtr($text, $tr);
    $text = strtolower($text);
    $text = preg_replace('/[^a-z0-9]+/', '-', $text);
    return trim($text, '-');
}

function validate_slug($slug) {
    return preg_match('/^[a-z0-9-]+$/', $slug);
}

function validate_id($id) {
    return preg_match('/^[a-f0-9]+$/', $id);
}

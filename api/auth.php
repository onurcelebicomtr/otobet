<?php
require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Sadece POST']);
    exit;
}

check_rate_limit('login', MAX_LOGIN_ATTEMPTS, LOGIN_BLOCK_MINUTES);

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Geçersiz istek']);
    exit;
}

$user = trim($input['username'] ?? '');
$pass = $input['password'] ?? '';

if (empty($user) || empty($pass)) {
    http_response_code(400);
    echo json_encode(['error' => 'Kullanıcı adı ve şifre gerekli']);
    exit;
}

if ($user === ADMIN_USER && password_verify($pass, ADMIN_PASS_HASH)) {
    $token = generate_token($user);
    echo json_encode([
        'success' => true,
        'token' => $token
    ]);
} else {
    usleep(random_int(200000, 800000));
    http_response_code(401);
    echo json_encode(['error' => 'Kullanıcı adı veya şifre hatalı']);
}

<?php
require_once __DIR__ . '/config.php';
check_auth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Sadece POST']);
    exit;
}

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'Dosya yüklenemedi (hata: ' . ($_FILES['file']['error'] ?? 'dosya yok') . ')']);
    exit;
}

$file = $_FILES['file'];

if ($file['size'] > 5 * 1024 * 1024) {
    http_response_code(400);
    echo json_encode(['error' => 'Dosya 5MB dan büyük olamaz']);
    exit;
}

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$real_mime = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

$allowed_mimes = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
    'image/gif' => 'gif'
];

if (!isset($allowed_mimes[$real_mime])) {
    http_response_code(400);
    echo json_encode(['error' => 'Sadece resim dosyaları (JPG, PNG, WebP, GIF)']);
    exit;
}

$image_info = getimagesize($file['tmp_name']);
if ($image_info === false) {
    http_response_code(400);
    echo json_encode(['error' => 'Geçersiz resim dosyası']);
    exit;
}

if (!is_dir(UPLOAD_DIR)) mkdir(UPLOAD_DIR, 0755, true);

$ext = $allowed_mimes[$real_mime];
$name = bin2hex(random_bytes(12)) . '.' . $ext;
$path = UPLOAD_DIR . $name;

if (move_uploaded_file($file['tmp_name'], $path)) {
    chmod($path, 0644);
    echo json_encode(['success' => true, 'url' => 'uploads/' . $name]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Yükleme başarısız']);
}

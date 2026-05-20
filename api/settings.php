<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    echo json_encode(read_json('settings.json'));
    exit;
}

check_auth();

if ($method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        http_response_code(400);
        echo json_encode(['error' => 'Geçersiz veri']);
        exit;
    }

    $settings = read_json('settings.json');

    $allowed_keys = ['site_name', 'site_description', 'site_keywords', 'hero_title', 'hero_description', 'og_image', 'footer_text', 'social'];

    foreach ($input as $key => $value) {
        if (!in_array($key, $allowed_keys)) continue;
        if ($key === 'social' && is_array($value)) {
            $settings['social'] = [
                'twitter' => sanitize($value['twitter'] ?? ''),
                'instagram' => sanitize($value['instagram'] ?? ''),
                'telegram' => sanitize($value['telegram'] ?? '')
            ];
        } else {
            $settings[$key] = sanitize($value);
        }
    }

    write_json('settings.json', $settings);
    echo json_encode(['success' => true, 'settings' => $settings]);
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Geçersiz metod']);
}

<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $posts = read_json('posts.json');
    $slug = $_GET['slug'] ?? null;

    if ($slug) {
        if (!validate_slug($slug)) {
            http_response_code(400);
            echo json_encode(['error' => 'Geçersiz slug']);
            exit;
        }
        $post = null;
        foreach ($posts as $p) {
            if ($p['slug'] === $slug && $p['status'] === 'published') {
                $post = $p;
                break;
            }
        }
        echo json_encode($post ?: ['error' => 'Yazı bulunamadı']);
    } else {
        $published_only = !isset($_GET['all']);
        if ($published_only) {
            $posts = array_values(array_filter($posts, fn($p) => $p['status'] === 'published'));
        } else {
            check_auth();
        }
        // page_type filter
        $type = $_GET['type'] ?? null;
        if ($type) {
            $posts = array_values(array_filter($posts, fn($p) => ($p['page_type'] ?? 'blog') === $type));
        }
        usort($posts, fn($a, $b) => strtotime($b['created_at']) - strtotime($a['created_at']));
        echo json_encode($posts);
    }
    exit;
}

check_auth();

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || empty(trim($input['title'] ?? ''))) {
        http_response_code(400);
        echo json_encode(['error' => 'Başlık gerekli']);
        exit;
    }

    $posts = read_json('posts.json');
    $title = sanitize($input['title']);
    $post_slug = !empty($input['slug']) ? slug($input['slug']) : slug($title);

    foreach ($posts as $p) {
        if ($p['slug'] === $post_slug) {
            $post_slug .= '-' . substr(uniqid(), -4);
            break;
        }
    }

    $status = in_array($input['status'] ?? '', ['draft', 'published']) ? $input['status'] : 'draft';
    $heading = in_array($input['heading_tag'] ?? '', ['h1', 'h2', 'h3']) ? $input['heading_tag'] : 'h1';

    $post = [
        'id' => bin2hex(random_bytes(8)),
        'title' => $title,
        'slug' => $post_slug,
        'content' => sanitize_html($input['content'] ?? ''),
        'excerpt' => sanitize($input['excerpt'] ?? ''),
        'featured_image' => sanitize($input['featured_image'] ?? ''),
        'heading_tag' => $heading,
        'status' => $status,
        'seo_title' => sanitize($input['seo_title'] ?? ''),
        'seo_description' => sanitize($input['seo_description'] ?? ''),
        'seo_keywords' => sanitize($input['seo_keywords'] ?? ''),
        'category' => sanitize($input['category'] ?? ''),
        'author' => sanitize($input['author'] ?? 'Otobet'),
        'focus_keyword' => sanitize($input['focus_keyword'] ?? ''),
        'canonical' => sanitize($input['canonical'] ?? ''),
        'robots_meta' => sanitize($input['robots_meta'] ?? 'index, follow'),
        'page_type' => in_array($input['page_type'] ?? '', ['blog', 'homepage', 'giris']) ? $input['page_type'] : 'blog',
        'created_at' => date('Y-m-d H:i:s'),
        'updated_at' => date('Y-m-d H:i:s')
    ];

    $posts[] = $post;
    write_json('posts.json', $posts);
    echo json_encode(['success' => true, 'post' => $post]);
}

if ($method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = $input['id'] ?? '';

    if (!$id || !validate_id($id)) {
        http_response_code(400);
        echo json_encode(['error' => 'Geçersiz ID']);
        exit;
    }

    $posts = read_json('posts.json');
    $found = false;

    $status = in_array($input['status'] ?? '', ['draft', 'published']) ? $input['status'] : null;
    $heading = in_array($input['heading_tag'] ?? '', ['h1', 'h2', 'h3']) ? $input['heading_tag'] : null;

    foreach ($posts as &$post) {
        if ($post['id'] === $id) {
            $found = true;
            if (isset($input['title'])) $post['title'] = sanitize($input['title']);
            $post['slug'] = !empty($input['slug']) ? slug($input['slug']) : slug($post['title']);
            if (isset($input['content'])) $post['content'] = sanitize_html($input['content']);
            if (isset($input['excerpt'])) $post['excerpt'] = sanitize($input['excerpt']);
            if (isset($input['featured_image'])) $post['featured_image'] = sanitize($input['featured_image']);
            if ($heading) $post['heading_tag'] = $heading;
            if ($status) $post['status'] = $status;
            if (isset($input['seo_title'])) $post['seo_title'] = sanitize($input['seo_title']);
            if (isset($input['seo_description'])) $post['seo_description'] = sanitize($input['seo_description']);
            if (isset($input['seo_keywords'])) $post['seo_keywords'] = sanitize($input['seo_keywords']);
            if (isset($input['category'])) $post['category'] = sanitize($input['category']);
            if (isset($input['author'])) $post['author'] = sanitize($input['author']);
            if (isset($input['focus_keyword'])) $post['focus_keyword'] = sanitize($input['focus_keyword']);
            if (isset($input['canonical'])) $post['canonical'] = sanitize($input['canonical']);
            if (isset($input['robots_meta'])) $post['robots_meta'] = sanitize($input['robots_meta']);
            if (isset($input['page_type']) && in_array($input['page_type'], ['blog', 'homepage', 'giris'])) $post['page_type'] = $input['page_type'];
            $post['updated_at'] = date('Y-m-d H:i:s');
            break;
        }
    }

    if (!$found) {
        http_response_code(404);
        echo json_encode(['error' => 'Yazı bulunamadı']);
        exit;
    }

    write_json('posts.json', $posts);
    echo json_encode(['success' => true]);
}

if ($method === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = $input['id'] ?? '';

    if (!$id || !validate_id($id)) {
        http_response_code(400);
        echo json_encode(['error' => 'Geçersiz ID']);
        exit;
    }

    $posts = read_json('posts.json');
    $count = count($posts);
    $posts = array_values(array_filter($posts, fn($p) => $p['id'] !== $id));

    if (count($posts) === $count) {
        http_response_code(404);
        echo json_encode(['error' => 'Yazı bulunamadı']);
        exit;
    }

    write_json('posts.json', $posts);
    echo json_encode(['success' => true]);
}

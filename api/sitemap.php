<?php
require_once __DIR__ . '/config.php';
header('Content-Type: application/xml; charset=utf-8');

$host = ($_SERVER['REQUEST_SCHEME'] ?? 'https') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
$posts = read_json('posts.json');
$posts = array_filter($posts, fn($p) => $p['status'] === 'published');

echo '<?xml version="1.0" encoding="UTF-8"?>';
?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc><?=$host?>/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
<?php foreach ($posts as $post): ?>
  <url>
    <loc><?=$host?>/yazilar/<?=$post['slug']?></loc>
    <lastmod><?=date('Y-m-d', strtotime($post['updated_at']))?></lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
<?php endforeach; ?>
</urlset>

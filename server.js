const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 4002;
const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'otobet2025';
const TOKEN_SECRET = 'bb_local_dev_secret';

// MIME types
const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};

// Helpers
function readJSON(file) {
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function writeJSON(file, data) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}
function generateToken(user) {
  const payload = Buffer.from(JSON.stringify({ user, exp: Date.now() + 86400000 })).toString('base64');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
  return payload + '.' + sig;
}
function verifyToken(token) {
  if (!token) return null;
  const [data, sig] = token.replace('Bearer ', '').split('.');
  if (!data || !sig) return null;
  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('hex');
  if (sig !== expected) return null;
  const payload = JSON.parse(Buffer.from(data, 'base64').toString());
  if (payload.exp < Date.now()) return null;
  return payload;
}
function slug(text) {
  const tr = { 'ç':'c','ğ':'g','ı':'i','ö':'o','ş':'s','ü':'u','Ç':'c','Ğ':'g','İ':'i','Ö':'o','Ş':'s','Ü':'u' };
  return Object.entries(tr).reduce((s, [k, v]) => s.replace(new RegExp(k, 'g'), v), text)
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve({}); } });
  });
}
function parseMultipart(req) {
  return new Promise((resolve) => {
    const boundary = req.headers['content-type'].split('boundary=')[1];
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      const parts = buf.toString('binary').split('--' + boundary);
      let fileData = null, fileName = '';
      for (const part of parts) {
        if (part.includes('filename="')) {
          const nameMatch = part.match(/filename="([^"]+)"/);
          if (nameMatch) fileName = nameMatch[1];
          const headerEnd = part.indexOf('\r\n\r\n') + 4;
          const bodyEnd = part.lastIndexOf('\r\n');
          fileData = Buffer.from(part.substring(headerEnd, bodyEnd), 'binary');
        }
      }
      resolve({ fileData, fileName });
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;
  const method = req.method;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  // Sitemap
  if (pathname === '/api/sitemap.php' || pathname === '/sitemap.xml') {
    const posts = readJSON('posts.json').filter(p => p.status === 'published');
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    xml += `  <url><loc>http://localhost:${PORT}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>\n`;
    posts.forEach(p => { xml += `  <url><loc>http://localhost:${PORT}/yazilar/${p.slug}</loc><lastmod>${p.updated_at.substring(0,10)}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`; });
    xml += '</urlset>';
    res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
    res.end(xml);
    return;
  }

  // API Routes
  if (pathname === '/api/auth.php' && method === 'POST') {
    const input = await parseBody(req);
    if (input.username === ADMIN_USER && input.password === ADMIN_PASS) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, token: generateToken(input.username) }));
    } else {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Kullanıcı adı veya şifre hatalı' }));
    }
    return;
  }

  if (pathname === '/api/posts.php') {
    if (method === 'GET') {
      let posts = readJSON('posts.json');
      const s = url.searchParams.get('slug');
      if (s) {
        const post = posts.find(p => p.slug === s && p.status === 'published');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(post || { error: 'Yazı bulunamadı' }));
      } else {
        if (!url.searchParams.has('all')) posts = posts.filter(p => p.status === 'published');
        const typeFilter = url.searchParams.get('type');
        if (typeFilter) posts = posts.filter(p => (p.page_type || 'blog') === typeFilter);
        posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(posts));
      }
      return;
    }
    if (!verifyToken(req.headers.authorization)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Yetkisiz' }));
      return;
    }
    const input = await parseBody(req);
    let posts = readJSON('posts.json');

    if (method === 'POST') {
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const post = {
        id: crypto.randomBytes(8).toString('hex'),
        title: input.title || '', slug: input.slug || slug(input.title || ''),
        content: input.content || '', excerpt: input.excerpt || '',
        featured_image: input.featured_image || '', heading_tag: input.heading_tag || 'h1',
        status: input.status || 'draft', seo_title: input.seo_title || '',
        seo_description: input.seo_description || '', seo_keywords: input.seo_keywords || '',
        category: input.category || '', author: input.author || 'Otobet',
        focus_keyword: input.focus_keyword || '', canonical: input.canonical || '',
        robots_meta: input.robots_meta || 'index, follow',
        page_type: ['blog','homepage','giris'].includes(input.page_type) ? input.page_type : 'blog',
        created_at: now, updated_at: now
      };
      posts.push(post);
      writeJSON('posts.json', posts);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, post }));
    }
    if (method === 'PUT') {
      const idx = posts.findIndex(p => p.id === input.id);
      if (idx >= 0) {
        Object.assign(posts[idx], {
          ...input, slug: input.slug || slug(input.title || posts[idx].title),
          updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
        });
        writeJSON('posts.json', posts);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    }
    if (method === 'DELETE') {
      posts = posts.filter(p => p.id !== input.id);
      writeJSON('posts.json', posts);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    }
    return;
  }

  if (pathname === '/api/settings.php') {
    if (method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(readJSON('settings.json')));
      return;
    }
    if (!verifyToken(req.headers.authorization)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Yetkisiz' }));
      return;
    }
    const input = await parseBody(req);
    const settings = { ...readJSON('settings.json'), ...input };
    writeJSON('settings.json', settings);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, settings }));
    return;
  }

  if (pathname === '/api/upload.php' && method === 'POST') {
    if (!verifyToken(req.headers.authorization)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Yetkisiz' }));
      return;
    }
    const { fileData, fileName } = await parseMultipart(req);
    if (fileData) {
      const ext = path.extname(fileName).toLowerCase();
      const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      if (!allowed.includes(ext)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Sadece resim dosyaları' }));
        return;
      }
      const name = crypto.randomBytes(12).toString('hex') + ext;
      if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      fs.writeFileSync(path.join(UPLOAD_DIR, name), fileData);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, url: 'uploads/' + name }));
    } else {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Dosya bulunamadı' }));
    }
    return;
  }

  // Clean URL: /yazilar/slug -> post.html?s=slug
  let filePath;
  const yaziMatch = pathname.match(/^\/yazilar\/([a-z0-9-]+)\/?$/);
  if (yaziMatch) {
    filePath = path.join(__dirname, 'post.html');
    url.searchParams.set('s', yaziMatch[1]);
  } else {
    filePath = path.join(__dirname, pathname);
  }

  // Dizin ise index.html ekle
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // Static file
  const ext = path.extname(filePath);
  const mime = MIME[ext] || 'application/octet-stream';
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.writeHead(200, { 'Content-Type': mime + '; charset=utf-8' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404 - Sayfa bulunamadi</h1>');
  }
});

server.listen(PORT, () => {
  console.log(`\n  🟢 Otobet Blog çalışıyor!\n`);
  console.log(`  🌐 Site:   http://localhost:${PORT}`);
  console.log(`  🔧 Panel:  http://localhost:${PORT}/admin/`);
  console.log(`  👤 Giriş:  admin / otobet2025\n`);
});

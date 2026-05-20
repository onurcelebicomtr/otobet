const API = '../api/';
let token = localStorage.getItem('bb_token') || '';

if (token) { showApp(); } else { document.getElementById('login').style.display = 'flex'; }

// AUTH
function doLogin() {
  const user = document.getElementById('login-user').value;
  const pass = document.getElementById('login-pass').value;
  fetch(API + 'auth.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: user, password: pass })
  })
  .then(r => r.json())
  .then(d => {
    if (d.token) {
      token = d.token;
      localStorage.setItem('bb_token', token);
      showApp();
    } else {
      document.getElementById('login-err').textContent = d.error || 'Giriş başarısız';
    }
  });
}

function doLogout() {
  localStorage.removeItem('bb_token');
  location.reload();
}

function showApp() {
  document.getElementById('login').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  loadDashboard();
  loadSettings();
}

function headers() {
  return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
}

// TOAST
function toast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast toast-' + (type || 'success') + ' show';
  setTimeout(() => t.className = 'toast', 3000);
}

// NAVIGATION
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
  document.querySelectorAll('.sidebar-nav a').forEach(a => {
    if (a.getAttribute('onclick') && a.getAttribute('onclick').includes(name)) a.classList.add('active');
  });
  if (name === 'dashboard') loadDashboard();
  if (name === 'posts') loadPostsList();
  if (name === 'new-post') clearEditor();
  if (name === 'home-content') loadPageContent('homepage');
  if (name === 'giris-content') loadPageContent('giris');
}

// DASHBOARD
function loadDashboard() {
  fetch(API + 'posts.php?all=1', { headers: headers() })
  .then(r => r.json())
  .then(posts => {
    const pub = posts.filter(p => p.status === 'published');
    const drf = posts.filter(p => p.status === 'draft');
    document.getElementById('stat-total').textContent = posts.length;
    document.getElementById('stat-published').textContent = pub.length;
    document.getElementById('stat-draft').textContent = drf.length;

    const recent = document.getElementById('recent-posts');
    if (!posts.length) {
      recent.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:20px">Henüz yazı yok. İlk yazınızı ekleyin!</p>';
      return;
    }
    recent.innerHTML = '<table><thead><tr><th>Başlık</th><th>Durum</th><th>Tarih</th></tr></thead><tbody>' +
      posts.slice(0, 5).map(p => `<tr>
        <td><a href="#" onclick="editPost('${p.id}')" style="color:var(--navy);font-weight:500">${p.title}</a></td>
        <td><span class="status-badge status-${p.status}">${p.status === 'published' ? 'Yayında' : 'Taslak'}</span></td>
        <td style="color:var(--text-light);font-size:13px">${new Date(p.created_at).toLocaleDateString('tr-TR')}</td>
      </tr>`).join('') + '</tbody></table>';
  });
}

// POSTS LIST
function loadPostsList() {
  fetch(API + 'posts.php?all=1', { headers: headers() })
  .then(r => r.json())
  .then(posts => {
    const tbody = document.getElementById('posts-table');
    if (!posts.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-light);padding:40px">Henüz yazı yok</td></tr>';
      return;
    }
    const typeLabels = {blog:'Blog',homepage:'Ana Sayfa',giris:'Giris'};
    tbody.innerHTML = posts.map(p => `<tr>
      <td><strong>${p.title}</strong><br><span style="font-size:12px;color:var(--text-light)">/${p.slug}</span></td>
      <td><span style="font-size:12px;background:var(--bg);padding:2px 8px;border-radius:10px">${typeLabels[p.page_type] || 'Blog'}</span></td>
      <td>${p.category || '-'}</td>
      <td><span class="status-badge status-${p.status}">${p.status === 'published' ? 'Yayında' : 'Taslak'}</span></td>
      <td style="font-size:13px">${new Date(p.created_at).toLocaleDateString('tr-TR')}</td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="editPost('${p.id}')">Düzenle</button>
        <button class="btn btn-red btn-sm" onclick="deletePost('${p.id}','${p.title}')">Sil</button>
      </td>
    </tr>`).join('');
  });
}

// EDITOR
function clearEditor() {
  document.getElementById('editor-title').textContent = 'Yeni Yazı';
  document.getElementById('post-id').value = '';
  document.getElementById('post-title').value = '';
  document.getElementById('post-slug').value = '';
  document.getElementById('post-heading').value = 'h1';
  document.getElementById('post-content').innerHTML = '';
  document.getElementById('post-excerpt').value = '';
  document.getElementById('post-image').value = '';
  document.getElementById('post-category').value = '';
  document.getElementById('post-author').value = 'Otobet';
  document.getElementById('post-page-type').value = 'blog';
  document.getElementById('post-seo-title').value = '';
  document.getElementById('post-seo-desc').value = '';
  document.getElementById('post-seo-keys').value = '';
  document.getElementById('post-focus-keyword').value = '';
  document.getElementById('post-canonical').value = '';
  document.getElementById('post-robots').value = 'index, follow';
  document.getElementById('seo-title-count').textContent = '0';
  document.getElementById('seo-desc-count').textContent = '0';
  document.getElementById('focus-kw-hint').textContent = '';
  document.getElementById('focus-kw-hint').className = 'form-hint';
  document.getElementById('seo-prev-title').textContent = 'Baslik buraya gelecek - Otobet';
  document.getElementById('seo-prev-url').textContent = 'otobet.com/yazilar/url-slug';
  document.getElementById('seo-prev-desc').textContent = 'Aciklama buraya gelecek...';
  document.getElementById('featured-upload').innerHTML = '<p><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7f8c8d" stroke-width="2" style="display:inline;vertical-align:middle"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Gorsel yuklemek icin tiklayin</p>';
  document.getElementById('featured-upload').classList.remove('has-img');
}

function editPost(id) {
  fetch(API + 'posts.php?all=1', { headers: headers() })
  .then(r => r.json())
  .then(posts => {
    const p = posts.find(x => x.id === id);
    if (!p) return;
    showPage('new-post');
    document.getElementById('editor-title').textContent = 'Yazı Düzenle';
    document.getElementById('post-id').value = p.id;
    document.getElementById('post-title').value = p.title;
    document.getElementById('post-slug').value = p.slug;
    document.getElementById('post-heading').value = p.heading_tag || 'h1';
    document.getElementById('post-content').innerHTML = p.content;
    document.getElementById('post-excerpt').value = p.excerpt || '';
    document.getElementById('post-image').value = p.featured_image || '';
    document.getElementById('post-category').value = p.category || '';
    document.getElementById('post-seo-title').value = p.seo_title || '';
    document.getElementById('post-seo-desc').value = p.seo_description || '';
    document.getElementById('post-seo-keys').value = p.seo_keywords || '';
    document.getElementById('post-author').value = p.author || 'Otobet';
    document.getElementById('post-page-type').value = p.page_type || 'blog';
    document.getElementById('post-focus-keyword').value = p.focus_keyword || '';
    document.getElementById('post-canonical').value = p.canonical || '';
    document.getElementById('post-robots').value = p.robots_meta || 'index, follow';
    document.getElementById('seo-title-count').textContent = (p.seo_title || '').length;
    document.getElementById('seo-desc-count').textContent = (p.seo_description || '').length;
    if (p.featured_image) {
      document.getElementById('featured-upload').innerHTML = '<img src="../' + p.featured_image + '">';
      document.getElementById('featured-upload').classList.add('has-img');
    }
    updateSeoPreview();
    checkFocusKeyword();
  });
}

function savePost(status) {
  const id = document.getElementById('post-id').value;
  const data = {
    title: document.getElementById('post-title').value,
    slug: document.getElementById('post-slug').value,
    heading_tag: document.getElementById('post-heading').value,
    content: document.getElementById('post-content').innerHTML,
    excerpt: document.getElementById('post-excerpt').value,
    featured_image: document.getElementById('post-image').value,
    category: document.getElementById('post-category').value,
    page_type: document.getElementById('post-page-type').value,
    status: status,
    seo_title: document.getElementById('post-seo-title').value,
    seo_description: document.getElementById('post-seo-desc').value,
    seo_keywords: document.getElementById('post-seo-keys').value,
    author: document.getElementById('post-author').value,
    focus_keyword: document.getElementById('post-focus-keyword').value,
    canonical: document.getElementById('post-canonical').value,
    robots_meta: document.getElementById('post-robots').value
  };

  if (!data.title) { toast('Başlık gerekli!', 'error'); return; }

  const method = id ? 'PUT' : 'POST';
  if (id) data.id = id;

  fetch(API + 'posts.php', { method, headers: headers(), body: JSON.stringify(data) })
  .then(r => r.json())
  .then(d => {
    if (d.success) {
      toast(status === 'published' ? 'Yazı yayınlandı!' : 'Taslak kaydedildi!');
      showPage('posts');
    } else {
      toast('Hata oluştu', 'error');
    }
  });
}

function deletePost(id, title) {
  if (!confirm('"' + title + '" yazısını silmek istediğinize emin misiniz?')) return;
  fetch(API + 'posts.php', { method: 'DELETE', headers: headers(), body: JSON.stringify({ id }) })
  .then(r => r.json())
  .then(d => {
    if (d.success) { toast('Yazı silindi'); loadPostsList(); }
  });
}

// SLUG
function autoSlug() {
  const title = document.getElementById('post-title').value;
  const tr = {'ç':'c','ğ':'g','ı':'i','ö':'o','ş':'s','ü':'u','Ç':'c','Ğ':'g','İ':'i','Ö':'o','Ş':'s','Ü':'u'};
  let slug = title.toLowerCase();
  for (const [k, v] of Object.entries(tr)) slug = slug.split(k).join(v);
  slug = slug.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  document.getElementById('post-slug').value = slug;
}

// EDITOR COMMANDS
function execCmd(cmd, val) { document.execCommand(cmd, false, val || null); }
function addHeading(tag) {
  const sel = window.getSelection();
  if (sel.rangeCount) {
    const range = sel.getRangeAt(0);
    const el = document.createElement(tag);
    el.textContent = sel.toString() || 'Başlık';
    range.deleteContents();
    range.insertNode(el);
  }
}
function addLink() {
  const url = prompt('Link URL:');
  if (url) execCmd('createLink', url);
}
function addImage() {
  document.getElementById('file-input').onchange = function(e) {
    uploadImageToEditor(e.target);
  };
  document.getElementById('file-input').click();
}

// IMAGE UPLOAD
function uploadImage(input) {
  const file = input.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('file', file);
  fetch(API + 'upload.php', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
    body: fd
  })
  .then(r => r.json())
  .then(d => {
    if (d.url) {
      document.getElementById('post-image').value = d.url;
      document.getElementById('featured-upload').innerHTML = '<img src="../' + d.url + '">';
      document.getElementById('featured-upload').classList.add('has-img');
      toast('Görsel yüklendi');
    } else {
      toast(d.error || 'Yükleme hatası', 'error');
    }
  });
  input.onchange = function(e) { uploadImage(e.target); };
}

function uploadImageToEditor(input) {
  const file = input.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('file', file);
  fetch(API + 'upload.php', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
    body: fd
  })
  .then(r => r.json())
  .then(d => {
    if (d.url) {
      execCmd('insertHTML', '<img src="../' + d.url + '" style="max-width:100%;border-radius:8px;margin:12px 0">');
      toast('Görsel eklendi');
    }
  });
  input.onchange = function(e) { uploadImage(e.target); };
}

// SETTINGS
function loadSettings() {
  fetch(API + 'settings.php')
  .then(r => r.json())
  .then(s => {
    document.getElementById('set-hero-title').value = s.hero_title || '';
    document.getElementById('set-hero-desc').value = s.hero_description || '';
    document.getElementById('set-footer').value = s.footer_text || '';
    document.getElementById('set-twitter').value = (s.social && s.social.twitter) || '';
    document.getElementById('set-instagram').value = (s.social && s.social.instagram) || '';
    document.getElementById('set-telegram').value = (s.social && s.social.telegram) || '';
    document.getElementById('set-site-name').value = s.site_name || '';
    document.getElementById('set-site-desc').value = s.site_description || '';
    document.getElementById('set-site-keys').value = s.site_keywords || '';
    document.getElementById('set-og-image').value = s.og_image || '';
  });
}

function saveHomepage() {
  const data = {
    hero_title: document.getElementById('set-hero-title').value,
    hero_description: document.getElementById('set-hero-desc').value,
    footer_text: document.getElementById('set-footer').value,
    social: {
      twitter: document.getElementById('set-twitter').value,
      instagram: document.getElementById('set-instagram').value,
      telegram: document.getElementById('set-telegram').value
    }
  };
  fetch(API + 'settings.php', { method: 'PUT', headers: headers(), body: JSON.stringify(data) })
  .then(r => r.json())
  .then(d => { if (d.success) toast('Ana sayfa güncellendi'); });
}

function saveSeo() {
  const data = {
    site_name: document.getElementById('set-site-name').value,
    site_description: document.getElementById('set-site-desc').value,
    site_keywords: document.getElementById('set-site-keys').value,
    og_image: document.getElementById('set-og-image').value
  };
  fetch(API + 'settings.php', { method: 'PUT', headers: headers(), body: JSON.stringify(data) })
  .then(r => r.json())
  .then(d => { if (d.success) toast('SEO ayarları güncellendi'); });
}

// PAGE CONTENT (Ana Sayfa / Otobet Giris)
function loadPageContent(type) {
  fetch(API + 'posts.php?all=1', { headers: headers() })
  .then(r => r.json())
  .then(posts => {
    const p = posts.find(x => (x.page_type || 'blog') === type);
    if (p) {
      document.getElementById('pc-' + type + '-id').value = p.id;
      document.getElementById('pc-' + type + '-title').value = p.title || '';
      document.getElementById('pc-' + type + '-content').innerHTML = p.content || '';
      document.getElementById('pc-' + type + '-excerpt').value = p.excerpt || '';
      document.getElementById('pc-' + type + '-image').value = p.featured_image || '';
      document.getElementById('pc-' + type + '-seo-title').value = p.seo_title || '';
      document.getElementById('pc-' + type + '-seo-desc').value = p.seo_description || '';
      document.getElementById('pc-' + type + '-seo-keys').value = p.seo_keywords || '';
      if (p.featured_image) {
        document.getElementById('pc-' + type + '-img-wrap').innerHTML = '<img src="../' + p.featured_image + '">';
        document.getElementById('pc-' + type + '-img-wrap').classList.add('has-img');
      }
    } else {
      document.getElementById('pc-' + type + '-id').value = '';
      document.getElementById('pc-' + type + '-title').value = '';
      document.getElementById('pc-' + type + '-content').innerHTML = '';
      document.getElementById('pc-' + type + '-excerpt').value = '';
      document.getElementById('pc-' + type + '-image').value = '';
      document.getElementById('pc-' + type + '-seo-title').value = '';
      document.getElementById('pc-' + type + '-seo-desc').value = '';
      document.getElementById('pc-' + type + '-seo-keys').value = '';
      document.getElementById('pc-' + type + '-img-wrap').innerHTML = '<p><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7f8c8d" stroke-width="2" style="display:inline;vertical-align:middle"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Gorsel yukle</p>';
      document.getElementById('pc-' + type + '-img-wrap').classList.remove('has-img');
    }
  });
}

function savePageContent(type) {
  const id = document.getElementById('pc-' + type + '-id').value;
  const title = document.getElementById('pc-' + type + '-title').value;
  if (!title) { toast('Baslik gerekli!', 'error'); return; }

  const data = {
    title: title,
    slug: type === 'homepage' ? 'ana-sayfa' : 'otobet-giris',
    content: document.getElementById('pc-' + type + '-content').innerHTML,
    excerpt: document.getElementById('pc-' + type + '-excerpt').value,
    featured_image: document.getElementById('pc-' + type + '-image').value,
    page_type: type,
    status: 'published',
    heading_tag: 'h1',
    category: '',
    seo_title: document.getElementById('pc-' + type + '-seo-title').value,
    seo_description: document.getElementById('pc-' + type + '-seo-desc').value,
    seo_keywords: document.getElementById('pc-' + type + '-seo-keys').value,
    author: 'Otobet'
  };

  const method = id ? 'PUT' : 'POST';
  if (id) data.id = id;

  fetch(API + 'posts.php', { method, headers: headers(), body: JSON.stringify(data) })
  .then(r => r.json())
  .then(d => {
    if (d.success) {
      toast(type === 'homepage' ? 'Ana sayfa icerigi kaydedildi!' : 'Otobet Giris icerigi kaydedildi!');
      if (d.post && d.post.id) document.getElementById('pc-' + type + '-id').value = d.post.id;
    } else {
      toast('Hata olustu', 'error');
    }
  });
}

function uploadPageImage(input, type) {
  const file = input.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('file', file);
  fetch(API + 'upload.php', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
    body: fd
  })
  .then(r => r.json())
  .then(d => {
    if (d.url) {
      document.getElementById('pc-' + type + '-image').value = d.url;
      document.getElementById('pc-' + type + '-img-wrap').innerHTML = '<img src="../' + d.url + '">';
      document.getElementById('pc-' + type + '-img-wrap').classList.add('has-img');
      toast('Gorsel yuklendi');
    } else {
      toast(d.error || 'Yukleme hatasi', 'error');
    }
  });
}

// Page content editor commands
function execCmdPC(type, cmd, val) {
  document.getElementById('pc-' + type + '-content').focus();
  document.execCommand(cmd, false, val || null);
}
function addHeadingPC(type, tag) {
  document.getElementById('pc-' + type + '-content').focus();
  const sel = window.getSelection();
  if (sel.rangeCount) {
    const range = sel.getRangeAt(0);
    const el = document.createElement(tag);
    el.textContent = sel.toString() || 'Baslik';
    range.deleteContents();
    range.insertNode(el);
  }
}
function addLinkPC(type) {
  document.getElementById('pc-' + type + '-content').focus();
  const url = prompt('Link URL:');
  if (url) document.execCommand('createLink', false, url);
}
function addImagePC(type) {
  document.getElementById('pc-' + type + '-file').onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fetch(API + 'upload.php', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token },
      body: fd
    })
    .then(r => r.json())
    .then(d => {
      if (d.url) {
        document.getElementById('pc-' + type + '-content').focus();
        document.execCommand('insertHTML', false, '<img src="../' + d.url + '" style="max-width:100%;border-radius:8px;margin:12px 0">');
        toast('Gorsel eklendi');
      }
    });
  };
  document.getElementById('pc-' + type + '-file').click();
}

// SEO PREVIEW & FOCUS KEYWORD
function updateSeoPreview() {
  const title = document.getElementById('post-seo-title').value || document.getElementById('post-title').value || 'Baslik buraya gelecek';
  const slug = document.getElementById('post-slug').value || 'url-slug';
  const desc = document.getElementById('post-seo-desc').value || 'Aciklama buraya gelecek...';
  document.getElementById('seo-prev-title').textContent = title + ' - Otobet';
  document.getElementById('seo-prev-url').textContent = 'otobet.com/yazilar/' + slug;
  document.getElementById('seo-prev-desc').textContent = desc;
  document.getElementById('seo-title-count').textContent = document.getElementById('post-seo-title').value.length;
  document.getElementById('seo-desc-count').textContent = document.getElementById('post-seo-desc').value.length;
}

function checkFocusKeyword() {
  const kw = document.getElementById('post-focus-keyword').value.toLowerCase().trim();
  const hint = document.getElementById('focus-kw-hint');
  if (!kw) { hint.textContent = ''; hint.className = 'form-hint'; return; }
  const title = (document.getElementById('post-seo-title').value || document.getElementById('post-title').value || '').toLowerCase();
  const desc = (document.getElementById('post-seo-desc').value || '').toLowerCase();
  const content = (document.getElementById('post-content').innerText || '').toLowerCase();
  const slug = (document.getElementById('post-slug').value || '').toLowerCase();
  let score = 0;
  if (title.includes(kw)) score++;
  if (desc.includes(kw)) score++;
  if (content.includes(kw)) score++;
  if (slug.includes(kw.replace(/\s+/g, '-'))) score++;
  if (score >= 3) { hint.textContent = 'Harika! Anahtar kelime ' + score + '/4 alanda mevcut'; hint.className = 'form-hint kw-good'; }
  else if (score >= 2) { hint.textContent = 'Iyi! Anahtar kelime ' + score + '/4 alanda mevcut'; hint.className = 'form-hint kw-warn'; }
  else { hint.textContent = 'Zayif! Anahtar kelime ' + score + '/4 alanda mevcut'; hint.className = 'form-hint kw-bad'; }
}

// SEO COUNTERS
document.getElementById('post-seo-title').addEventListener('input', function() {
  document.getElementById('seo-title-count').textContent = this.value.length;
  updateSeoPreview();
});
document.getElementById('post-seo-desc').addEventListener('input', function() {
  document.getElementById('seo-desc-count').textContent = this.value.length;
  updateSeoPreview();
});
document.getElementById('set-site-desc').addEventListener('input', function() {
  document.getElementById('site-desc-count').textContent = this.value.length;
});

// ENTER KEY LOGIN
document.getElementById('login-pass').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') doLogin();
});

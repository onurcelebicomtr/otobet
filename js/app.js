document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  if (document.getElementById('posts-grid')) loadPosts();
  if (document.getElementById('home-content')) loadSingleContent('homepage', 'home-content');
  if (document.getElementById('giris-content')) loadSingleContent('giris', 'giris-content');
});

function loadSettings() {
  const baseUrl = location.origin;
  fetch('api/settings.php')
    .then(r => r.json())
    .then(s => {
      const title = s.site_name || 'Otobet';
      const desc = s.site_description || '';
      const keys = s.site_keywords || '';
      const ogImg = s.og_image || baseUrl + '/uploads/logo.png';

      // Title & meta
      const t = document.getElementById('page-title');
      if (t && !t.textContent.includes('-')) t.textContent = title;
      setMeta('meta-desc', desc);
      setMeta('meta-keys', keys);

      // Canonical
      setAttr('canonical', 'href', baseUrl + '/');

      // Open Graph
      setMeta('og-title', title);
      setMeta('og-desc', desc);
      setMeta('og-image', ogImg);
      setMeta('og-url', baseUrl + '/');

      // Twitter Card
      setMeta('tw-title', title);
      setMeta('tw-desc', desc);
      setMeta('tw-image', ogImg);

      // Schema.org Organization
      var schemaOrg = document.getElementById('schema-org');
      if (schemaOrg) {
        schemaOrg.textContent = JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": title,
          "url": baseUrl,
          "logo": baseUrl + '/uploads/logo.png'
        });
      }

      // Hero
      const ht = document.getElementById('hero-title');
      if (ht && s.hero_title) {
        const words = s.hero_title.split(',');
        ht.innerHTML = words[0] + (words[1] ? ', <span class="hero-accent">' + words[1].trim() + '</span>' : '');
      }
      const hd = document.getElementById('hero-desc');
      if (hd && s.hero_description) hd.textContent = s.hero_description;
      const ft = document.getElementById('footer');
      if (ft && s.footer_text) ft.innerHTML = '<p>' + s.footer_text + '</p>';
    })
    .catch(() => {});
}

function loadPosts() {
  const baseUrl = location.origin;
  fetch('api/posts.php?type=blog')
    .then(r => r.json())
    .then(posts => {
      const grid = document.getElementById('posts-grid');
      const empty = document.getElementById('empty-state');
      if (!posts.length) { empty.style.display = 'block'; return; }
      grid.innerHTML = posts.map(p => `
        <a href="post.html?s=${p.slug}" class="card">
          ${p.featured_image ? `<img class="card-img" src="${p.featured_image}" alt="${p.title}" loading="lazy">` : '<div class="card-img"></div>'}
          <div class="card-body">
            ${p.category ? `<span class="card-cat">${p.category}</span>` : ''}
            <h3 class="card-title">${p.title}</h3>
            <p class="card-excerpt">${p.excerpt || p.content.replace(/<[^>]*>/g,'').substring(0,120) + '...'}</p>
            <span class="card-date">${new Date(p.created_at).toLocaleDateString('tr-TR')}</span>
          </div>
        </a>
      `).join('');

      // Schema.org Blog
      var schemaBlog = document.getElementById('schema-blog');
      if (schemaBlog) {
        schemaBlog.textContent = JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Blog",
          "name": document.title + " Blog",
          "url": baseUrl,
          "blogPost": posts.slice(0, 10).map(p => ({
            "@type": "BlogPosting",
            "headline": p.title,
            "url": baseUrl + '/yazilar/' + p.slug,
            "datePublished": p.created_at,
            "dateModified": p.updated_at,
            "author": {"@type": "Person", "name": p.author || "Otobet"},
            "image": p.featured_image ? baseUrl + '/' + p.featured_image : ''
          }))
        });
      }
    })
    .catch(() => {});
}

function loadSingleContent(pageType, containerId) {
  fetch('api/posts.php?type=' + pageType)
    .then(r => r.json())
    .then(posts => {
      const container = document.getElementById(containerId);
      const empty = document.getElementById('empty-state');
      if (!posts.length) { if (empty) empty.style.display = 'block'; return; }
      const p = posts[0];
      container.innerHTML = `
        <article>
          ${p.featured_image ? `<img style="width:100%;border-radius:12px;margin-bottom:24px;max-height:400px;object-fit:cover" src="${p.featured_image}" alt="${p.title}" loading="lazy">` : ''}
          <h1 style="font-family:var(--font-heading);font-size:26px;font-weight:700;color:var(--navy);margin-bottom:16px">${p.title}</h1>
          <div style="font-size:17px;line-height:1.9;color:var(--text)">${p.content}</div>
        </article>
      `;
    })
    .catch(() => {});
}

function setMeta(id, val) {
  var el = document.getElementById(id);
  if (el && val) el.setAttribute('content', val);
}
function setAttr(id, attr, val) {
  var el = document.getElementById(id);
  if (el && val) el.setAttribute(attr, val);
}

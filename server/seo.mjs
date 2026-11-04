// Адрес публикации задаётся явно: домен не угадывается из заголовка запроса.
export function siteOrigin(value = '') {
  if (!value) return '';
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('SITE_URL должен быть корневым HTTPS-адресом сайта');
  }
  return url.origin;
}
export function renderLanding(html, origin = '') {
  if (!origin) return html;
  const escaped = origin.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  const image = `${escaped}/assets/slides/villa-marbella-modern.webp`;
  const schema = JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Spain Property for Sale', url: `${origin}/`, inLanguage: 'ru' }).replaceAll('<', '\\u003c');
  return html.replace('content="noindex, follow"', 'content="index, follow, max-image-preview:large"')
    .replace('<!-- SITE_METADATA -->', `<link rel="canonical" href="${escaped}/">
  <meta property="og:url" content="${escaped}/">
  <meta property="og:image" content="${image}">
  <meta property="og:image:alt" content="Вилла с бассейном в Испании">
  <meta name="twitter:image" content="${image}">
  <script type="application/ld+json">${schema}</script>`);
}
export function robots(origin = '') {
  return origin ? `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${origin}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n';
}
export function sitemap(origin) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${origin.replaceAll('&', '&amp;').replaceAll('<', '&lt;')}/</loc></url></urlset>\n`;
}

export function renderThankYou(html) {
  return html.replace(/<title>[^<]*<\/title>/, "<title>Благодарим за ваш запрос | Spain Property for Sale</title>")
    .replace('content="noindex, follow"', 'content="noindex, nofollow"');
}

// Production определяется веткой сборки, одинаково для всех посетителей и роботов.
export function buildSiteOrigin(env = process.env) {
  if (env.SITE_URL) return siteOrigin(env.SITE_URL);
  return env.WORKERS_CI === '1' && env.WORKERS_CI_BRANCH === 'main' ? 'https://spain-estate.online' : '';
}

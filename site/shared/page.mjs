import { BRAND, esc } from './data.mjs';

// origin задан только для production-сборки: тогда страницы индексируются и получают абсолютные ссылки.
export function page({ title, description, path, og, css, js, body, theme, fonts = [], data, origin = '', index = true }) {
  const indexable = Boolean(origin) && index;
  const url = origin ? `${origin}${path}` : path;
  const image = og && origin ? `${origin}${og}` : og;
  return `<!doctype html>
<html lang="ru" data-variant="persiana">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="${indexable ? 'index, follow, max-image-preview:large' : 'noindex, nofollow'}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${BRAND}">
<meta property="og:locale" content="ru_RU">
<meta property="og:url" content="${esc(url)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
${image ? `<meta property="og:image" content="${esc(image)}">\n<meta name="twitter:card" content="summary_large_image">` : ''}
<meta name="theme-color" content="${theme}">
<link rel="icon" href="/shared/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="any">
${fonts.map(f => `<link rel="preload" href="/shared/fonts/${f}" as="font" type="font/woff2" crossorigin>`).join('\n')}
<link rel="stylesheet" href="${css}">
${data ? `<script type="application/json" id="site-data">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>` : ''}
<script type="module" src="${js}"></script>
</head>
<body>
${body}
</body>
</html>`;
}

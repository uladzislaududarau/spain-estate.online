export function securityHeaders(secure = true) {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    // Защита от встраивания и подмены base без блокировки разрешённого Google Ads.
    'Content-Security-Policy': "object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'" + (secure ? "; upgrade-insecure-requests" : ""),
    ...(secure ? { 'Strict-Transport-Security': 'max-age=15552000' } : {})
  };
}
export function canonicalRedirect(request) {
  const url = new URL(request.url);
  const isPublic = ['spain-estate.online', 'www.spain-estate.online'].includes(url.hostname);
  if (!isPublic) return null;
  const read = ['GET', 'HEAD'].includes(request.method);
  // Старые открытые формы с www сохраняют same-origin POST без переноса контактов.
  const canonical = read && !url.pathname.startsWith('/api/');
  if (url.protocol === 'https:' && (!canonical || url.hostname === 'spain-estate.online')) return null;
  url.protocol = 'https:';
  if (canonical) url.hostname = 'spain-estate.online';
  return new Response(null, { status: read ? 301 : 308, headers: { Location: url.href } });
}
export function secureResponse(response, request) {
  const headers = new Headers(response.headers);
  const url = new URL(request.url);
  for (const [name, value] of Object.entries(securityHeaders(url.protocol === 'https:'))) headers.set(name, value);
  if (url.hostname.endsWith('.workers.dev') || url.pathname.startsWith('/api/') || /^\/thank-you\/?$/.test(url.pathname)) headers.set('X-Robots-Tag', 'noindex, nofollow');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

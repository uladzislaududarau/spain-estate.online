import { securityHeaders } from './security.mjs';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomUUID, createHmac, randomBytes } from 'node:crypto';
import { validateLead } from './schema.mjs';
import { createStore } from './store.mjs';
import { resolveCountry } from './country.mjs';
import { siteOrigin, renderLanding, renderThankYou, robots, sitemap } from './seo.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
export async function createApp({ storage = path.join(root, 'storage', 'leads'), saveLead, allowedOrigin, geoProvider = '', countryResolver = resolveCountry, siteUrl = '' } = {}) {
  const originUrl = siteOrigin(siteUrl);
  const store = saveLead ? null : await createStore(storage);
  const save = saveLead || (lead => store.save(lead));
  const buckets = new Map();
  const rateSecret = randomBytes(32);
  const server = http.createServer(async (request, response) => {
    for (const [name, value] of Object.entries(securityHeaders(false))) response.setHeader(name, value);
    const json = (status, payload) => {
      response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify(payload));
    };
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname;
      if (pathname === '/api/country') {
        if (request.method !== 'GET') return json(405, { code: 'method_not_allowed' });
        return json(200, countryResolver(request, { provider: geoProvider }));
      }
      if (pathname === '/api/lead') {
        if (request.method !== 'POST') { response.setHeader('Allow', 'POST'); return json(405, { code: 'method_not_allowed' }); }
        const origin = request.headers.origin;
        const permitted = allowedOrigin || `http://${request.headers.host}`;
        if ((origin !== permitted) || request.headers['sec-fetch-site'] === 'cross-site') return json(403, { code: 'invalid_origin' });
        if (!request.headers['content-type']?.startsWith('application/json')) return json(415, { code: 'invalid_content_type' });
        const now = Date.now();
        for (const [key, value] of buckets) if (value.until < now) buckets.delete(key);
        const key = createHmac('sha256', rateSecret).update(request.socket.remoteAddress || '').digest('hex');
        const bucket = buckets.get(key) || { count: 0, until: now + 60000 };
        bucket.count++; buckets.set(key, bucket);
        if (bucket.count > 12) { response.setHeader('Retry-After', '60'); return json(429, { code: 'rate_limited' }); }
        let bytes = 0;
        const chunks = [];
        for await (const chunk of request) {
          bytes += chunk.length;
          if (bytes > 8192) return json(413, { code: 'payload_too_large' });
          chunks.push(chunk);
        }
        let body;
        try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch { return json(400, { code: 'invalid_json' }); }
        if (typeof body?.website === 'string' && body.website) return json(422, { code: 'invalid_request' });
        const result = validateLead(body);
        if (result.error) return json(422, { code: result.error });
        const { website, ...data } = result.data;
        const savedAt = new Date().toISOString();
        const { lead, duplicate } = await save({ ...data, leadId: randomUUID(), savedAt, consent: { ...data.consent, timestamp: savedAt }, deliveryStatus: 'pending_crm_configuration' });
        return json(200, { success: true, leadId: lead.leadId, status: 'saved', duplicate });
      }
      if (request.method !== 'GET' && request.method !== 'HEAD') return json(405, { code: 'method_not_allowed' });
      if (pathname === '/robots.txt' || pathname === '/sitemap.xml') {
        if (pathname === '/sitemap.xml' && !originUrl) return json(404, { code: 'site_url_not_configured' });
        response.writeHead(200, { 'Content-Type': pathname === '/robots.txt' ? 'text/plain; charset=utf-8' : 'application/xml; charset=utf-8', 'Cache-Control': 'no-store' });
        return response.end(request.method === 'HEAD' ? undefined : pathname === '/robots.txt' ? robots(originUrl) : sitemap(originUrl));
      }
      if (['/index.html', '/showcase/', '/showcase/index.html', '/concept-7-warm-travertine.html', '/showcase/concept-7-warm-travertine.html', '/privacy/', '/legal/', '/en/privacy/', '/en/legal/'].includes(pathname)) {
        const destination = pathname.includes('privacy') || pathname.includes('legal') ? pathname.slice(0, -1) : '/';
        response.writeHead(301, { Location: destination });
        return response.end();
      }
      let asset;
      if (['/', '/thank-you', '/thank-you/'].includes(pathname)) asset = 'index.html';
      else if (pathname === '/favicon.ico') asset = 'favicon.ico';
      else if (pathname === '/favicon.svg') asset = 'favicon.svg';
      else if (['/privacy', '/legal', '/en/privacy', '/en/legal'].includes(pathname)) asset = `legal/${pathname.startsWith('/en/') ? 'en' : 'ru'}-${pathname.endsWith('privacy') ? 'privacy' : 'legal'}.html`;
      else {
        const match = pathname.match(/^\/(?:showcase\/)?assets\/([a-zA-Z0-9_./-]+\.(?:css|mjs|js|webp|woff2|svg|png|ico|txt|xml))$/);
        if (match && !match[1].includes('..')) asset = `assets/${match[1]}`;
      }
      if (!asset) return json(404, { code: 'not_found' });
      let data;
      try { data = await readFile(path.join(root, 'showcase', asset)); }
      catch (error) { if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return json(404, { code: 'not_found' }); throw error; }
      if (asset === 'index.html') data = Buffer.from(pathname.startsWith('/thank-you') ? renderThankYou(data.toString()) : renderLanding(data.toString(), originUrl));
      const type = asset.endsWith('.woff2') ? 'font/woff2'
        : asset.endsWith('.webp') ? 'image/webp'
        : asset.endsWith('.svg') ? 'image/svg+xml'
        : asset.endsWith('.png') ? 'image/png'
        : asset.endsWith('.ico') ? 'image/x-icon'
        : asset.endsWith('.css') ? 'text/css'
        : asset.endsWith('.xml') ? 'application/xml'
        : asset.endsWith('.txt') ? 'text/plain'
        : (asset.endsWith('.mjs') || asset.endsWith('.js')) ? 'text/javascript'
        : 'text/html';
      response.writeHead(200, { 'Content-Type': (type === 'image/webp' || type === 'image/png' || type === 'image/x-icon' || type === 'font/woff2') ? type : `${type}; charset=utf-8`, 'Cache-Control': 'no-store' });
      response.end(request.method === 'HEAD' ? undefined : data);
    } catch {
      // Персональные данные и содержимое ошибок не выводятся в открытые логи.
      json(503, { code: 'storage_unavailable' });
    }
  });
  server.requestTimeout = 20000;
  return server;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4321);
  const app = await createApp({ storage: process.env.LEAD_STORAGE_DIR, allowedOrigin: process.env.APP_ORIGIN, geoProvider: process.env.VERCEL === '1' ? 'vercel' : process.env.GEO_PROVIDER || '', siteUrl: process.env.SITE_URL });
  app.listen(port, '127.0.0.1', () => console.log(`Локальная версия: http://127.0.0.1:${port}`));
}

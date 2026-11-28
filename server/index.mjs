import { securityHeaders } from './security.mjs';
import http from 'node:http';
import { readFile, stat, writeFile, mkdir } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomUUID, createHmac, randomBytes } from 'node:crypto';
import { validateLead } from './schema.mjs';
import { createStore } from './store.mjs';
import { resolveCountry } from './country.mjs';
import { siteOrigin, renderLanding, renderThankYou, robots, sitemap } from './seo.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
export async function createApp({ storage = path.join(root, 'storage', 'leads'), saveLead, allowedOrigin, geoProvider = '', countryResolver = resolveCountry, siteUrl = '', assetDirectory = 'showcase' } = {}) {
  const originUrl = siteOrigin(siteUrl);
  const staticRoot = path.resolve(root, assetDirectory);
  const sourceAssets = staticRoot === path.join(root, 'showcase');
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
      // Local review tool only (source dev server): store the Hero photo choice made on /preview/hero-photos.
      if (pathname === '/api/dev/hero-selection') {
        if (!sourceAssets) return json(404, { code: 'not_found' });
        const file = path.join(root, 'docs', 'hero-gallery', 'selection.json');
        if (request.method === 'GET') {
          try { return json(200, JSON.parse(await readFile(file, 'utf8'))); } catch { return json(200, { photos: null }); }
        }
        if (request.method !== 'POST') { response.setHeader('Allow', 'GET, POST'); return json(405, { code: 'method_not_allowed' }); }
        if (request.headers.origin !== (allowedOrigin || `http://${request.headers.host}`)) return json(403, { code: 'invalid_origin' });
        if (!request.headers['content-type']?.startsWith('application/json')) return json(415, { code: 'invalid_content_type' });
        let bytes = 0; const chunks = [];
        for await (const chunk of request) { bytes += chunk.length; if (bytes > 4096) return json(413, { code: 'payload_too_large' }); chunks.push(chunk); }
        let photos;
        try { photos = JSON.parse(Buffer.concat(chunks).toString()).photos; } catch { return json(400, { code: 'invalid_json' }); }
        if (!Array.isArray(photos) || !photos.length || photos.length > 40 || new Set(photos).size !== photos.length || !photos.every(id => typeof id === 'string' && /^[a-z0-9-]{2,48}$/.test(id))) return json(422, { code: 'invalid_selection' });
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, JSON.stringify({ savedAt: new Date().toISOString(), photos }, null, 2) + '\n');
        return json(200, { success: true, photos });
      }
      if (request.method !== 'GET' && request.method !== 'HEAD') return json(405, { code: 'method_not_allowed' });
      if (sourceAssets && (pathname === '/robots.txt' || pathname === '/sitemap.xml')) {
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
      if (pathname === '/') asset = 'index.html';
      else if (['/thank-you', '/thank-you/'].includes(pathname)) asset = sourceAssets ? 'index.html' : 'thank-you/index.html';
      // Local-only design review of the buyer guide prototypes (source dev server, never the build).
      else if (sourceAssets && /^\/preview\/buyer-guide-[abc]\/?$/.test(pathname)) asset = 'index.html';
      else if (sourceAssets && /^\/preview\/hero-photos\/?$/.test(pathname)) asset = 'preview/hero-photos.html';
      else if (!sourceAssets && ['/robots.txt', '/sitemap.xml'].includes(pathname)) asset = pathname.slice(1);
      else if (pathname === '/favicon.ico') asset = 'favicon.ico';
      else if (pathname === '/favicon.svg') asset = 'favicon.svg';
      else if (['/privacy', '/legal', '/en/privacy', '/en/legal'].includes(pathname)) asset = sourceAssets ? `legal/${pathname.startsWith('/en/') ? 'en' : 'ru'}-${pathname.endsWith('privacy') ? 'privacy' : 'legal'}.html` : `${pathname.slice(1)}/index.html`;
      else {
        const match = pathname.match(/^\/(?:showcase\/)?assets\/([a-zA-Z0-9_./-]+\.(?:css|mjs|js|webp|avif|jpg|jpeg|mp4|json|woff2|svg|png|ico|txt|xml))$/);
        // Витрина (site/persiana) существует только в сборке dist.
        const site = !sourceAssets && pathname.match(/^\/(?:persiana|shared)\/[a-zA-Z0-9_./-]+\.(?:css|mjs|js|webp|json|woff2|svg)$/);
        const page = !sourceAssets && pathname.match(/^\/(nature-resort|horizon-ii|coronella-living|villas-de-la-sal|tm-tower|catalog|quiz)\/?$/);
        if (match && !match[1].includes('..')) asset = `assets/${match[1]}`;
        else if (site && !pathname.includes('..')) asset = pathname.slice(1);
        else if (page) asset = `${page[1]}/index.html`;
      }
      if (!asset) return json(404, { code: 'not_found' });
      if(asset.endsWith('.mp4')){
        const file=path.join(staticRoot,asset);let size;
        try{size=(await stat(file)).size;}catch{return json(404,{code:'not_found'});}
        const range=request.headers.range;
        let start=0,end=size-1;
        if(range){
          const match=/^bytes=(\d*)-(\d*)$/.exec(range);
          if(!match||(!match[1]&&!match[2])){response.writeHead(416,{'Content-Range':`bytes */${size}`});return response.end();}
          if(!match[1])start=Math.max(0,size-Number(match[2]));
          else{start=Number(match[1]);if(match[2])end=Math.min(end,Number(match[2]));}
          if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=size){response.writeHead(416,{'Content-Range':`bytes */${size}`});return response.end();}
        }
        response.writeHead(range?206:200,{'Content-Type':'video/mp4','Accept-Ranges':'bytes','Content-Length':end-start+1,'Cache-Control':'public, max-age=3600',...(range?{'Content-Range':`bytes ${start}-${end}/${size}`}:{})});
        if(request.method==='HEAD')return response.end();
        const stream=createReadStream(file,{start,end});stream.on('error',()=>response.destroy());response.on('close',()=>stream.destroy());stream.pipe(response);return;
      }
      let data;
      try { data = await readFile(path.join(staticRoot, asset)); }
      catch (error) { if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return json(404, { code: 'not_found' }); throw error; }
      if (sourceAssets && asset === 'index.html') data = Buffer.from(pathname.startsWith('/thank-you') ? renderThankYou(data.toString()) : renderLanding(data.toString(), originUrl));
      const type = asset.endsWith('.woff2') ? 'font/woff2'
        : asset.endsWith('.webp') ? 'image/webp'
        : asset.endsWith('.avif') ? 'image/avif'
        : /\.jpe?g$/.test(asset) ? 'image/jpeg'
        : asset.endsWith('.json') ? 'application/json'
        : asset.endsWith('.svg') ? 'image/svg+xml'
        : asset.endsWith('.png') ? 'image/png'
        : asset.endsWith('.ico') ? 'image/x-icon'
        : asset.endsWith('.css') ? 'text/css'
        : asset.endsWith('.xml') ? 'application/xml'
        : asset.endsWith('.txt') ? 'text/plain'
        : (asset.endsWith('.mjs') || asset.endsWith('.js')) ? 'text/javascript'
        : 'text/html';
      response.writeHead(200, { 'Content-Type': (type.startsWith('image/') || type === 'font/woff2') ? type : `${type}; charset=utf-8`, 'Cache-Control': 'no-store' });
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
  const app = await createApp({ storage: process.env.LEAD_STORAGE_DIR, allowedOrigin: process.env.APP_ORIGIN, geoProvider: process.env.VERCEL === '1' ? 'vercel' : process.env.GEO_PROVIDER || '', siteUrl: process.env.SITE_URL, assetDirectory: process.env.STATIC_DIRECTORY || 'showcase' });
  app.listen(port, '127.0.0.1', () => console.log(`Локальная версия: http://127.0.0.1:${port}`));
}

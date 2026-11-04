import { canonicalRedirect, secureResponse } from '../server/security.mjs';
import { validateLead } from '../server/schema.mjs';
import { createCloudStore } from './store.mjs';

function json(status, body, extra = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra } });
}
async function readBody(request) {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks = []; let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 8192) { await reader.cancel(); throw new Error('payload_too_large'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}
// Зависимость хранилища подменяется только в тестах; боевой обработчик использует D1.
function createHandler(storeFactory = createCloudStore) {
  return {
    async fetch(request, env, ctx) {
      const url = new URL(request.url);
      if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
      if (url.pathname === '/api/country') {
        if (request.method !== 'GET') return json(405, { code: 'method_not_allowed' }, { Allow: 'GET' });
        const country = request.cf?.country;
        return json(200, country && /^[A-Z]{2}$/.test(country) && !['XX', 'T1'].includes(country) ? { country, source: 'ip' } : { country: null, source: 'unavailable' });
      }
      if (url.pathname !== '/api/lead') return json(404, { code: 'not_found' });
      if (request.method !== 'POST') return json(405, { code: 'method_not_allowed' }, { Allow: 'POST' });
      if (request.headers.get('Origin') !== url.origin || request.headers.get('Sec-Fetch-Site') === 'cross-site') return json(403, { code: 'invalid_origin' });
      if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json(415, { code: 'invalid_content_type' });
      if (env.LEADS_ENABLED !== 'true') return json(503, { code: 'lead_service_not_configured' });
      try {
        const store = await storeFactory(env);
        if (!await store.rateLimit(request.headers.get('CF-Connecting-IP') || 'unknown')) return json(429, { code: 'rate_limited' }, { 'Retry-After': '60' });
        let body;
        try { body = await readBody(request); }
        catch (error) { return json(error.message === 'payload_too_large' ? 413 : 400, { code: error.message === 'payload_too_large' ? 'payload_too_large' : 'invalid_json' }); }
        if (typeof body?.website === 'string' && body.website) return json(422, { code: 'invalid_request' });
        const result = validateLead(body);
        if (result.error) return json(422, { code: result.error });
        const { website, ...data } = result.data;
        const savedAt = new Date().toISOString();
        const saved = await store.save({ ...data, leadId: crypto.randomUUID(), savedAt, consent: { ...data.consent, timestamp: savedAt } });
        ctx.waitUntil(store.deliver(saved.leadId).catch(() => {}));
        return json(200, { success: true, leadId: saved.leadId, status: 'saved', duplicate: saved.duplicate });
      } catch {
        return json(503, { code: 'storage_unavailable' });
      }
    },
    async scheduled(event, env, ctx) {
      if (env.LEADS_ENABLED !== 'true' || !env.DB || !env.LEAD_ENCRYPTION_KEY) return;
      ctx.waitUntil((async () => {
        const store = await storeFactory(env);
        await store.cleanupRateLimits();
        await store.cleanupExpiredLeads();
        for (const id of await store.pending()) await store.deliver(id);
      })().catch(() => {}));
    }
  };
}
export function createWorker(storeFactory = createCloudStore) {
  const handler = createHandler(storeFactory);
  return {
    scheduled: handler.scheduled,
    async fetch(request, env, ctx) {
      const redirect = canonicalRedirect(request);
      return secureResponse(redirect || await handler.fetch(request, env, ctx), request);
    }
  };
}
export default createWorker();

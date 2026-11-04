import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildSiteOrigin } from '../server/seo.mjs';
import { canonicalRedirect, secureResponse, securityHeaders } from '../server/security.mjs';
import { createWorker } from '../cloudflare/worker.mjs';

test('Production main индексируется, локальные и preview-сборки остаются noindex', () => {
  assert.equal(buildSiteOrigin({ WORKERS_CI: '1', WORKERS_CI_BRANCH: 'main' }), 'https://spain-estate.online');
  assert.equal(buildSiteOrigin({ WORKERS_CI: '1', WORKERS_CI_BRANCH: 'preview' }), '');
  assert.equal(buildSiteOrigin({ WORKERS_CI_BRANCH: 'main' }), '');
  assert.equal(buildSiteOrigin({}), '');
  assert.equal(buildSiteOrigin({ SITE_URL: 'https://example.com' }), 'https://example.com');
});
test('HTTPS и www приводятся к основному адресу без потери пути и параметров', () => {
  for (const address of ['http://spain-estate.online/privacy?gclid=test', 'http://www.spain-estate.online/privacy?gclid=test', 'https://www.spain-estate.online/privacy?gclid=test']) {
    const r = canonicalRedirect(new Request(address));
    assert.equal(r.status, 301);
    assert.equal(r.headers.get('location'), 'https://spain-estate.online/privacy?gclid=test');
  }
  assert.equal(canonicalRedirect(new Request('https://spain-estate.online/')), null);
  assert.equal(canonicalRedirect(new Request('https://preview.example/')), null);
  assert.equal(canonicalRedirect(new Request('https://www.spain-estate.online/api/lead', { method: 'POST' })), null);
});
test('Security headers применяются к API и статике без изменения содержимого и User-Agent', async () => {
  const worker = createWorker();
  const content = '<html>Одинаковое содержимое</html>';
  const env = { ASSETS: { fetch: async () => new Response(content) } };
  for (const agent of ['Mozilla/5.0', 'AdsBot-Google', 'Googlebot']) {
    const r = await worker.fetch(new Request('https://spain-estate.online/', { headers: { 'User-Agent': agent } }), env, {});
    assert.equal(await r.text(), content);
    assert.equal(r.headers.get('X-Frame-Options'), 'DENY');
    assert.equal(r.headers.get('Strict-Transport-Security'), 'max-age=15552000');
    assert.match(r.headers.get('Content-Security-Policy'), /frame-ancestors 'none'/);
  }
  const api = await worker.fetch(new Request('https://spain-estate.online/api/country'), env, {});
  assert.equal(api.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(api.headers.get('X-Robots-Tag'), 'noindex, nofollow');
  for (const url of ['https://preview.workers.dev/', 'https://spain-estate.online/thank-you']) {
    const r = secureResponse(new Response('ok'), new Request(url));
    assert.equal(r.headers.get('X-Robots-Tag'), 'noindex, nofollow');
  }
  const notFound = secureResponse(new Response('missing', { status: 404 }), new Request('https://spain-estate.online/missing'));
  assert.equal(notFound.status, 404);
  assert.equal(securityHeaders(false)['Strict-Transport-Security'], undefined);
  assert.doesNotMatch(securityHeaders(false)['Content-Security-Policy'], /upgrade-insecure/);
});
test('Юридические страницы содержат подтверждённые контакты, получателей и срок, без вымышленных лицензий', async () => {
  for (const name of ['ru-privacy', 'en-privacy', 'ru-legal', 'en-legal']) {
    const html = await readFile(new URL('../showcase/legal/' + name + '.html', import.meta.url), 'utf8');
    assert.match(html, /SERGEY VAKORIN/);
    assert.match(html, /Atlandidos str\. 5/);
    assert.match(html, /phewcy\.dev@gmail\.com/);
    assert.doesNotMatch(html, /Предварительная редакция|До запуска|Draft for review|3,500|3500|статьи 1262|under Article 1262/);
    if (name.endsWith('privacy')) {
      assert.match(html, /180/); assert.match(html, /Cloudflare D1/); assert.match(html, /Resend/); assert.match(html, /Telegram/);
    }
  }
});

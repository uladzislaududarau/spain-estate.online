import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createApp } from '../server/index.mjs';
import { siteOrigin, renderLanding, renderThankYou, robots, sitemap } from '../server/seo.mjs';

test('Метаданные не рекламируют выдуманный домен и отсутствующий перевод', async () => {
  const html = await readFile(new URL('../showcase/index.html', import.meta.url), 'utf8');
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.doesNotMatch(html, /fonts\.googleapis|fonts\.gstatic|hreflang|RAICV|openingHours|priceRange|data-set-font|legacy\.example/);
  assert.match(renderLanding(html), /noindex, follow/);
  const production = renderLanding(html, siteOrigin('https://example.com'));
  assert.match(production, /rel="canonical" href="https:\/\/example.com\/"/);
  assert.match(production, /content="index, follow, max-image-preview:large"/);
  assert.match(production, /https:\/\/example.com\/assets\/slides\/01-marbella-modern-infinity-villa.webp/);
  const schema = JSON.parse(production.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(schema.url, 'https://example.com/');
  assert.doesNotMatch(sitemap('https://example.com'), /\/en\/|privacy|legal/);
  assert.equal(robots(), 'User-agent: *\nDisallow: /\n');
  for (const value of ['http://example.com', 'https://example.com/path', 'https://name:secret@example.com']) assert.throws(() => siteOrigin(value));
});

test('Старые страницы перенаправляются, отсутствующие ресурсы возвращают 404', async t => {
  const app = await createApp({ saveLead: async () => { throw new Error('Не используется'); } });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => app.close(resolve)));
  const base = `http://127.0.0.1:${app.address().port}`;
  for (const route of ['/index.html', '/showcase/index.html', '/concept-7-warm-travertine.html']) {
    const response = await fetch(base + route, { redirect: 'manual' });
    assert.equal(response.status, 301);
    assert.equal(response.headers.get('location'), '/');
  }
  const thankYou = await fetch(base + '/thank-you');
  assert.equal(thankYou.status, 200);
  assert.match(await thankYou.text(), /noindex, nofollow/);
  assert.equal((await fetch(base + '/assets/missing.webp')).status, 404);
  assert.equal((await fetch(base + '/sitemap.xml')).status, 404);
  assert.equal(await (await fetch(base + '/robots.txt')).text(), robots());
});

test('Все подключённые локальные ресурсы страницы, стилей и модулей существуют', async () => {
  const root = new URL('../showcase/', import.meta.url);
  const seen = new Set();
  async function walk(file) {
    if (seen.has(file)) return;
    seen.add(file);
    const content = await readFile(new URL(file, root), 'utf8');
    const refs = [...content.matchAll(/(?:src|href|srcset)=["']([^"']+)["']|url\(["']?([^)'"\s]+)|(?:from\s*|import\s*\()["'](\.[^"']+)["']/g)];
    for (const match of refs) {
      const ref = match[1] || match[2] || match[3];
      if (/^(?:https?:|data:|#)/.test(ref)) continue;
      const url = ref.startsWith('/') ? new URL(ref.slice(1), root) : new URL(ref, new URL(file, root));
      const relative = url.href.slice(root.href.length);
      if (!relative.startsWith('assets/')) continue;
      await readFile(url);
      if (/\.(?:css|mjs)$/.test(relative)) await walk(relative);
    }
  }
  for (const file of ['index.html', 'legal/ru-privacy.html', 'legal/ru-legal.html', 'legal/en-privacy.html', 'legal/en-legal.html']) await walk(file);
});

test('Благодарность исключена из индексации и sitemap', async () => {
  const html = await readFile(new URL('../showcase/index.html', import.meta.url), 'utf8');
  assert.match(renderThankYou(html), /Благодарим за ваш запрос \| Spain Property for Sale/);
  assert.match(renderThankYou(html), /noindex, nofollow/);
  assert.doesNotMatch(sitemap('https://example.com'), /thank-you/);
});

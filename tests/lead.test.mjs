import { policyVersion } from '../showcase/assets/quiz.config.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createApp } from '../server/index.mjs';
import { createStore } from '../server/store.mjs';

const payload = () => ({ requestId: randomUUID(), name: 'Тестовый клиент', language: 'ru', answers: { purpose: 'investment', propertyType: 'apartment', regions: ['costa-blanca', 'mallorca'], budgets: ['100k-200k', '200k-300k'], timeline: 'soon' }, region: 'marbella', messenger: 'telegram', contact: '@spain_test', consent: { accepted: true, policyVersion }, website: '' });
async function harness(t, options = {}) {
  const storage = await mkdtemp(path.join(os.tmpdir(), 'spain-property-test-'));
  const app = await createApp({ storage, ...options });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => app.close(resolve)));
  const base = `http://127.0.0.1:${app.address().port}`;
  const post = (body, headers = {}) => fetch(`${base}/api/lead`, { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  return { storage, base, post };
}
test('Заявка зашифрована, сохраняет несколько бюджетов, повтор не создает дубль', async t => {
  const { storage, post, base } = await harness(t);
  const body = payload();
  const results = await Promise.all([post(body), post(body)]);
  assert.deepEqual(results.map(result => result.status), [200, 200]);
  const [first, second] = await Promise.all(results.map(result => result.json()));
  assert.equal(first.leadId, second.leadId);
  const files = (await readdir(storage)).filter(name => name.endsWith('.enc'));
  assert.equal(files.length, 1);
  const bytes = await readFile(path.join(storage, files[0]));
  assert.equal(bytes.includes(Buffer.from(body.contact)), false);
  const store = await createStore(storage);
  const saved = await store.get(body.requestId);
  assert.deepEqual(saved.answers.budgets, body.answers.budgets);
  assert.equal(saved.deliveryStatus, 'pending_crm_configuration');
  assert.equal(saved.region, 'marbella');
  const retryWithNewId = await (await post({ ...body, requestId: randomUUID() })).json();
  assert.equal(retryWithNewId.leadId, first.leadId);
  for (const route of ['/storage/leads/encryption.key', '/.env', '/server/index.mjs', '/showcase/archive/concepts-2026-11-01/index.html']) assert.equal((await fetch(base + route)).status, 404);
});
test('Телефон проверяется сервером; Telegram принимает username и международный номер', async t => {
  const { post } = await harness(t);
  assert.equal((await post({ ...payload(), contact: '@bad' })).status, 422);
  assert.equal((await post({ ...payload(), messenger: 'whatsapp', contact: '@spain_test' })).status, 422);
  assert.equal((await post({ ...payload(), messenger: 'whatsapp', contact: '+34 612 345 678' })).status, 200);
  assert.equal((await post({ ...payload(), contact: '+34 622 345 678' })).status, 200);
});
test('Без согласия, неизвестные ответы, спам и запросы с чужого сайта отклоняются', async t => {
  const { post } = await harness(t);
  assert.equal((await post({ ...payload(), consent: { accepted: false, policyVersion } })).status, 422);
  assert.equal((await post({ ...payload(), answers: { ...payload().answers, budgets: [] } })).status, 422);
  assert.equal((await post({ ...payload(), answers: { ...payload().answers, purpose: 'invented' } })).status, 422);
  assert.equal((await post({ ...payload(), website: 'spam' })).status, 422);
  assert.equal((await post(payload(), { Origin: 'https://other.example' })).status, 403);
});
test('Ошибка хранилища не дает успешного ответа', async t => {
  const { post } = await harness(t, { saveLead: async () => { throw new Error('storage'); } });
  const result = await post(payload());
  assert.equal(result.status, 503);
  assert.equal((await result.json()).success, undefined);
});
test('Частые запросы ограничиваются', async t => {
  const { post } = await harness(t);
  for (let i = 0; i < 12; i++) await post({});
  assert.equal((await post(payload())).status, 429);
});
test('Определение страны возвращает только код без IP и запрещает кеширование', async t => {
  const { base } = await harness(t, { geoProvider: 'cloudflare' });
  const response = await fetch(`${base}/api/country`, { headers: { 'cf-ipcountry': 'NO' } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { country: 'NO', source: 'ip' });
});
test('Оптимизированный фон отдается как WebP на основной странице и в витрине', async t => {
  const { base } = await harness(t);
  for (const url of ['/assets/slides/01-marbella-modern-infinity-villa.webp', '/showcase/assets/slides/960/01-marbella-modern-infinity-villa.webp']) {
    const response = await fetch(base + url);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'image/webp');
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.subarray(0, 4).toString(), 'RIFF');
    assert.equal(bytes.subarray(8, 12).toString(), 'WEBP');
    const maxBytes = url.includes('/960/') ? 100000 : 250000;
    assert.ok(bytes.length < maxBytes);
  }
});
test('Информационный лендинг принимает заявку без выбранного региона', async t => {
  const { post } = await harness(t);
  const response = await post({ ...payload(), region: 'unspecified' });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).success, true);
});
test('Локальные кириллические шрифты выдаются в WOFF2 с правильным MIME', async t => {
  const { base } = await harness(t);
  for (const family of ['onest', 'manrope', 'montserrat']) {
    const response = await fetch(`${base}/assets/${family}-cyrillic.woff2`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'font/woff2');
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.subarray(0, 4).toString(), 'wOF2');
  }
});
test('Имя обязательно, нормализуется и сохраняется в зашифрованной заявке', async t => {
  const { post, storage } = await harness(t);
  const body = payload();
  const { name, ...withoutName } = body;
  const missing = await post(withoutName);
  assert.equal(missing.status, 422);
  assert.equal((await missing.json()).code, 'invalid_name');
  for (const invalid of ['', '  ', '12345', 'a'.repeat(81), '<script>']) assert.equal((await post({ ...body, name: invalid })).status, 422);
  const response = await post({ ...body, name: '  Анна   Мария  ' });
  assert.equal(response.status, 200);
  const store = await createStore(storage);
  assert.equal((await store.get(body.requestId)).name, 'Анна Мария');
});


test('Юридические страницы доступны отдельно и возвращают на лендинг', async t => {
  const { base } = await harness(t);
  for (const route of ['/privacy', '/legal', '/en/privacy', '/en/legal']) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/html/);
    const html = await response.text();
    assert.match(html, /class="legal-action legal-action-primary" href="\/"/);
    assert.doesNotMatch(html, /quiz\.mjs|data-open-quiz/);
    assert.match(html, /phewcy\.dev@gmail\.com/);
  }
  const landing = await (await fetch(base + '/')).text();
  assert.match(landing, /href="\/privacy"/);
  assert.match(landing, /href="\/legal"/);
  assert.equal((await fetch(base + '/legal/../../../server/index.mjs')).status, 404);
});

test('Несколько регионов сохраняются; пустой, неизвестный и противоречивый выбор отклоняется', async t => {
  const { post, storage } = await harness(t);
  const body = payload();
  for (const regions of [[], ['unknown'], ['undecided', 'mallorca']]) {
    const response = await post({ ...body, answers: { ...body.answers, regions } });
    assert.equal(response.status, 422);
  }
  const response = await post({ ...body, answers: { ...body.answers, regions: ['mallorca', 'costa-blanca', 'mallorca'] } });
  assert.equal(response.status, 200);
  const store = await createStore(storage);
  assert.deepEqual((await store.get(body.requestId)).answers.regions, ['costa-blanca', 'mallorca']);
  assert.equal((await post({ ...payload(), contact: '@spain_undecided', answers: { ...body.answers, regions: ['undecided'] } })).status, 200);
});

test('Концепция Warm Travertine доступна через сервер квиза по обоим путям', async t => {
  const { base } = await harness(t);
  for (const route of ['/concept-7-warm-travertine.html', '/showcase/concept-7-warm-travertine.html']) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/html/);
  }
  const css = await fetch(base + '/assets/travertine-refinement.css');
  assert.equal(css.status, 200);
  assert.match(css.headers.get('content-type'), /text\/css/);
});

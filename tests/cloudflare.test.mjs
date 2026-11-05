import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createWorker } from '../cloudflare/worker.mjs';
import { createCloudStore } from '../cloudflare/store.mjs';
import { decrypt, keys } from '../cloudflare/crypto.mjs';
import { policyVersion } from '../showcase/assets/quiz.config.mjs';

// Используется тот же локальный D1-эмулятор, который поставляется с зафиксированным Wrangler.
const { Miniflare, convertV4MiniflareOptions } = createRequire(import.meta.resolve('wrangler/package.json'))('miniflare');
const secret = '1'.repeat(64); // Исключительно тестовый ключ, не используется при публикации.
function payload() {
  return { requestId: crypto.randomUUID(), name: 'Тест', language: 'ru', messenger: 'telegram', contact: '@spain_test', region: 'unspecified',
    answers: { regions: ['mallorca'], purpose: 'investment', propertyType: 'villa', budgets: ['200k-300k'], timeline: 'visit-next-month' },
    consent: { accepted: true, policyVersion }, website: '' };
}
function lead() {
  const savedAt = new Date().toISOString(); const body = payload();
  return { ...body, leadId: crypto.randomUUID(), savedAt, consent: { ...body.consent, timestamp: savedAt } };
}
const readyEnv = { LEADS_ENABLED: 'true' };
function request(body, headers = {}) {
  return new Request('https://landing.example/api/lead', { method: 'POST', headers: { Origin: 'https://landing.example', 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
}

test('Worker не подтверждает заявку без настройки или при сбое сохранения', async () => {
  let scheduled = false;
  const ctx = { waitUntil() { scheduled = true; } };
  assert.equal((await createWorker().fetch(request(payload()), {}, ctx)).status, 503);
  const broken = createWorker(async () => ({ rateLimit: async () => true, save: async () => { throw new Error('storage_failed'); } }));
  const response = await broken.fetch(request(payload()), readyEnv, ctx);
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, 'storage_unavailable');
  assert.equal(scheduled, false);
});

test('Worker отклоняет чужой Origin, спам, большие тела и невалидные контакты', async () => {
  const worker = createWorker(async () => ({ rateLimit: async () => true, save: async () => { throw new Error('unexpected_save'); } }));
  const ctx = { waitUntil() {} };
  assert.equal((await worker.fetch(request(payload(), { Origin: 'https://other.example' }), readyEnv, ctx)).status, 403);
  assert.equal((await worker.fetch(request({ ...payload(), website: 'spam' }), readyEnv, ctx)).status, 422);
  assert.equal((await worker.fetch(request({ ...payload(), contact: 'bad' }), readyEnv, ctx)).status, 422);
  assert.equal((await worker.fetch(request({ ...payload(), name: 'X'.repeat(9000) }), readyEnv, ctx)).status, 413);
});

test('Worker отвечает успехом только после сохранения и передаёт уведомление в waitUntil', async () => {
  let saved; const background = []; let delivered;
  const worker = createWorker(async () => ({ rateLimit: async () => true,
    save: async value => { saved = value; return { leadId: value.leadId, duplicate: false }; },
    deliver: async id => { delivered = id; } }));
  const response = await worker.fetch(request(payload()), readyEnv, { waitUntil(promise) { background.push(promise); } });
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.leadId, saved.leadId);
  assert.equal(result.status, 'saved');
  assert.ok(saved.consent.timestamp);
  assert.equal(saved.website, undefined);
  await Promise.all(background);
  assert.equal(delivered, result.leadId);
});

test('Worker использует страну Cloudflare, а не поддельный заголовок посетителя', async () => {
  const req = new Request('https://landing.example/api/country', { headers: { 'CF-IPCountry': 'NO' } });
  Object.defineProperty(req, 'cf', { value: { country: 'ES' } });
  assert.deepEqual(await (await createWorker().fetch(req, {}, {})).json(), { country: 'ES', source: 'ip' });
});

test('После явного включения приёма ошибка конфигурации уведомлений не препятствует сохранению', async () => {
  let saved = false; const background = [];
  const worker = createWorker(async () => ({ rateLimit: async () => true,
    save: async value => { saved = true; return { leadId: value.leadId, duplicate: false }; },
    deliver: async () => {} }));
  const response = await worker.fetch(request(payload()), { LEADS_ENABLED: 'true' }, { waitUntil(promise) { background.push(promise); } });
  assert.equal(response.status, 200);
  assert.equal(saved, true);
  await Promise.all(background);
});

async function database(t) {
  const mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: 'export default { fetch() { return new Response("ok"); } };', d1Databases: ['DB'] }));
  t.after(() => mf.dispose());
  const db = await mf.getD1Database('DB');
  for (const name of ['0001_leads.sql', '0002_lead_retention.sql', '0003_google_sheets.sql']) {
    const sql = await readFile(new URL('../migrations/' + name, import.meta.url), 'utf8');
    for (const statement of sql.split(';').filter(part => part.trim())) await db.prepare(statement).run();
  }
  return db;
}
test('D1 сохраняет зашифрованный лид, исключает конкурентные дубли и ограничивает частоту', async t => {
  const db = await database(t);
  const store = await createCloudStore({ DB: db, LEAD_ENCRYPTION_KEY: secret });
  const value = lead();
  const results = await Promise.all([store.save(value), store.save({ ...value, requestId: crypto.randomUUID(), leadId: crypto.randomUUID() })]);
  assert.equal(results[0].leadId, results[1].leadId);
  assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM leads').first()).count, 1);
  const row = await db.prepare('SELECT * FROM leads').first();
  assert.ok(!row.payload.includes(value.contact));
  assert.equal((await decrypt((await keys(secret)).encryption, row.payload)).name, value.name);
  for (let index = 0; index < 12; index++) assert.equal(await store.rateLimit('192.0.2.1'), true);
  assert.equal(await store.rateLimit('192.0.2.1'), false);
  assert.equal((await db.prepare('SELECT bucket_key FROM lead_rate_limits').first()).bucket_key.includes('192.0.2.1'), false);
});

test('Повторное применение схемы не удаляет сохранённые заявки', async t => {
  const db = await database(t);
  const store = await createCloudStore({ DB: db, LEAD_ENCRYPTION_KEY: secret });
  const saved = await store.save(lead());
  const sql = await readFile(new URL('../migrations/0001_leads.sql', import.meta.url), 'utf8');
  for (const statement of sql.split(';').filter(part => part.trim())) await db.prepare(statement).run();
  assert.equal((await db.prepare('SELECT id FROM leads').first()).id, saved.leadId);
});

test('Успешный email завершает очередь без Telegram и повторной отправки', async t => {
  const db = await database(t); const sent = [];
  const env = { DB: db, LEAD_ENCRYPTION_KEY: secret, ...readyEnv,
    RESEND_API_KEY: 'test-only', LEAD_EMAIL_FROM: 'test@example.com', LEAD_NOTIFICATION_EMAILS: 'receiver@example.com' };
  const store = await createCloudStore(env, async (url, options) => {
    sent.push({ url, options });
    return Response.json({ id: 'test-email' });
  });
  const value = lead(); await store.save(value); await store.deliver(value.leadId);
  const row = await db.prepare('SELECT * FROM leads').first();
  assert.equal(row.email_status, 'sent');
  assert.equal(row.telegram_status, 'pending');
  assert.equal(row.last_error, null);
  await db.prepare('UPDATE leads SET next_attempt_at = 0').run();
  assert.deepEqual(await store.pending(), []);
  await store.deliver(value.leadId);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].url, 'https://api.resend.com/emails');
  assert.equal(sent[0].options.headers['Idempotency-Key'], `spain-property-lead/${value.leadId}`);
});

test('Сбой Resend не теряет сохранённый лид; повтор отправляет всем email', async t => {
  const db = await database(t); let fails = true; const calls = [];
  const env = { DB: db, LEAD_ENCRYPTION_KEY: secret, ...readyEnv,
    RESEND_API_KEY: 'test-only', LEAD_EMAIL_FROM: 'Spain Property for Sale <leads@example.com>', LEAD_NOTIFICATION_EMAILS: 'one@example.com,two@example.com' };
  const store = await createCloudStore(env, async (url, options) => {
    calls.push({ url, options });
    if (url === 'https://api.resend.com/emails') return fails ? Response.json({ error: 'unavailable' }, { status: 503 }) : Response.json({ id: 'test-email' });
    return Response.json({ ok: true });
  });
  const value = lead(); const saved = await store.save(value);
  await store.deliver(saved.leadId);
  let row = await db.prepare('SELECT * FROM leads').first();
  assert.equal(row.email_status, 'pending');
  assert.deepEqual(await store.pending(), []);
  await db.prepare('UPDATE leads SET next_attempt_at = 0').run();
  assert.deepEqual(await store.pending(), [saved.leadId]);
  assert.equal((await decrypt((await keys(secret)).encryption, row.payload)).contact, value.contact);
  fails = false;
  await db.prepare('UPDATE leads SET next_attempt_at = 0').run();
  await store.deliver(saved.leadId);
  row = await db.prepare('SELECT * FROM leads').first();
  assert.equal(row.email_status, 'sent');
  assert.equal(calls.length, 2);
  assert.ok(calls.every(call => call.url === 'https://api.resend.com/emails'));
  assert.deepEqual(await store.pending(), []);
  for (const call of calls.filter(call => call.url === 'https://api.resend.com/emails')) assert.deepEqual(JSON.parse(call.options.body).to, ['one@example.com', 'two@example.com']);
});

test('Очистка срока хранения удаляет только заявки старше 180 дней', async t => {
  const db = await database(t);
  const now = Date.now();
  t.mock.method(Date, 'now', () => now);
  const store = await createCloudStore({ DB: db, LEAD_ENCRYPTION_KEY: secret });
  const ids = [];
  for (const [index, age] of [180 * 86400000 + 1, 180 * 86400000, 1000].entries()) {
    const saved = await store.save({ ...lead(), contact: `@retention_test_${index}` });
    ids.push(saved.leadId);
    await db.prepare('UPDATE leads SET created_at = ? WHERE id = ?').bind(now - age, saved.leadId).run();
  }
  await store.cleanupExpiredLeads();
  const remaining = (await db.prepare('SELECT id FROM leads').all()).results.map(row => row.id);
  assert.equal(remaining.includes(ids[0]), false);
  assert.equal(remaining.includes(ids[1]), true);
  assert.equal(remaining.includes(ids[2]), true);
});


test('Ошибка Sheets не мешает email; повтор Sheets не повторяет отправленное письмо', async t => {
  const db = await database(t); let sheetsFail = true; const calls = [];
  const env = { DB: db, LEAD_ENCRYPTION_KEY: secret, LEADS_ENABLED: 'true',
    RESEND_API_KEY: 'test-only', LEAD_EMAIL_FROM: 'test@example.com', LEAD_NOTIFICATION_EMAILS: 'receiver@example.com',
    GOOGLE_SHEETS_ENABLED: 'true', GOOGLE_SHEETS_WEBHOOK_SECRET: 'a'.repeat(64), GOOGLE_SHEETS_WEBHOOK_URL: 'https://script.google.com/macros/s/test-script/exec' };
  const store = await createCloudStore(env, async (url, options) => {
    calls.push(url);
    if (url === 'https://api.resend.com/emails') return Response.json({ id: 'test-email' });
    const payload = JSON.parse(JSON.parse(options.body).payload);
    return Response.json(sheetsFail ? { ok: false } : { ok: true, leadId: payload.leadId });
  });
  const saved = await store.save(lead()); await store.deliver(saved.leadId);
  let row = await db.prepare('SELECT * FROM leads').first();
  assert.equal(row.email_status, 'sent'); assert.equal(row.sheets_status, 'pending');
  sheetsFail = false; await db.prepare('UPDATE leads SET next_attempt_at = 0').run();
  assert.deepEqual(await store.pending(), [saved.leadId]); await store.deliver(saved.leadId);
  row = await db.prepare('SELECT * FROM leads').first();
  assert.equal(row.sheets_status, 'sent');
  assert.equal(calls.filter(url => url === 'https://api.resend.com/emails').length, 1);
  assert.equal(calls.filter(url => url.includes('script.google.com')).length, 2);
  await db.prepare('UPDATE leads SET next_attempt_at = 0').run(); assert.deepEqual(await store.pending(), []);
});

test('Сохранённые ранее заявки выгружаются в Sheets без повторного email', async t => {
  const db = await database(t); const calls = [];
  const env = { DB: db, LEAD_ENCRYPTION_KEY: secret, GOOGLE_SHEETS_ENABLED: 'true',
    GOOGLE_SHEETS_WEBHOOK_SECRET: 'a'.repeat(64), GOOGLE_SHEETS_WEBHOOK_URL: 'https://script.google.com/macros/s/test-script/exec' };
  const store = await createCloudStore(env, async (url, options) => {
    calls.push(url); return Response.json({ ok: true, leadId: JSON.parse(JSON.parse(options.body).payload).leadId });
  });
  const saved = await store.save(lead()); await db.prepare("UPDATE leads SET email_status = 'sent'").run();
  assert.deepEqual(await store.pending(), [saved.leadId]); await store.deliver(saved.leadId);
  assert.deepEqual(calls, [env.GOOGLE_SHEETS_WEBHOOK_URL]);
  assert.equal((await db.prepare('SELECT sheets_status FROM leads').first()).sheets_status, 'sent');
});

test('Ошибка email не блокирует Sheets; успешная строка не экспортируется повторно', async t => {
  const db = await database(t); let emailFails = true; const calls = [];
  const env = { DB: db, LEAD_ENCRYPTION_KEY: secret,
    RESEND_API_KEY: 'test-only', LEAD_EMAIL_FROM: 'test@example.com', LEAD_NOTIFICATION_EMAILS: 'receiver@example.com',
    GOOGLE_SHEETS_ENABLED: 'true', GOOGLE_SHEETS_WEBHOOK_SECRET: 'a'.repeat(64), GOOGLE_SHEETS_WEBHOOK_URL: 'https://script.google.com/macros/s/test-script/exec' };
  const store = await createCloudStore(env, async (url, options) => {
    calls.push(url);
    if (url === 'https://api.resend.com/emails') return emailFails ? Response.json({ error: 'unavailable' }, { status: 503 }) : Response.json({ id: 'test-email' });
    return Response.json({ ok: true, leadId: JSON.parse(JSON.parse(options.body).payload).leadId });
  });
  const saved = await store.save(lead()); await store.deliver(saved.leadId);
  let row = await db.prepare('SELECT * FROM leads').first();
  assert.equal(row.email_status, 'pending'); assert.equal(row.sheets_status, 'sent');
  emailFails = false; await db.prepare('UPDATE leads SET next_attempt_at = 0').run(); await store.deliver(saved.leadId);
  row = await db.prepare('SELECT * FROM leads').first(); assert.equal(row.email_status, 'sent');
  assert.equal(calls.filter(url => url.includes('script.google.com')).length, 1);
  assert.equal(calls.filter(url => url === 'https://api.resend.com/emails').length, 2);
});

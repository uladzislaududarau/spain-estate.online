import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { sendToGoogleSheets, sheetRow, sheetColumns } from '../cloudflare/google-sheets.mjs';

const env = { GOOGLE_SHEETS_ENABLED: 'true', GOOGLE_SHEETS_WEBHOOK_SECRET: 'a'.repeat(64), GOOGLE_SHEETS_WEBHOOK_URL: 'https://script.google.com/macros/s/test-deployment/exec' };
const lead = { leadId: randomUUID(), savedAt: '2026-11-05T12:34:56.000Z', name: 'Тест', contact: '@test_contact', messenger: 'telegram', language: 'ru',
  answers: { regions: ['mallorca'], purpose: 'investment', propertyType: 'villa', budgets: ['200k-300k', '300k-500k'], timeline: 'visit-next-month' },
  consent: { accepted: true, timestamp: '2026-11-05T12:34:56.000Z', policyVersion: '2026-11-04' } };

test('Sheets получает подписанный запрос с ID, датами и отдельными критериями без секретов в URL', async () => {
  let envelope;
  assert.equal(await sendToGoogleSheets(lead, env, async (url, options) => {
    assert.equal(url, env.GOOGLE_SHEETS_WEBHOOK_URL); assert.ok(!url.includes(lead.contact));
    envelope = JSON.parse(options.body);
    return Response.json({ ok: true, leadId: lead.leadId });
  }), true);
  assert.equal(envelope.signature, createHmac('sha256', env.GOOGLE_SHEETS_WEBHOOK_SECRET).update(`${envelope.issuedAt}\n${envelope.payload}`).digest('hex'));
  const payload = JSON.parse(envelope.payload);
  assert.equal(payload.values.length, sheetColumns.length); assert.equal(payload.values[0], lead.leadId);
  assert.equal(payload.values[1], '05.11.2026'); assert.equal(payload.values[2], '14:34:56');
  assert.equal(payload.values[11], '200 000–300 000 €\n300 000–500 000 €');
  assert.equal(payload.values[12], 'Приезд в Испанию: В ближайший месяц');
  assert.equal(sheetRow({ ...lead, answers: { ...lead.answers, timeline: 'soon' } })[12], 'В ближайшее время');
});

test('Без включения канал не вызывается, чужие URL и ложное подтверждение отклоняются', async () => {
  let calls = 0;
  assert.equal(await sendToGoogleSheets(lead, {}, async () => { calls++; }), false);
  for (const url of ['http://script.google.com/macros/s/test/exec', 'https://other.example/exec', env.GOOGLE_SHEETS_WEBHOOK_URL + '?key=secret', 'https://script.google.com/macros/s/test/dev']) {
    await assert.rejects(sendToGoogleSheets(lead, { ...env, GOOGLE_SHEETS_WEBHOOK_URL: url }, async () => { calls++; }));
  }
  assert.equal(calls, 0);
  await assert.rejects(sendToGoogleSheets(lead, env, async () => Response.json({ ok: true, leadId: randomUUID() })));
  await assert.rejects(sendToGoogleSheets(lead, env, async () => new Response('<html>Login</html>')));
});

async function receiver() {
  const source = await readFile(new URL('../google-sheets/Code.gs', import.meta.url), 'utf8');
  const rows = [sheetColumns.slice()]; let held = false;
  const sheet = { getLastRow: () => rows.length, getRange(row, column, count, width) {
    return { getValues: () => rows.slice(row - 1, row - 1 + count).map(r => r.slice(column - 1, column - 1 + width)),
      createTextFinder: value => ({ matchEntireCell() { return this; }, matchCase() { return this; }, findNext: () => rows.slice(1).some(r => r[0] === value) ? {} : null }),
      setNumberFormat() { return this; }, setValues(values) { rows[row - 1] = values[0]; return this; }, setWrap() { return this; }, setVerticalAlignment() { return this; } };
  } };
  const context = vm.createContext({
    PropertiesService: { getScriptProperties: () => ({ getProperty: name => ({ SPREADSHEET_ID: 'test-sheet', WEBHOOK_SECRET: env.GOOGLE_SHEETS_WEBHOOK_SECRET })[name] }) },
    Utilities: { Charset: { UTF_8: 'UTF-8' }, computeHmacSha256Signature: (data, key) => [...createHmac('sha256', key).update(data).digest()] },
    LockService: { getScriptLock: () => ({ tryLock: () => { if (held) return false; held = true; return true; }, hasLock: () => held, releaseLock: () => { held = false; } }) },
    SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet }), flush() {} },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ setMimeType: () => JSON.parse(text) }) }
  });
  vm.runInContext(source, context);
  return { rows, context, call: envelope => context.doPost({ postData: { contents: JSON.stringify(envelope) } }) };
}
function signed(values = sheetRow(lead), issuedAt = Date.now()) {
  const payload = JSON.stringify({ leadId: lead.leadId, values });
  return { version: 1, issuedAt, payload, signature: createHmac('sha256', env.GOOGLE_SHEETS_WEBHOOK_SECRET).update(`${issuedAt}\n${payload}`).digest('hex') };
}

test('Приёмник отклоняет подменённый HMAC и старый запрос, повтор не создаёт строку', async () => {
  const receiverApp = await receiver();
  assert.equal(receiverApp.call({ ...signed(), signature: '0'.repeat(64) }).ok, false);
  assert.equal(receiverApp.call(signed(undefined, Date.now() - 360000)).ok, false);
  assert.equal(receiverApp.rows.length, 1);
  assert.equal(receiverApp.call(signed()).ok, true);
  assert.equal(receiverApp.call(signed()).duplicate, true);
  assert.equal(receiverApp.rows.length, 2);
  receiverApp.rows[0][0] = 'Неверная колонка';
  const other = { ...lead, leadId: randomUUID() };
  const raw = JSON.stringify({ leadId: other.leadId, values: sheetRow(other) }); const issuedAt = Date.now();
  assert.equal(receiverApp.call({ version: 1, issuedAt, payload: raw, signature: createHmac('sha256', env.GOOGLE_SHEETS_WEBHOOK_SECRET).update(`${issuedAt}\n${raw}`).digest('hex') }).ok, false);
});

test('Имена, телефоны и username не становятся формулами в таблице', async () => {
  const app = await receiver(); const values = sheetRow(lead);
  values[4] = '=IMPORTXML("https://example.com", "x")'; values[6] = '+34612345678';
  assert.equal(app.call(signed(values)).ok, true);
  assert.equal(app.rows[1][4][0], "'"); assert.equal(app.rows[1][6], "'+34612345678");
  assert.equal(app.context.safeCell_('@username'), "'@username");
  assert.equal(app.context.safeCell_('  =1+1'), "'  =1+1");
});

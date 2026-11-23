import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { validateLead } from '../server/schema.mjs';
import { createApp } from '../server/index.mjs';
import { createWorker } from '../cloudflare/worker.mjs';
import { leadMessage } from '../cloudflare/notifications.mjs';
import { sheetRow, sheetColumns } from '../cloudflare/google-sheets.mjs';
import { policyVersion } from '../showcase/assets/quiz.config.mjs';
import { generateBudgetRanges } from '../showcase/assets/pricing.mjs';

function payload() {
  return {
    requestId: randomUUID(), name: 'Тест Покупателя', language: 'ru',
    answers: { purpose: 'holiday-home', propertyType: 'villa', regions: ['costa-barcelona'], budgets: ['dynamic'], timeline: 'online-viewings' },
    region: 'unspecified', messenger: 'telegram', contact: '@pricing_test',
    consent: { accepted: true, policyVersion }, website: '',
    pricing: { version: 1, regions: ['costa-barcelona'], cities: ['barcelona'], propertyType: 'villa', budget: { min: 400000, max: 400000, custom: true }, crossRegionOptIn: false },
    attribution: { source: 'cinematic-quiz', utm_source: 'test', utm_campaign: 'coastal', landing: 'https://spain-estate.online/?utm_source=test', referrer: 'https://example.com/' }
  };
}

test('Multiple nonadjacent budget choices survive validation, notifications and Sheets without filling gaps', () => {
  const input = payload();
  const { ranges } = generateBudgetRanges(input.pricing);
  const chosen = [ranges[0], ranges[2], ranges[4]].map(({ min, max }) => ({ min, max }));
  input.pricing.budget = { ranges: [...chosen].reverse() };
  const result = validateLead(input);
  assert.equal(result.error, undefined);
  assert.deepEqual(result.data.pricing.budget, { ranges: chosen });
  const lead = { ...result.data, leadId: randomUUID(), savedAt: '2026-11-17T12:00:00.000Z' };
  const message = leadMessage(lead);
  assert.match(message, /Бюджет покупателя: .*; .*; от /);
  assert.ok(sheetRow(lead).some(value => value.includes('Бюджет покупателя:') && value.includes(';')));
  assert.equal(result.data.pricing.canSubmit, true);
});

test('Empty, duplicate, invented and stale multi-range budgets are rejected', () => {
  const input = payload();
  const [first] = generateBudgetRanges(input.pricing).ranges;
  const range = { min: first.min, max: first.max };
  for (const ranges of [[], [range, range], [{ min: 123, max: 456 }]]) {
    input.pricing.budget = { ranges };
    assert.equal(validateLead(input).error, 'invalid_request');
  }
  input.pricing.budget = { ranges: [range] };
  input.pricing.propertyType = input.answers.propertyType = 'apartment';
  assert.equal(validateLead(input).error, 'invalid_request');
});

test('Online-viewing preference is independent of visit timing and retained in delivery', () => {
  for (const onlineViewings of [false, true]) {
    const input = payload();
    input.answers.timeline = 'visit-next-month';
    input.answers.onlineViewings = onlineViewings;
    const result = validateLead(input);
    assert.equal(result.error, undefined);
    assert.equal(result.data.answers.onlineViewings, onlineViewings);
    const lead = { ...result.data, leadId: randomUUID(), savedAt: '2026-11-17T12:00:00.000Z' };
    assert.equal(leadMessage(lead).includes('Хочу смотреть объекты онлайн'), onlineViewings);
    assert.equal(sheetRow(lead)[12].includes('Хочу смотреть объекты онлайн'), onlineViewings);
  }
});

test('Checklist request is optional, validated as a boolean and retained in delivery', () => {
  for (const checklist of [undefined, false, true]) {
    const input = payload();
    if (checklist !== undefined) input.answers.checklist = checklist;
    const result = validateLead(input);
    assert.equal(result.error, undefined);
    assert.equal(result.data.answers.checklist, checklist);
    const lead = { ...result.data, leadId: randomUUID(), savedAt: '2026-11-23T12:00:00.000Z' };
    assert.equal(leadMessage(lead).includes('Что нужно проверить перед покупкой недвижимости в Испании'), checklist === true);
    assert.equal(sheetRow(lead)[12].includes('Добавить чек-лист перед покупкой'), checklist === true);
    assert.equal(sheetRow(lead).length, 18);
  }
  const invalid = payload();
  invalid.answers.checklist = 'yes';
  assert.equal(validateLead(invalid).error, 'invalid_request');
});

test('Viber and telephone leads validate phone/country and preserve the delivery method', () => {
  for (const [messenger, label] of [['viber', 'Viber'], ['phone', 'Телефон']]) {
    const input = payload();
    input.messenger = messenger;
    input.contact = '+34 612 345 678';
    input.phoneCountry = 'ES';
    const result = validateLead(input);
    assert.equal(result.error, undefined);
    assert.equal(result.data.contact, '+34612345678');
    assert.equal(result.data.messenger, messenger);
    const lead = { ...result.data, leadId: randomUUID(), savedAt: '2026-11-17T12:00:00.000Z' };
    assert.ok(leadMessage(lead).includes(`Способ связи: ${label}`));
    assert.equal(sheetRow(lead)[5], label);
    input.contact = '@username';
    assert.equal(validateLead(input).error, 'invalid_contact');
    input.contact = '+34612345678'; input.phoneCountry = 'CY';
    assert.equal(validateLead(input).error, 'invalid_contact');
  }
});

test('New leads recompute price thresholds, preserve below-minimum enquiries and geographic notes', () => {
  const input = payload();
  input.pricing.minimum = 1;
  input.pricing.belowMinimum = false;
  input.pricing.eligible = [{ cityId: 'barcelona', type: 'villa', minimum: 1 }];
  const result = validateLead(input);
  assert.equal(result.error, undefined);
  assert.equal(result.data.pricing.minimum, 1000000);
  assert.equal(result.data.pricing.belowMinimum, true);
  assert.equal(result.data.pricing.canSubmit, true);
  assert.deepEqual(result.data.pricing.eligible, []);
  assert.match(result.data.pricing.ineligible[0].note, /пригород/);
  assert.equal(result.data.attribution.utm_campaign, 'coastal');
});

test('Stale cities, mismatched answers, negative budgets and unbounded attribution are rejected', () => {
  for (const mutate of [
    body => { body.pricing.cities = ['javea']; },
    body => { body.answers.propertyType = 'apartment'; },
    body => { body.answers.regions = ['costa-blanca']; },
    body => { body.pricing.budget.min = -1; },
    body => { body.pricing.budget.max = 300000; },
    body => { body.attribution.utm_source = 'a'.repeat(201); }
  ]) {
    const body = payload(); mutate(body);
    assert.equal(validateLead(body).error, 'invalid_request');
  }
});

test('Email and Sheets retain custom budget, below-minimum status, suburb notes and UTM using the existing column contract', () => {
  const lead = { ...validateLead(payload()).data, leadId: randomUUID(), savedAt: '2026-11-16T12:00:00.000Z' };
  const text = leadMessage(lead);
  assert.match(text, /400[\s\u00a0]000/);
  assert.match(text, /пригород Барселоны/);
  assert.match(text, /Ниже ориентира/);
  assert.match(text, /utm_campaign: coastal/);
  const row = sheetRow(lead);
  assert.equal(row.length, sheetColumns.length);
  assert.equal(row.length, 18);
  assert.match(row[11], /пригород Барселоны/);
  assert.match(row[17], /utm_source: test/);
  assert.ok(row.every(value => value.length <= 4000));
});

test('Cloudflare saves trusted pricing before success and does not report success on storage failure', async () => {
  let saved;
  const worker = createWorker(async () => ({
    rateLimit: async () => true,
    save: async lead => { saved = lead; return { leadId: lead.leadId, duplicate: false }; },
    deliver: async () => {}
  }));
  const request = () => new Request('https://spain-estate.online/api/lead', { method: 'POST', headers: { Origin: 'https://spain-estate.online', 'Content-Type': 'application/json' }, body: JSON.stringify(payload()) });
  const response = await worker.fetch(request(), { LEADS_ENABLED: 'true' }, { waitUntil: () => {} });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).success, true);
  assert.equal(saved.pricing.minimum, 1000000);
  assert.equal(saved.pricing.belowMinimum, true);
  assert.match(saved.pricing.ineligible[0].note, /пригород/);
  const failing = createWorker(async () => ({ rateLimit: async () => true, save: async () => { throw new Error('test-storage-failure'); } }));
  const failed = await failing.fetch(request(), { LEADS_ENABLED: 'true' }, { waitUntil: () => {} });
  assert.equal(failed.status, 503);
  assert.equal((await failed.json()).success, undefined);
});

test('Node API accepts the same pricing payload and forwards full trusted data to storage', async t => {
  let saved;
  const app = await createApp({ saveLead: async lead => { saved = lead; return { lead, duplicate: false }; } });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => app.close(resolve)));
  const origin = `http://127.0.0.1:${app.address().port}`;
  const response = await fetch(origin + '/api/lead', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(payload()) });
  assert.equal(response.status, 200);
  assert.equal(saved.pricing.canSubmit, true);
  assert.equal(saved.pricing.minimum, 1000000);
  assert.equal(saved.attribution.utm_source, 'test');
});

test('Sequence assets are served with AVIF, JPEG and JSON MIME types without exposing source files', async t => {
  const app = await createApp({ saveLead: async lead => ({ lead, duplicate: false }) });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => app.close(resolve)));
  const origin = `http://127.0.0.1:${app.address().port}`;
  const frame = await fetch(origin + '/assets/sequence/desktop/frame_00001.avif');
  assert.equal(frame.status, 200);
  assert.equal(frame.headers.get('content-type'), 'image/avif');
  assert.ok(Buffer.from(await frame.arrayBuffer()).subarray(0, 32).includes(Buffer.from('avif')));
  const poster = await fetch(origin + '/assets/sequence/poster.jpg');
  assert.equal(poster.headers.get('content-type'), 'image/jpeg');
  assert.equal(Buffer.from(await poster.arrayBuffer()).subarray(0, 2).toString('hex'), 'ffd8');
  const manifest = await fetch(origin + '/assets/sequence/desktop/manifest.json');
  assert.match(manifest.headers.get('content-type'), /application\/json/);
  assert.equal((await manifest.json()).count, 240);
  assert.equal((await fetch(origin + '/server/schema.mjs')).status, 404);
});

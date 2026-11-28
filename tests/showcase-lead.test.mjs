import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLead } from '../server/schema.mjs';
import { leadMessage } from '../cloudflare/notifications.mjs';
import { sheetRow, sheetColumns } from '../cloudflare/google-sheets.mjs';
import { policyVersion } from '../showcase/assets/quiz.config.mjs';

const base = () => ({ kind: 'showcase', requestId: crypto.randomUUID(), name: 'Анна', language: 'ru', leadType: 'property_presentation', property: 'tm-tower',
  messenger: 'whatsapp', phoneCountry: 'ES', contact: '+34 612 345 678', consent: { accepted: true, policyVersion }, website: '',
  attribution: { source: 'showcase', utm_source: 'youtube', landing: 'https://spain-estate.online/tm-tower' } });

test('Заявка витрины: объект, WhatsApp, нормализация номера', () => {
  const { data, error } = validateLead(base());
  assert.equal(error, undefined);
  assert.equal(data.contact, '+34612345678');
});
test('Заявка витрины: все объекты через Telegram', () => {
  const lead = { ...base(), leadType: 'catalog_access', messenger: 'telegram', contact: '@test_user' };
  delete lead.property; delete lead.phoneCountry;
  assert.equal(validateLead(lead).data.contact, '@test_user');
});
test('Заявка витрины отклоняет неверные данные', () => {
  assert.equal(validateLead({ ...base(), property: 'unknown' }).error, 'invalid_request');
  assert.equal(validateLead({ ...base(), leadType: 'catalog_access' }).error, 'invalid_request');
  assert.equal(validateLead({ ...base(), consent: { accepted: false, policyVersion } }).error, 'invalid_request');
  assert.equal(validateLead({ ...base(), phoneCountry: 'GB' }).error, 'invalid_contact');
  assert.equal(validateLead({ ...base(), extra: 1 }).error, 'invalid_request');
});
test('Письмо и строка таблицы для заявки витрины', () => {
  const { data } = validateLead(base());
  const lead = { ...data, leadId: crypto.randomUUID(), savedAt: '2026-11-28T10:00:00.000Z', consent: { ...data.consent, timestamp: '2026-11-28T10:00:00.000Z' } };
  const text = leadMessage(lead);
  assert.match(text, /Презентация объекта: TM Tower \(от €607 000\)/);
  assert.match(text, /utm_source: youtube/);
  const row = sheetRow(lead);
  assert.equal(row.length, sheetColumns.length);
  assert.equal(row[9], 'Презентация объекта: TM Tower (от €607 000)');
});

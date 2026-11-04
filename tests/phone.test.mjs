import { policyVersion } from '../showcase/assets/quiz.config.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as tools from 'libphonenumber-js/min';
import { resolveCountry } from '../server/country.mjs';
import { phoneValue, applyDetectedCountry, countryFromLocale } from '../showcase/assets/phone-field.mjs';
import { validateLead } from '../server/schema.mjs';
import { randomUUID } from 'node:crypto';

test('Публичный IP Норвегии и Испании определяет соответствующую страну', () => {
  const request = ip => ({ headers: {}, socket: { remoteAddress: ip } });
  assert.equal(resolveCountry(request('80.203.0.1')).country, 'NO');
  assert.equal(resolveCountry(request('80.24.0.1')).country, 'ES');
  assert.equal(resolveCountry(request('::ffff:80.203.0.1')).country, 'NO');
  assert.equal(resolveCountry(request('::1')).country, null);
});
test('Заголовки стран доверяются только выбранной платформе', () => {
  const request = { headers: { 'cf-ipcountry': 'NO', 'x-vercel-ip-country': 'ES', 'x-forwarded-for': '80.24.0.1' }, socket: { remoteAddress: '127.0.0.1' } };
  assert.equal(resolveCountry(request).country, null);
  assert.equal(resolveCountry(request, { provider: 'cloudflare' }).country, 'NO');
  assert.equal(resolveCountry(request, { provider: 'vercel' }).country, 'ES');
  request.headers['cf-ipcountry'] = 'XX';
  assert.equal(resolveCountry(request, { provider: 'cloudflare' }).country, null);
});
test('Номер нормализуется с кодом страны, длина проверяется для выбранной страны', () => {
  assert.equal(phoneValue('406 12 345', 'NO', tools), '+4740612345');
  assert.equal(phoneValue('612 345 678', 'ES', tools), '+34612345678');
  assert.equal(phoneValue('06 12 34 56 78', 'FR', tools), '+33612345678');
  assert.equal(phoneValue('06 12345678', 'IT', tools), '+390612345678');
  assert.equal(phoneValue('+34 612 345 678', 'NO', tools), '+34612345678');
  assert.equal(phoneValue('1234', 'NO', tools), null);
  assert.equal(phoneValue('406123456789', 'NO', tools), null);
  assert.equal(phoneValue('call 40612345', 'NO', tools), null);
});
test('Запоздалая GeoIP-подстановка не меняет ручной выбор и введенный номер', () => {
  const supported = tools.getCountries();
  const automatic = { country: 'ES', source: 'fallback', hasInput: false };
  assert.equal(applyDetectedCountry(automatic, 'NO', supported), true);
  assert.equal(automatic.country, 'NO');
  for (const state of [ { country: 'ES', source: 'manual', hasInput: false }, { country: 'ES', source: 'fallback', hasInput: true }, { country: 'ES', source: 'number', hasInput: true } ]) {
    assert.equal(applyDetectedCountry(state, 'NO', supported), false);
    assert.equal(state.country, 'ES');
  }
  assert.equal(countryFromLocale(['en-NO'], supported), 'NO');
  assert.equal(countryFromLocale(['en'], supported), 'ES');
});
test('Сервер проверяет формат номера и соответствие выбранной стране', () => {
  const lead = { requestId: randomUUID(), name: 'Тестовый клиент', language: 'ru', answers: { purpose: 'investment', propertyType: 'apartment', regions: ['costa-blanca', 'mallorca'], budgets: ['under-100k'], timeline: 'soon' }, region: 'marbella', messenger: 'whatsapp', phoneCountry: 'NO', contact: '+4740612345', consent: { accepted: true, policyVersion }, website: '' };
  assert.equal(validateLead(lead).data.contact, '+4740612345');
  assert.equal(validateLead({ ...lead, phoneCountry: 'ES' }).error, 'invalid_contact');
  assert.equal(validateLead({ ...lead, contact: '+471234' }).error, 'invalid_contact');
  assert.equal(validateLead({ ...lead, phoneCountry: 'XX' }).error, 'invalid_request');
});

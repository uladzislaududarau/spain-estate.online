import test from 'node:test';
import assert from 'node:assert/strict';
import { readReceipt, rememberSavedLead, receiptFromSession, RECEIPT_KEY, isThankYouPath } from '../showcase/assets/lead-receipt.mjs';

const leadId = '11111111-2222-4333-8444-555555555555';
test('Благодарность требует подтверждения сервера и не хранит контакты', t => {
  const values = new Map();
  const previous = globalThis.sessionStorage;
  globalThis.sessionStorage = { setItem: (key, value) => values.set(key, value), getItem: key => values.get(key) };
  t.after(() => { if (previous === undefined) delete globalThis.sessionStorage; else globalThis.sessionStorage = previous; });
  assert.equal(rememberSavedLead({ success: false, leadId }, 'ru'), false);
  assert.equal(rememberSavedLead({ success: true, leadId: 'invalid' }, 'ru'), false);
  assert.equal(values.size, 0);
  assert.equal(rememberSavedLead({ success: true, leadId, name: 'Тест', contact: '@test_name' }, 'ru'), true);
  assert.equal(receiptFromSession().leadId, leadId);
  assert.deepEqual(Object.keys(JSON.parse(values.get(RECEIPT_KEY))).sort(), ['language', 'leadId', 'savedAt']);
});
test('Прямой визит, истёкшее подтверждение и недоступное хранилище не подтверждают лид', () => {
  const now = 2000000;
  for (const raw of [null, '{}', 'broken', JSON.stringify({leadId, language: 'ru', savedAt: now - 1800001}), JSON.stringify({leadId, language: 'ru', savedAt: now + 1})]) assert.equal(readReceipt(raw, now), null);
  assert.equal(readReceipt(JSON.stringify({leadId, language: 'ru', savedAt: now}), now).leadId, leadId);
  assert.equal(receiptFromSession(), null);
  assert.equal(rememberSavedLead({ success: true, leadId }, 'ru'), false);
  assert.equal(isThankYouPath('/thank-you'), true);
  assert.equal(isThankYouPath('/thank-you/'), true);
  assert.equal(isThankYouPath('/thank-you-other'), false);
});

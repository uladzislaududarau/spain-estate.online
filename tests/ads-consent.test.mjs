import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdsConsent, googleConsent, readPreferences, CONSENT_VERSION } from '../showcase/assets/ads-consent-state.mjs';

test('Без маркетингового согласия тег не загружается, в том числе при разрешённой аналитике', () => {
  const calls = []; const loads = [];
  const apply = createAdsConsent((...args) => calls.push(args), src => loads.push(src));
  apply({ analytics: false, marketing: false });
  apply({ analytics: true, marketing: false });
  assert.equal(loads.length, 0);
  assert.equal(calls.some(call => call[0] === 'config'), false);
  assert.equal(calls.at(-1)[2].ad_user_data, 'denied');
  assert.equal(calls.at(-1)[2].analytics_storage, 'granted');
});
test('Согласие передаётся до загрузки Google Ads, повторный выбор не дублирует тег', () => {
  const calls = [];
  const apply = createAdsConsent((...args) => calls.push(args), src => calls.push(['load', src]));
  apply({ analytics: false, marketing: true });
  assert.deepEqual(calls[0], ['consent', 'update', googleConsent({ analytics: false, marketing: true })]);
  assert.deepEqual(calls[2], ['config', 'AW-18527353101']);
  assert.equal(calls[3][1], 'https://www.googletagmanager.com/gtag/js?id=AW-18527353101');
  apply({ analytics: true, marketing: true });
  assert.equal(calls.filter(call => call[0] === 'load').length, 1);
  apply({ analytics: false, marketing: false });
  assert.equal(calls.at(-1)[2].ad_storage, 'denied');
});
test('Повреждённое, устаревшее и некорректное согласие не разрешает рекламу', () => {
  const now = Date.now();
  const value = { version: CONSENT_VERSION, analytics: false, marketing: true, savedAt: now };
  assert.deepEqual(readPreferences(JSON.stringify(value), now), value);
  for (const raw of [null, 'broken', '{}', JSON.stringify({ ...value, marketing: 'true' }), JSON.stringify({ ...value, savedAt: now + 1 }), JSON.stringify({ ...value, savedAt: now - 181 * 86400000 })]) assert.equal(readPreferences(raw, now), null);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinkedInConsent, LINKEDIN_PARTNER_ID, LINKEDIN_INSIGHT_URL } from '../showcase/assets/linkedin-insight.mjs';

test('LinkedIn stays unloaded without marketing consent, even when analytics is allowed', () => {
  const scope = {}; const loads = [];
  const apply = createLinkedInConsent(scope, src => loads.push(src));
  for (const marketing of [false, undefined, 'true']) apply({ analytics: true, marketing });
  assert.deepEqual(loads, []);
  assert.deepEqual(scope, {});
});

test('LinkedIn initializes the supplied partner once, queues calls and does not emit an extra conversion', () => {
  const scope = {}; const loads = [];
  const apply = createLinkedInConsent(scope, src => loads.push(src));
  apply({ marketing: true });
  apply({ marketing: true });
  assert.equal(scope._linkedin_partner_id, '10166378');
  assert.deepEqual(scope._linkedin_data_partner_ids, [LINKEDIN_PARTNER_ID]);
  assert.deepEqual(loads, [LINKEDIN_INSIGHT_URL]);
  assert.deepEqual(scope.lintrk.q, []);
  scope.lintrk('track', { conversion_id: 123 });
  assert.deepEqual(scope.lintrk.q, [['track', { conversion_id: 123 }]]);
});

test('Existing LinkedIn tags and queued calls are preserved', () => {
  const lintrk = () => {};
  const scope = { lintrk, _linkedin_data_partner_ids: ['another-account', LINKEDIN_PARTNER_ID] };
  createLinkedInConsent(scope, () => {})({ marketing: true });
  assert.equal(scope.lintrk, lintrk);
  assert.deepEqual(scope._linkedin_data_partner_ids, ['another-account', LINKEDIN_PARTNER_ID]);
});

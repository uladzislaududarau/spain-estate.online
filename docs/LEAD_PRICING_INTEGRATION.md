# Pricing leads and existing delivery contracts

Implemented locally on 2026-11-16. No deployment, DNS changes or external messages were performed.

The POST `/api/lead` envelope remains backwards compatible with the original quiz. Existing contacts, purpose/timeline choices, consent policy, rate limit, same-origin restriction, honeypot, encrypted storage and request/contact deduplication remain in place. New quiz sends `answers.budgets: ['dynamic']` plus optional `pricing`; legacy budgets remain accepted.

## Visitor inputs

```js
pricing: {
  version: 1,
  regions: ['costa-barcelona'],
  cities: ['barcelona'], // [] means any listed city in the selected regions
  anyCityRegions: [], // optional mixed any-city selection, restricted to selected regions
  propertyType: 'villa',
  budget: { min: 400000, max: 400000, custom: true },
  crossRegionOptIn: false
}
```

Generated budget ranges use an exclusive maximum. Exact custom budgets use `min === max`. The open maximum is `null`. Every finite non-negative budget up to €100m, including budgets below the table minimum, may be submitted. Missing price data for legacy penthouse/townhouse/commercial choices is preserved as missing, rather than inventing equivalence to apartment/villa.

Optional `attribution` supports `source` (100 chars), each standard `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` (200 chars), and `referrer`, `landing` (1024 chars). Input is bounded; the total HTTP body limit remains 8192 bytes.

`server/schema.mjs` rejects cities from unselected regions, stale/mismatched property type or region answers and malformed budgets. `server/pricing-lead.mjs` recomputes minimum, per-type eligibility, ineligible/missing rows, alternatives and geographical notes from the shared trusted table. Client-derived price values do not become authority.

## Storage and forwarding

Node's encrypted local JSON store and Cloudflare's encrypted D1 JSON payload preserve the complete trusted pricing summary and attribution without a database migration. Email notifications include the selected budget, individual thresholds, eligibility, alternatives, Barcelona/Valencia suburb and Finestrat notes where applicable, and attribution.

Google Sheets retains its existing **18-column** signed webhook contract. The `Бюджет` cell contains the complete human-readable pricing summary; the `Источник` cell contains the original site source plus attribution. No Apps Script redeployment or header migration is required for this contract. Existing stored leads without pricing continue to produce the original row and notifications.

The API responds with success only after durable save. Email/Sheets delivery continues through the original asynchronous queue and retry mechanism. Local API's `pending_crm_configuration` status is preserved: local storage success does not claim remote CRM/email delivery. External Resend/Google Sheets and live D1 delivery require a separately authorized production check; test transports are mocks only.

## Local production preview

The same server serves `showcase` by default. Set `STATIC_DIRECTORY=dist` (or an absolute directory) to serve the compiled build unchanged, including compiled legal and thank-you routes. This keeps one HTTP/API implementation and its existing security restrictions.

```sh
npm run build
PORT=4322 STATIC_DIRECTORY=dist LEAD_STORAGE_DIR=/private/tmp/spain-estate-preview-leads node server/index.mjs
```

This is a local preview with encrypted, isolated lead storage; it does not send email or Sheets requests. The Cloudflare Worker remains the existing production integration owner.

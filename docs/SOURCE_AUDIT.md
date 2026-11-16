# Spain Estate source audit

Audited 2026-11-16, original commit `97b8a62a72de3b4477bd085a41f3e54ad664d11a` from the user supplied repository. This is source evidence, not a claim of production delivery, browser verification, licence clearance or operator endorsement. No app-specific AGENTS.md or CLAUDE.md exists in this checkout. Root workspace instructions apply; restaurant-specific business facts do not apply to this independent property project.

## Actual stack and surfaces

The original is static HTML/CSS/ES modules (`showcase/`), Node 22 local HTTP/API server (`server/`), and Cloudflare Worker/D1 deployment (`cloudflare/`, `wrangler.jsonc`, SQL migrations). It is not React/Vite. Keep this working stack; GSAP/Canvas can be integrated as ES modules without a framework migration. Node dependencies are `geoip-country`, `libphonenumber-js`, `zod`; Wrangler is a development dependency. No animation library existed at the audited commit.

Routes: `/` landing; `/thank-you` saved-lead receipt; `/privacy`, `/legal`, `/en/privacy`, `/en/legal`; `/api/country`, `/api/lead`; robots/sitemap; static assets. Old index/showcase/concept URLs redirect to `/`. Legal pages have Russian and English versions. Landing itself has Russian source, though the quiz config supports both ru/en. Original 404 is minimal.

Original visual: a compact viewport composition, arch-shaped image slider, Montserrat/Manrope, blue action, cream/travertine ground. Slider rotates ten architecture images; the rebuild should replace this interface, not reskin it. Useful source content: selection by criteria in Spain, geographic destinations, property type, purchase purpose, planned visit, WhatsApp/Telegram contact. Unsupported public claims in the old hero include “largest catalogue”, “1000+ current objects”, and exclusivity. No live inventory feed proves those claims; omit them.

## Original quiz contract

Order and exact IDs:

1. `propertyType`: apartment, villa, penthouse, townhouse, commercial.
2. `regions` (multiple; `undecided` exclusive): costa-blanca, costa-calida, valencia, costa-dorada, barcelona, costa-del-sol, mallorca, undecided.
3. `budgets` (multiple): under-100k, 100k-200k, 200k-300k, 300k-500k, 500k-1m, 1m-plus.
4. `purpose`: permanent-home, investment, personal-and-rental, holiday-home.
5. `timeline`: already-in-spain, visit-next-month, visit-3-6-months, visit-later, online-viewings.
6. Contact: name, WhatsApp or Telegram, contact value, phone country for WhatsApp, processing consent, hidden `website` honeypot.

Original single choices auto advance after 1800ms, with Next/Back also available. Multi choices need Next. State is saved to sessionStorage key `spain-property-quiz-v2`, schemaVersion 6; name, contact and consent are memory only. Request ID survives retry. Dialog uses showModal/focus return; original Escape cancel is prevented, so preserve dismissal affordances and consider restoring conventional Escape. Original consent variable starts true despite legal text saying unselected: a real existing mismatch to fix.

`POST /api/lead` JSON is strict at top level and `answers` level. Existing request:

```json
{
  "requestId": "UUID",
  "name": "normalised letters, max 80",
  "language": "ru or en",
  "answers": {
    "purpose": "enum above",
    "propertyType": "enum above",
    "regions": ["enum above"],
    "budgets": ["enum above"],
    "timeline": "enum above"
  },
  "region": "unspecified",
  "messenger": "whatsapp or telegram",
  "phoneCountry": "optional ISO two-letter country",
  "contact": "international phone or valid Telegram username",
  "consent": {"accepted": true, "policyVersion": "2026-11-05"},
  "website": ""
}
```

The separate legacy `region` enum is costa-blanca, marbella, mallorca, barcelona, unspecified. Phone validation uses libphonenumber-js/max and checks selected country/calling code. Schema imports config values, so config changes directly affect request validation. Existing encrypted leads and notification formatting need legacy labels after changing IDs. New cities/dynamic budget/pricing context/attribution require explicit validated additions; just adding fields on the client is rejected.

Both local and Worker body size limit is 8192 bytes; same-origin JSON POST, cross-site rejection, honeypot and 12 requests/minute protection exist. Success is returned only after storage confirms persistence: HTTP 200 `{success:true,leadId,status:'saved',duplicate}`. Do not equate this with email/Sheets delivery.

## Storage, delivery and conversion

Local server saves lead records in ignored local storage and marks delivery pending CRM configuration. Production Worker requires LEADS_ENABLED=true and configured D1/encryption key. D1 stores encrypted full payload; duplicate prevention uses request ID/contact fingerprint and a ten minute contact window. Scheduled work retries pending deliveries and deletes D1 leads after 180 days. No production secrets were inspected or changed during this audit.

Email notifications use Resend, configured recipients and sender, idempotency key, and `cloudflare/notifications.mjs` `leadMessage()`. It iterates quiz config options and legacy labels. Google Sheets is an optional signed Apps Script webhook (`GOOGLE_SHEETS_ENABLED`); it uses fixed 18 columns in `sheetColumns`, HMAC-SHA256 and delivery acknowledgement. Any new fields must be added without silently discarding old columns/payloads. D1 cleanup does not remove copies from email or Sheets.

Google Ads ID `AW-18554200616` is configured. Four Consent Mode values default denied; Google script loads only after marketing consent. No GA4 identifier or explicit `gtag('event','conversion',…)`/conversion label is present in source. Existing setup likely relies on page targeting or external account configuration; this is unverified. Thank-you route is guarded by a valid session receipt created only after successful save, expiring after 30 minutes. Preserve that gate. No UTM/gclid capture or transport exists in original lead payload. Add bounded attribution, exclude personal data from analytics, and fire any success event only on saved-lead acknowledgement.

## SEO/build/performance constraints

`server/seo.mjs` builds canonical/OG/WebSite schema only from explicit HTTPS SITE_URL. Local builds stay noindex. Production main in Workers CI can resolve known domain. `renderThankYou` forces noindex/nofollow. Preserve this environment behavior.

Build recursively copies assets referenced by literal HTML/CSS/JS imports. Runtime constructed frame filenames and fetched manifests are not automatically discovered; explicitly copy sequence trees and engine/vendor files into dist. Current local asset route/MIME allowlist excludes AVIF and JSON, so extend it deliberately for real sequence resources. Original server uses Cache-Control:no-store; production static caching configuration is separate.

Current source fonts include Montserrat, Manrope, Onest WOFF2 subsets with bundled OFL text. Prefer supplied Onest for modern sans and Cyrillic; verify fonts actually load before screenshot judgement. Existing image slides have full-size and 960 variants; most are 1920×1200. They are inherited illustrative architecture, not verified sale listings or independently cleared photos.

## New source of truth

The additional user task contains 21 price rows in EUR for nine named regions and apartment/villa minima. No separate original spreadsheet or screenshot was found. Use the provided numeric control values without internet replacement. Preserve villa notes: Barcelona suburb, Valencia suburb, Benidorm/Finestrat. Prices are indicative thresholds only, not upper market limits or available inventory. Both types must remain distinct; under-threshold budgets must remain submittable. Preserve original useful purpose/timeline questions and unsupported type paths (penthouse/townhouse/commercial) honestly with no fabricated price data.

Supplied `../videoesp.mp4`: 1280×720, H264, 24fps, 240 frames / 10.000 seconds video, 5,862,259 bytes including AAC. SHA256 `5a539d5d6038d41dd7c7f97fa244a0c882d26509d831e44bb8d6296685fe18ec`. Source is 720p, not 4K. Metadata says ISO Media produced by Google; that does not prove a real property/location. Use as supplied illustrative architecture, preserve geometry, and avoid exact listing claims. User authorizes local processing; no public reuse licence is inferred.

## Evidence and next checks

`docs/brand/facts.json` records fact decisions and unresolved claims. `docs/brand/asset-manifest.json` hashes 47 original/provided assets, source paths, dimensions where applicable, bundled font licences and rights limitations. Existing SVG assets were scanned for script/foreignObject/event handlers/external URLs. This audit made no network submissions and no app code changes.

Before final readiness: production build; existing backend/security tests; new price algorithm tests; confirmed local test persistence; payload/email/Sheets inclusion; actual browser desktop/phone/reduced-motion; sequence forward/reverse/failure/resource checks; live preference changes; keyboard and focus. Resend/D1/Sheets/Ads production delivery remains not run and cannot be inferred from local tests.

## Skills read for this audit

- `.agents/skills/brand-research/SKILL.md`, `creative-art-direction/SKILL.md`, `premium-motion-director/references/routing.md` and workspace research/art procedures.
- `/Users/phewcy/.codex/skills/awwwards/SKILL.md` and references concepts, art-direction, typography, layout, content.
- `/Users/phewcy/.agents/skills/design-taste-frontend/SKILL.md` and references copy, type, colour, layout, critique, relevant imagery/motion guidance.

Applied decisions: source-grounded identity; explicit uncertain claims; real asset inventory rather than invented property pictures; preserve actual stack; authored Cyrillic type/phone crop; quiz as meaningful interactive property selection, not decorative cards. User preferences and brand truth outrank generic skill style catalogues.

# Spain Property for Sale · Architectural Cinema

Local rebuild, isolated in `spain-estate/`. Original source is retained in Git branch `recovery/original-2026-11-16` at `97b8a62`. Nothing has been pushed or deployed.

## Run

Requires Node 22 or later.

```sh
npm ci
npm run build
npm run preview
```

Production preview: **http://127.0.0.1:4322**. Source editing: `npm run dev` on port 4321. To isolate local test leads:

```sh
LEAD_STORAGE_DIR=/private/tmp/spain-estate-preview-leads npm run preview
```

This is localhost, not a remotely accessible sharing link.

## Implementation

The actual stack is preserved: HTML/CSS/ES modules, Node API and Cloudflare Worker/D1. GSAP 3.15.1 and ScrollTrigger are local vendor files. No second scroller or real-time 3D renderer is added.

The supplied `../videoesp.mp4` becomes 240 desktop AVIF frames (1280 × 720) and 120 phone frames (480 × 720 portrait crop). Scroll position drives exact frame indices in both directions. A bounded decoded cache, request cancellation, poster fallback and live reduced-motion support manage the media. The source contains shot cuts and is labelled as an architectural illustration.

The integrated quiz supports nine regions, 21 cities, multiple selections, apartment/villa eligibility kept separate, adaptive ranges, low custom budgets, geographic notes and alternatives. Server-side recomputation preserves trusted pricing. Original purpose, visit and contact questions remain. Encrypted local storage, Cloudflare/D1, email and the existing 18-column Sheets integration remain supported; UTM details are added. No credentials are shipped to the browser.

Prices are maintained in `showcase/assets/property-prices.mjs`, using the user's 21-row table. They are minimum reference thresholds, not live listing availability. No separate original spreadsheet was supplied.

## Checks and evidence

```sh
npm test
npm run check
npm run verify:sequence
```

Browser QA scripts use the existing Playwright installation in adjacent `tools/motion/` and installed Chrome. Recording uses `PLAYWRIGHT_BROWSERS_PATH` pointing to the workspace `.browsers/`. On another machine install Playwright and update the QA import path. The visitor runtime has no dependency on these workspace tools.

See `docs/production/RUN_LOG.md`, `docs/qa/FINAL_REPORT.md` and local captures/recordings under `docs/qa/`. Evidence binaries are deliberately kept outside Git tracking.

Reproduce the media export with local FFmpeg/libsvtav1 into a new directory:

```sh
python3 scripts/encode-sequence.py ../videoesp.mp4 --out /new/output/folder
```

Physical iOS/Android, screen-reader review, total GPU/process memory and real production delivery remain untested. Confirm public media rights and listing identity before publication. Cloudflare, DNS, hosting and production integrations were not changed remotely.

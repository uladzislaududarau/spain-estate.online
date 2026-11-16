# Spain Property for Sale rebuild — 2026-11-16

Scope: user-authorized local rebuild in `spain-estate/`; Cleopatra untouched. No push/deploy/DNS/outreach. Original Git recovery branch: `recovery/original-2026-11-16`, source `97b8a62a72de3b4477bd085a41f3e54ad664d11a`. Working branch `rebuild/cinematic-estate`.

Loaded instruction paths: workspace `AGENTS.md`, `docs/production/EXECUTION_CONTRACT.md`, `.agents/skills/premium-motion-director/SKILL.md` first, then local brand-research, creative-art-direction, mobile-motion, cinematic-motion, cinematic-scroll (catalog/editorial/stack/bake), scroll-scrubbed-visual-sequence, premium-frontend, visual-qa, playwright-cli, scroll-audit, gsap-core/react/timeline/scrolltrigger/performance/plugins. Read frame engineering, asset pipeline and QA contract. Restaurant-specific claims/stack/proposal do not apply to this new real estate brief. Actual source stack preserved: HTML/CSS/ES modules + Node/Cloudflare.

Design skill paths: `/Users/phewcy/.codex/skills/awwwards/SKILL.md`; `/Users/phewcy/.agents/skills/design-taste-frontend/SKILL.md`; Sites skill local-only route. Research agent reads art/type/layout/copy references and writes source/facts/asset audit. Awwwards explicitly requests independent agent review; delegated pricing algorithm and backend audit/compatibility to bounded agents.

Source video: workspace videoesp.mp4, user-supplied for local use; 1280×720,24fps,240 source frames,10s. Architectural illustration; not represented as an identified listing or documentary footage. Public reuse rights not independently verified.

Checkpoints: research in progress; art/storyboard in progress; prototype pending; full implementation pending; browser/motion verification pending. No ready/performance/accessibility claim yet.

Prototype observed in Chrome (1440×900 and390×844) at http://127.0.0.1:4321. Captures docs/qa/prototype-{desktop,phone}.png. Console no errors. Discovered horizontal overflow in region navigation at phone; addressed grid automatic minimum width before full verification. Static type/CTA/crop review in progress. Sequence export:240 AVIF desktop 11,314,384bytes +120 AVIF mobile2,253,700bytes. Engine starts source frame48 (exterior) and wraps through interior ending; editorial order recorded rather than claiming a single continuous physical camera shot. Every source frame retained once per desktop traversal.

Final verification 2026-11-16 (Chrome157.0.8103.51, production4322):
- Build/pass; syntax/pass;92/92 Node unit/integration tests pass (local/mocked integrations; no external send).
- AVIF integrity: all360 containers+hashes verified; all360 decoded in Chrome with dimensions checked. Desktop2401280×72011,314,384B; phone120480×7202,121,842B. Phone portrait re-export replaced blurry landscape tier. No upscale.
- Motion/pass:1440×900,768×1024,390×844,375×812,320×640,DPR2,normal/live reduced,orientation,5positions each direction,real wheel/touch,frame failures,noJS fallback. Report docs/qa/motion/results.json,trace/video/captures same folder. Exact reverse frame IDs; subunit Canvas readback differences atfirst frame documented (mean≤1 channel unit,>8delta on<0.1%channels); other checkpoints exact in tested browser. Source runtime unchanged by test UA.
- Draw submission p95≈0.1ms and lab rAF cadence p95≈16.8ms, no>50ms samples during recorded desktop-emulated traversals. These do not establish physical phone FPS/GPU memory. Resident cache caps and backing bytes asserted; process/GPU memory not measured.
- Quiz/pass:8/8 scenario groups;1440,390,320,landscape640×320; payload/validation/lowbudget/alltypes/back/reset/contacts/keyboard and Escape; all4submit requests mocked,expected500/429/network/success; zero realPOST. Final report source hash and captures in docs/qa/quiz-results.json and QUIZ_REVIEW.md. Actual localAPI persistence/Cloudflare store covered by Node tests.
- Axe/pass after correcting focusability of scrollable city list:0violations at1440/390/320,landing/quiz-regions/reduced. Scope and incomplete photo-contrast observations in accessibility-performance.json.
- Three cold mobile lab loads: CPU4,1.6Mbps down/.75Mbps up,150mslatency,DPR2. LCP788/772/772ms,CLS.000833,initial resources612595B; local lab only,not field metrics.
- Taste inspector ran twice. Real defects fixed:small utility type,3-line phone headings,phone cookie horizontal transform. Remaining vendor flags are not readiness claims:neutralphoto scrims,Canvas counted as few pictures/no video,arbitrary element motion count explicitly superseded by workspace instructions;utility-heavy page body-size heuristic and temporarycookie covering lowertext documented. No assertion of zero vendor FAILs. Every representative rendered state reviewed independently, not inferred from passcount.

Not run: physical iOS/Android,real email/Sheets/Ads delivery,screenreader audit,fullprocess/GPU memory profile. Publicmedia rights/location require confirmation before publication. No deploy,remote push,DNS,production traffic submission. Commercial €500restaurant offer does not apply to this unrelated real-estate task.

Refinement after independent critique: shared original logo now used in quiz; desktop scene shortened from350to300svh and phone270to250svh; regional heading made literal; request follow-up explained without response-time guarantees; verified inherited email route added; no-JS immediate email action added. Source dimensions/frame counts unchanged. Affected motion/quiz checks rerun; final captures refreshed. No invented business proof added to fill evidence gaps.


## Continuation after AntiGravity changes

Source baseline: `7f949d9` (blue/navy palette, fixed whole-page Canvas background, semantic scrolling overlays, AVIF sharpening/re-encode). Preserved in `recovery/antigravity-7f949d9`. Root Cleopatra changes belong to the parallel restaurant project and were not edited. Root AGENTS and the new project tree were rediscovered before changes.

Observed regression: at 390 × 844, live reduced motion moved the background into normal flow, leaving a full empty poster viewport before the identity/action (h1 y≈1219). Corrected only fallback geometry: a static decorative fixed background no longer consumes content flow space. Added an actual first-screen heading assertion to motion QA. AntiGravity palette, panels, content structure, new encodes and pixel alignment are retained.

Current asset integrity: 240 desktop AVIFs = 10,343,403 bytes; 120 portrait AVIFs = 1,890,700 bytes. Total 12,234,103 bytes. Current cache caps are 32/16 MiB, four concurrent requests; backing caps remain 2/1.2 MP. No claim that resident cache equals total memory.

Build, syntax, integrity and 92/92 automated tests passed after the correction. Browser verification is being refreshed against the current production preview, not inherited from the previous teal/sticky layout. Previous lab metrics and reviews above are historical evidence about that prior source.

Current browser results: motion passed five viewports with distinct forward states, exact reverse frame IDs, mask reversibility, native input, live reduced motion with first-screen identity, resize, no-JS and failed-media fallback. No uncaught/page resource errors. Quiz passed all eight scenario groups on production4322 with no real POSTs. Focused final axe passed six landing/quiz combinations with zero violations. Current captures were inspected (blue/navy background/panels, same identity in quiz, phone search and static reduced hero). This continuation's visual review is self-review; the second independent critic had a usage-limit failure and produced no completed report. No independent result is invented.

Recorded desktop cadence p95 was33.3ms with trace/video enabled; smaller widths sampled≈16.8ms. This does not establish physical-device FPS. A separate unrecorded sample and refreshed cold-load measurements are retained in docs/qa. No blanket60fps claim. Final raw reports supersede older numbers in this historical log.

Current cold-load lab results: LCP824/828/836ms,CLS0.000846,initial transfer629,999B on documentedCPU4/1.6Mbps/150msprofile. Full axe:zero violations in nine sampled combinations after the fallback correction.

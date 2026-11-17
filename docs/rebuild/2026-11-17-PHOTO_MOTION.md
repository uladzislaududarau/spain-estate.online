# Photo compositions and reversible typography

User request: replace the blue-only impression in benefits, viewing and request sections with photographs; use existing AVIF cuts and make text respond continuously to scroll. Scope: local preview, preserve approved hero, working region/quiz and AntiGravity's fixed backdrop. Source baseline: be41ecf.

## Art direction

Visitor task: see the architecture, understand the services, select a region and request a relevant shortlist. Keep the established Onest/Manrope type and navy for readable copy and controls. Compare (A) full-photo backgrounds under every paragraph with (B) distinct photographic compositions and stable reading areas. Choose B: one photo-led benefits spread, a full-width terrace, then an interior alongside the final request. Avoid competing photos behind long service descriptions.

Use supplied videoesp derivatives only: desktop frame49 exterior, frame145 terrace, frame1 living room; phone frame25,73,1 from the existing 480×720 crop. Dimensions and hashes are recorded in the asset ledger. These are architectural visuals, not identified available listings. No new public rights or business claims. No new encodes, external image service or dependency.

Tablet uses landscape source to avoid enlarging a480pxportrait across its wide single-column photo. Desktop: benefits photo left/copy right plus four service definitions below; terrace full-width with readable lower scrim; request copy left/interior right. Phone (below600px): authored portrait crop above benefits/request copy, four definitions in normal flow; terrace retains a roomy static frame with text outside the image's mask. Keep all buttons reachable and unanimated hit areas. First implement benefits and inspect 1440/390 before extending the remaining scenes.

## Motion ledger

Native scroll, existing GSAP/ScrollTrigger only. No new pins, autoplay or inertial scroller. Each text/media element owns a short geometry-derived interval; long sections do not delay later paragraphs. All transitions retrace exactly on reverse and stop at unchanged scroll position.

| Element | Bounds | 0% | 25% | 50% | 75% | 100% |
| --- | --- | --- | --- | --- | --- | --- |
| Authored heading lines in each main section | heading top at94% viewport → heading bottom at12% | line below its crop, slight angle | opens/straightens | readable hold | readable hold | small upward/left departure as it passes header |
| Paragraph/service/list groups | own top94% → bottom12%, clamped at page ends | small downward offset, partial emphasis | settles | fully readable | fully readable | restrained upward offset; stays readable |
| Benefits and request photo | media top bottom → media bottom top | inset crop and closer framing | frame opens | full image with depth drift | continues reframing | full crop, settled scale |
| Terrace | preserve existing top bottom → top top mask interval | inset view | opening | opening | nearly full | full view; image reframes with scroll |
| Approved hero | retain existing bounded entrance and scroll departure | existing | existing | existing | existing | existing |

Media crop and inner image transform have separate owners. Semantic headings use their existing two authored phrases, not measured glyph splitting or duplicate screen-reader text. Body copy remains selectable, no text scrambling. Controls and table contents stay stable. Reduced motion (including live changes) and no-JS show all content and complete photos in normal flow, with no mask/parallax transforms. Missing media keeps the neutral reading background and complete actions. MatchMedia cleanup reverts all new tweens/triggers; existing main ResizeObserver updates dynamic region bounds.

Budget: three responsive lazy pictures, at most one selected AVIF each, existing decode/cache/backing limits unchanged. No extra Canvas or frame preload. Profile mask painting and real wheel/touch with video; do not infer phone hardware FPS from Chrome.

## Acceptance

Capture normal 1440,768,390,375,320 and landscape, quarter-progress and reverse headings/photos, real wheel/touch playback, stable idle, quiz opening/focus, no overflow, image decode, anchor offset, no-JS, blocked image and initial/live reduced motion. Check live toggles do not accumulate triggers and restore static text. Inspect crops, text clipping and variable photo contrast. Record self-review and any unrun physical-device checks explicitly.

## Observed result

Benefits prototype1440/390 was inspected before extending the terrace/request. Final six-width content checks prove actual distinct heading/photo states, exact reverse CSS, static idle, full reduced state, decoded responsive images and no overflow/errors. All36 sampled section/viewport axe checks passed. Existing92 Node tests,8 quiz groups and five-width global motion suite passed. A first-entry stagger discrepancy and stale bounds after a live preference change within the quiz were reproduced and corrected. Native dialog-close refresh is now scoped to the motion lifecycle. Actual wheel/reverse/touch videos and sampled playback sheets were reviewed. Final source/QA identity is retained in `docs/qa/photo-motion/build-identity.json`; self-review/retained aesthetic-check dispositions in `docs/qa/PHOTO_MOTION_REVIEW.md`.

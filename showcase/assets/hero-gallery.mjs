// Hero background gallery. The preloaded poster remains the first (LCP) frame;
// each further photo is fetched only shortly before its turn, decoded off the
// main thread, then crossfades in over the fully opaque previous frame (no dip
// to dark). Rotation waits under reduced motion, Save-Data, a hidden tab or an
// open dialog. At most three photo layers stay in the DOM.
const SLIDES = [
  'marbella-travertine-villa',
  'marbella-sea-terrace',
  'marbella-infinity-villa',
  'marbella-garden-terraces',
  'fuengirola-sea-penthouse'
];
const HOLD_MS = 6500; // fully visible time per photo
const FADE_MS = 2600; // must match the CSS opacity transition

const root = document.documentElement;
const cinema = document.querySelector('#cinema');
const stage = cinema?.querySelector('.cinema-stage');
const poster = stage?.querySelector('.cinema-poster');
const scrim = stage?.querySelector('.cinema-scrim');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

if (stage && poster && scrim && navigator.connection?.saveData !== true && !location.pathname.startsWith('/thank-you')) {
  const queue = [...SLIDES];
  // Slot 0 is the poster; slot n is queue[n - 1].
  const layers = new Map([[0, poster]]);
  let current = 0;
  let timer = 0;
  let started = false;
  poster.classList.add('hero-layer', 'is-front');

  const slotCount = () => queue.length + 1;
  const paused = () => document.hidden || reduced.matches || root.matches('.quiz-open,.guide-open');
  function make(slot) {
    const name = queue[slot - 1];
    const picture = document.createElement('picture');
    const source = document.createElement('source');
    source.media = '(max-width:799px)';
    source.type = 'image/avif';
    source.srcset = `/assets/hero-gallery/${name}-mobile.avif`;
    const img = document.createElement('img');
    img.className = 'hero-layer hero-slide';
    img.alt = '';
    img.decoding = 'async';
    img.fetchPriority = 'low';
    img.src = `/assets/hero-gallery/${name}-desktop.avif`;
    picture.append(source, img);
    stage.insertBefore(picture, scrim);
    layers.set(slot, img);
    return img;
  }
  function drop(slot) {
    const img = layers.get(slot);
    if (!img || slot === 0) return;
    img.parentElement?.remove();
    layers.delete(slot);
  }
  function schedule(delay = HOLD_MS) {
    clearTimeout(timer);
    timer = setTimeout(advance, delay);
  }
  async function advance() {
    if (paused()) return schedule(1200);
    const slot = (current + 1) % slotCount();
    const next = layers.get(slot) || make(slot);
    try { await next.decode(); }
    catch {
      // A photo that fails to load leaves the rotation; the poster always remains.
      drop(slot);
      queue.splice(slot - 1, 1);
      for (const [key, img] of [...layers]) if (key > slot) { layers.delete(key); layers.set(key - 1, img); }
      if (queue.length) schedule(200);
      return;
    }
    if (paused()) return schedule(1200);
    getComputedStyle(next).opacity; // commit the hidden state so the fade always runs
    const previous = layers.get(current);
    for (const img of layers.values()) if (img !== previous && img !== next) img.classList.remove('is-back', 'is-front');
    previous?.classList.replace('is-front', 'is-back');
    next.classList.remove('is-back');
    next.classList.add('is-front');
    cinema.dataset.heroSlide = String(slot);
    current = slot;
    // Keep previous, current and the following photo; prefetch the following one.
    const following = (slot + 1) % slotCount();
    const prior = (slot - 1 + slotCount()) % slotCount();
    for (const key of [...layers.keys()]) if (![0, slot, following, prior].includes(key)) drop(key);
    if (following !== 0 && !layers.has(following)) setTimeout(() => { if (!layers.has(following)) make(following); }, FADE_MS);
    schedule(HOLD_MS + FADE_MS);
  }
  function start() {
    if (started) return;
    started = true;
    const begin = () => { make(1); schedule(HOLD_MS); };
    if (document.readyState === 'complete') begin();
    else addEventListener('load', begin, { once: true });
  }
  // The preloader removes itself synchronously on repeat visits, before this module runs.
  if (document.getElementById('site-preloader')) {
    addEventListener('sp:preloader-done', start, { once: true });
    setTimeout(start, 4000);
  } else start();
  addEventListener('pagehide', () => clearTimeout(timer), { once: true });
}

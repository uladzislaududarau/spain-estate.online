// Only first-screen assets participate. A failed image settles just like a loaded one.
export async function initPreloader() {
  const overlay = document.getElementById('site-preloader');
  if (!overlay) return;

  // Show only once per browser tab.
  const SEEN_KEY = 'sp:preloader-seen';
  if (sessionStorage.getItem(SEEN_KEY)) {
    overlay.remove();
    document.documentElement.classList.remove('boot-pending');
    window.dispatchEvent(new Event('sp:preloader-done'));
    return;
  }
  sessionStorage.setItem(SEEN_KEY, '1');

  const root = document.documentElement;
  const previousRestoration = history.scrollRestoration;
  const navigation = performance.getEntriesByType('navigation')[0];
  const openAtTop = location.pathname === '/' && !location.hash && navigation?.type !== 'back_forward';
  const preventScroll = event => event.preventDefault();
  overlay.addEventListener('wheel', preventScroll, { passive: false });
  overlay.addEventListener('touchmove', preventScroll, { passive: false });
  if (openAtTop) {
    history.scrollRestoration = 'manual';
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  const poster = document.querySelector('.cinema-poster');
  const video = document.querySelector('.cinema-video');
  const mediaEvents = new AbortController();
  const backdrop = [poster?.decode()];
  if (video) backdrop.push(new Promise(resolve => {
    if (video.readyState >= 2) resolve();
    else video.addEventListener('loadeddata', resolve, { once: true, signal: mediaEvents.signal });
  }));
  const orbit = overlay.querySelector('.loader-orbit')?.getAnimations()[0];
  const remaining = Math.max(0, 1800 - (orbit?.currentTime ?? 0));

  // Hard 3-second safety timeout — page is always unlocked within 3s.
  const hardTimeout = new Promise(resolve => setTimeout(resolve, 3000));

  await Promise.race([
    hardTimeout,
    Promise.allSettled([
      new Promise(resolve => setTimeout(resolve, remaining)),
      Promise.race(backdrop),
      document.querySelector('.header .brand-svg-logo')?.decode(),
      window.__heroTypeReady ?? document.fonts.ready
    ])
  ]);
  mediaEvents.abort();

  overlay.classList.add('is-revealing');
  root.classList.remove('boot-pending');
  const nextPaint = () => new Promise(resolve => requestAnimationFrame(resolve));
  await nextPaint();
  window.ScrollTrigger?.refresh();
  await nextPaint();
  if (openAtTop) {
    window.scrollTo({ top: 0, behavior: 'instant' });
    history.scrollRestoration = previousRestoration;
  }
  overlay.classList.add('is-exiting');
  // Wait only for the CSS opacity transition (~460ms), not infinite child animations.
  await new Promise(resolve => setTimeout(resolve, 500));
  overlay.remove();
  window.dispatchEvent(new Event('sp:preloader-done'));
}
initPreloader();

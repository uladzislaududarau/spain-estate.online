// Only first-screen assets participate. A failed image settles just like a loaded one.
export async function initPreloader() {
  const overlay = document.getElementById('site-preloader');
  if (!overlay) return;
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
  // Either decoded image can already supply the Hero's background.
  const backdrop = [poster?.decode()];
  if (video) backdrop.push(new Promise(resolve => {
    if (video.readyState >= 2) resolve();
    else video.addEventListener('loadeddata', resolve, { once: true, signal: mediaEvents.signal });
  }));
  const orbit = overlay.querySelector('.loader-orbit').getAnimations()[0];
  const remaining = Math.max(0, 1800 - (orbit?.currentTime ?? 0));
  await Promise.allSettled([
    new Promise(resolve => setTimeout(resolve, remaining)),
    Promise.race(backdrop),
    document.querySelector('.header .brand-svg-logo')?.decode(),
    window.__heroTypeReady ?? document.fonts.ready
  ]);
  mediaEvents.abort();

  // Refresh behind the opaque layer to preserve the first scroll position.
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
  // Includes a running opacity transition only; the child's loop never blocks removal.
  await Promise.allSettled(overlay.getAnimations().map(animation => animation.finished));
  overlay.remove();
  window.dispatchEvent(new Event('sp:preloader-done'));
}
initPreloader();

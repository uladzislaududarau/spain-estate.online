// Панели браузера и клавиатура не должны менять кадрирование уже открытого слайдера.
export function stabilizeHeroHeight(surface, win) {
  let width = -1;
  let frame;
  function update() {
    const nextWidth = Math.round(win.document.documentElement.clientWidth);
    if (nextWidth === width) return;
    width = nextWidth;
    surface.style.removeProperty('--mobile-hero-height');
    if (width > 560) return;
    const height = Math.round(surface.getBoundingClientRect().height);
    if (height > 0) surface.style.setProperty('--mobile-hero-height', height + 'px');
  }
  function schedule() {
    win.cancelAnimationFrame(frame);
    frame = win.requestAnimationFrame(update);
  }
  update();
  win.addEventListener('resize', schedule, { passive: true });
  return () => {
    win.cancelAnimationFrame(frame);
    win.removeEventListener('resize', schedule);
    surface.style.removeProperty('--mobile-hero-height');
  };
}

if (typeof document !== 'undefined') {
  const hero = document.querySelector('.arch-wrapper');
  if (hero) stabilizeHeroHeight(hero, window);
}

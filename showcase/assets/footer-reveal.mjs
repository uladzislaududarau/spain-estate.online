// The first view is the full-height Hero. The existing footer stays in the DOM
// and rises from the bottom edge on request; the Hero moves up by the same
// distance, as if the page had scrolled. Without JavaScript the footer simply
// remains in normal document flow.
const root = document.documentElement;
const footer = document.querySelector('#site-footer');
const toggle = document.querySelector('.footer-toggle');
const label = toggle?.querySelector('.footer-toggle-label');

if (footer && toggle && label) {
  const measure = () => root.style.setProperty('--footer-reveal', `${Math.ceil(footer.getBoundingClientRect().height)}px`);
  const isOpen = () => root.classList.contains('footer-open');
  function setOpen(open) {
    if (open) measure();
    root.classList.toggle('footer-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    label.textContent = open ? 'Свернуть' : 'Подробнее';
    toggle.title = label.textContent;
    footer.inert = !open;
    if (!open && footer.contains(document.activeElement)) toggle.focus({ preventScroll: true });
  }
  // Collapse without animating: the footer must not slide away on page load.
  root.classList.add('footer-collapsible', 'footer-settling');
  footer.inert = true;
  measure();
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('footer-settling')));
  toggle.addEventListener('click', () => setOpen(!isOpen()));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && isOpen() && !document.querySelector('dialog[open]')) setOpen(false);
  });
  toggle.title = label.textContent;
  const resize = new ResizeObserver(measure);
  resize.observe(footer);

  // While the cookie notice covers the lower right corner, the arrow sits just above it.
  let panel = null;
  const lift = () => {
    let value = 0;
    if (panel?.isConnected && !panel.hidden) {
      const notice = panel.getBoundingClientRect();
      const arrow = toggle.getBoundingClientRect();
      if (notice.height && notice.left < arrow.right && notice.right > arrow.left) value = Math.max(0, Math.ceil(innerHeight - notice.top - 4));
    }
    root.style.setProperty('--toggle-lift', `${value}px`);
  };
  const noticeAttributes = new MutationObserver(lift);
  const liftSize = new ResizeObserver(lift);
  const watch = found => {
    panel = found;
    noticeAttributes.observe(panel, { attributes: true, attributeFilter: ['hidden'] });
    liftSize.observe(panel);
    panel.addEventListener('animationend', lift);
    lift();
  };
  const existing = document.querySelector('.cookie-panel');
  const arrivals = new MutationObserver(() => {
    const found = document.querySelector('.cookie-panel');
    if (found) { arrivals.disconnect(); watch(found); }
  });
  if (existing) watch(existing);
  else arrivals.observe(document.body, { childList: true });
  liftSize.observe(toggle);
  addEventListener('resize', lift, { passive: true });
  addEventListener('pagehide', () => { resize.disconnect(); liftSize.disconnect(); noticeAttributes.disconnect(); arrivals.disconnect(); }, { once: true });
}

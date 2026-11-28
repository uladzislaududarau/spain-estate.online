import { mountLead } from '/shared/lead.js';
import '/persiana/consent.js';

const data = JSON.parse(document.getElementById('site-data').textContent);
const props = new Map(data.properties.map(p => [p.slug, p]));
const bands = [...document.querySelectorAll('.band')];
const box = document.querySelector('.box');
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const fmt = n => '€' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const pad = n => String(n).padStart(2, '0');
let active = data.active;
let lastPrice = props.get(active)?.price || 0;

const bandOf = slug => bands.find(b => b.dataset.slug === slug);

// Живая цена: при смене объекта сумма докручивается до новой.
function rollPrice(el, from, to) {
  if (reduce.matches || !from || from === to) { el.textContent = fmt(to); return; }
  const start = performance.now(), dur = 900;
  const tick = now => {
    const t = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - t, 4);
    el.textContent = fmt(from + (to - from) * e);
    if (t < 1) requestAnimationFrame(tick); else el.textContent = fmt(to);
  };
  requestAnimationFrame(tick);
}

function activate(slug, { push = true, focus = true } = {}) {
  if (slug === active) return;
  const next = bandOf(slug);
  if (!next) return;
  bands.forEach(b => {
    const on = b === next;
    b.toggleAttribute('data-active', on);
    const hit = b.querySelector('.band-hit');
    if (on) { hit.setAttribute('tabindex', '-1'); hit.setAttribute('aria-hidden', 'true'); }
    else { hit.removeAttribute('tabindex'); hit.removeAttribute('aria-hidden'); }
  });
  const p = props.get(slug);
  if (p) {
    const num = next.querySelector('.op-num');
    rollPrice(num, lastPrice, p.price);
    lastPrice = p.price;
  }
  document.querySelectorAll('[data-detail]').forEach(d => { d.hidden = d.dataset.detail !== slug; });
  document.querySelector('.dock-name').textContent = p ? p.name : 'Все объекты';
  document.querySelector('.dock-price').textContent = p ? p.priceLabel : '';
  document.querySelector('.mbar-name').textContent = p ? p.name : 'Все объекты';
  document.querySelector('.mbar-price').textContent = p ? p.priceLabel : 'топовые предложения';
  document.querySelector('.mbar-btn').textContent = p ? 'Презентация' : 'Получить доступ';
  document.title = p ? p.title : 'Все объекты | Spain Property for Sale';
  active = slug;
  if (push) history.pushState({ slug }, '', `/${slug}`);
  if (focus) setTimeout(() => next.querySelector('.open-title')?.focus({ preventScroll: true }), 450);
  // На телефоне показываем раскрытую ламель целиком.
  if (matchMedia('(max-width: 899px)').matches && scrollY > 4) scrollTo({ top: 0, behavior: reduce.matches ? 'auto' : 'smooth' });
}

document.addEventListener('click', e => {
  const hit = e.target.closest('.band-hit, [data-go]');
  if (!hit || e.metaKey || e.ctrlKey || e.shiftKey) return;
  e.preventDefault();
  const slug = hit.dataset.go || hit.closest('.band').dataset.slug;
  if (hit.dataset.go) scrollTo({ top: 0, behavior: reduce.matches ? 'auto' : 'smooth' });
  activate(slug);
});
addEventListener('popstate', () => {
  const slug = location.pathname.slice(1) || 'nature-resort';
  activate(slug, { push: false, focus: false });
});

// Смена кадра «ламелями» жалюзи.
function showFrame(band, index) {
  const p = props.get(band.dataset.slug);
  if (!p) return;
  const media = band.querySelector('.band-media');
  const n = p.images.length;
  const i = ((index % n) + n) % n;
  const image = p.images[i];
  const base = media.querySelector('.band-img');
  media.dataset.frame = i;
  band.querySelector('.frame-count').innerHTML = `<b>${pad(i + 1)}</b>/${pad(n)}`;
  band.querySelector('.frame-text').textContent = image.caption + (image.note ? ` · ${image.note}` : '');
  const apply = () => {
    base.srcset = image.srcset; base.src = image.src; base.alt = image.alt; base.style.objectPosition = image.pos;
  };
  if (reduce.matches) return apply();
  media.querySelector('.slats')?.remove();
  const slats = document.createElement('div');
  slats.className = 'slats';
  const count = 7, h = media.clientHeight;
  for (let k = 0; k < count; k++) {
    const slat = document.createElement('div');
    slat.className = 'slat';
    slat.style.cssText = `top:${(k * 100) / count}%;height:${100 / count + .2}%;animation-delay:${k * 55}ms`;
    const im = new Image();
    im.srcset = image.srcset; im.sizes = innerWidth < 900 ? '220vw' : '72vw'; im.src = image.src; im.alt = '';
    im.style.cssText = `top:${-(k * h) / count}px;height:${h}px;object-position:${image.pos}`;
    slat.append(im);
    slats.append(slat);
  }
  const preload = new Image();
  preload.srcset = image.srcset; preload.sizes = innerWidth < 900 ? '220vw' : '72vw'; preload.src = image.src;
  (preload.decode ? preload.decode() : Promise.resolve()).catch(() => {}).then(() => {
    media.append(slats);
    setTimeout(() => { apply(); setTimeout(() => slats.remove(), 60); }, 55 * count + 640);
  });
}

bands.forEach(band => {
  band.querySelectorAll('[data-step]').forEach(btn => btn.addEventListener('click', () => {
    showFrame(band, Number(band.querySelector('.band-media').dataset.frame) + Number(btn.dataset.step));
  }));
  // Свайп по раскрытой ставне.
  let x0 = null, y0 = 0;
  band.addEventListener('touchstart', e => { if (band.hasAttribute('data-active')) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; } }, { passive: true });
  band.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4 && props.get(band.dataset.slug)?.images.length > 1) {
      showFrame(band, Number(band.querySelector('.band-media').dataset.frame) + (dx < 0 ? 1 : -1));
    }
  }, { passive: true });
});
addEventListener('keydown', e => {
  if (e.target.closest('input, textarea, select, dialog[open]') || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  const band = bandOf(active);
  if (scrollY < innerHeight * .6 && props.get(active)?.images.length > 1) showFrame(band, Number(band.querySelector('.band-media').dataset.frame) + (e.key === 'ArrowRight' ? 1 : -1));
});

// Заголовок уходит в короб: после первого экрана в шапке остаются имя, цена и кнопка.
// На телефоне вместо этого внизу появляется панель; она прячется у блока заявки и футера.
const mbar = document.querySelector('.mbar');
let pastShutters = false;
const nearEnd = new Set();
function syncDock() {
  box.classList.toggle('is-docked', pastShutters);
  const cta = box.querySelector('.dock-cta');
  cta.tabIndex = pastShutters && active !== 'catalog' ? 0 : -1;
  cta.hidden = active === 'catalog';
  const showBar = pastShutters && nearEnd.size === 0;
  mbar.classList.toggle('is-on', showBar);
  mbar.setAttribute('aria-hidden', String(!showBar));
  mbar.querySelector('button').tabIndex = showBar ? 0 : -1;
}
new IntersectionObserver(([entry]) => { pastShutters = !entry.isIntersecting; syncDock(); }, { rootMargin: '-35% 0px 0px 0px' })
  .observe(document.querySelector('.shutters'));
const endWatch = new IntersectionObserver(entries => {
  entries.forEach(e => e.isIntersecting ? nearEnd.add(e.target) : nearEnd.delete(e.target));
  syncDock();
});
document.querySelectorAll('.d-cta, .foot').forEach(el => endWatch.observe(el));

// Заявка
const dialog = document.getElementById('lead');
const form = document.getElementById('lead-form');
const done = document.getElementById('lead-done');
let ctx = { kind: 'property', slug: active };
let opener = null;
const lead = mountLead(form, {
  context: () => ctx,
  policyVersion: data.policyVersion,
  onSuccess() { location.assign('/thank-you'); },
  onLocalSuccess(r) {
    const what = r.lead_type === 'catalog_access' ? 'все топовые предложения' : `презентацию ${props.get(r.property_slug).name}`;
    document.getElementById('lead-done-text').textContent = `Вышлем вам ${what} в ${r.channelLabel}: ${r.contact}. Локальная демонстрация — заявка не ушла в CRM.`;
    form.hidden = true; done.hidden = false; done.querySelector('h3').focus();
  }
});
function openLead(trigger) {
  const kind = trigger.dataset.kind === 'all' || (trigger.hasAttribute('data-dock') && active === 'catalog') ? 'all' : 'property';
  const slug = trigger.dataset.slug || active;
  if (!done.hidden) { lead.reset(); form.hidden = false; done.hidden = true; }
  ctx = { kind, slug };
  const p = props.get(slug);
  const thumb = dialog.querySelector('.drawer-thumb');
  if (kind === 'all') {
    dialog.querySelector('#lead-kind').textContent = 'Все объекты';
    dialog.querySelector('#lead-title').textContent = 'Получить доступ ко всем объектам';
    dialog.querySelector('#lead-what').textContent = 'Вышлем вам все топовые предложения в WhatsApp или Telegram.';
    thumb.hidden = true;
  } else {
    const frame = Number(bandOf(slug).querySelector('.band-media').dataset.frame) || 0;
    dialog.querySelector('#lead-kind').textContent = `Презентация · ${p.priceLabel}`;
    dialog.querySelector('#lead-title').textContent = p.name;
    dialog.querySelector('#lead-what').textContent = `${p.presentation}.`;
    thumb.hidden = false;
    thumb.style.backgroundImage = `url(${p.images[frame].small})`;
    thumb.style.backgroundPosition = p.images[frame].pos;
  }
  opener = trigger;
  dialog.showModal();
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-lead]');
  if (t) openLead(t);
});
dialog.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => dialog.close()));
dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
dialog.addEventListener('close', () => {
  if (!done.hidden) { lead.reset(); form.hidden = false; done.hidden = true; }
  if (opener?.isConnected) opener.focus({ preventScroll: true });
});

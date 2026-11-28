// Вариант A «Persiana»: первый экран — ставни. Каждая ставня — объект, активная раскрывается на весь кадр.
import { BRAND, properties, bySlug, picture, priceLabel, money, areaLabel, esc } from '../shared/data.mjs';
import { page } from '../shared/page.mjs';
import { LEAD_FIELDS } from '../shared/lead.js';

const CSS = '/persiana/persiana.css';
const THEME = '#11120f';
const pad = n => String(n).padStart(2, '0');

// Арка из логотипа — общий мотив ставни «Все объекты».
const ARCH = `<svg class="arch" viewBox="0 0 48 50" aria-hidden="true"><path d="M4 48V23C4 11.4 12.95 2 24 2s20 9.4 20 21v25h-8V23c0-7.2-5.37-13-12-13s-12 5.8-12 13v25H4Z"/><path d="M20 29h8v19h-8z"/></svg>`;

function img(image, { cls = '', sizes, eager = false } = {}) {
  const p = picture(image.id);
  return `<img class="${cls}" src="${p.src}" srcset="${p.srcset}" sizes="${sizes}" width="${p.width}" height="${p.height}" alt="${esc(image.alt)}" style="object-position:${image.pos || '50% 50%'}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}

function band(p, active) {
  const isActive = p.slug === active;
  const H = isActive ? 'h1' : 'h2';
  const first = p.images[0];
  const tall = p.images.find(i => i.tall);
  return `<article class="band" data-slug="${p.slug}" style="--i:${p.index}"${isActive ? ' data-active' : ''}>
  <a class="band-hit" href="/${p.slug}" ${isActive ? 'tabindex="-1" aria-hidden="true"' : ''}><span class="sr">${esc(p.name)}, ${esc(priceLabel(p))}</span></a>
  <div class="band-media" data-frame="0">
    ${img(first, { cls: 'band-img', sizes: '(min-width: 900px) 72vw, 220vw', eager: true })}
    ${tall ? img(tall, { cls: 'band-tall', sizes: '(min-width: 900px) 10vw, 100vw' }) : ''}
  </div>
  <div class="band-spine" aria-hidden="true">
    <span class="spine-no">${pad(p.index)}</span>
    <span class="spine-name">${esc(p.name)}</span>
    <span class="spine-price">${esc(priceLabel(p))}</span>
  </div>
  <div class="band-open">
    <p class="open-meta">${esc(p.type)} · ${esc(p.city)}</p>
    <${H} class="open-title" tabindex="-1">${esc(p.name)}</${H}>
    <p class="open-price"><span class="op-from">${p.from ? 'от' : ''}</span><span class="op-num" data-price="${p.price}">${money(p.price)}</span>${p.qualifier ? `<span class="op-q">${esc(p.qualifier)}</span>` : ''}</p>
    <ul class="open-specs">
      <li><b>${p.beds}</b> спальни</li>
      <li><b>${areaLabel(p)}</b></li>
      <li><b>${p.sea}</b> ${p.seaNote ? esc(p.seaNote) : 'до моря'}</li>
      <li>${p.handover === 'Готова' ? '<b>Готова</b> к заселению' : `сдача <b>${p.handoverShort}</b>`}</li>
    </ul>
    ${p.note ? `<p class="open-note">${esc(p.note)}</p>` : ''}
    <div class="open-actions">
      <button type="button" class="btn-bone" data-lead data-slug="${p.slug}">Получить презентацию</button>
      <a class="open-more" href="#d-${p.slug}">Подробнее</a>
    </div>
  </div>
  <div class="band-frames" ${p.images.length < 2 ? 'hidden' : ''}>
    <p class="frame-cap"><span class="frame-viz">Визуализация</span> <span class="frame-text">${esc(first.caption)}${first.note ? ` · ${esc(first.note)}` : ''}</span></p>
    <div class="frame-nav">
      <button type="button" class="frame-btn" data-step="-1" aria-label="Предыдущее изображение">←</button>
      <span class="frame-count"><b>01</b>/${pad(p.images.length)}</span>
      <button type="button" class="frame-btn" data-step="1" aria-label="Следующее изображение">→</button>
    </div>
  </div>
</article>`;
}

function allBand(active) {
  const isActive = active === 'catalog';
  return `<article class="band band-all" data-slug="catalog" style="--i:6"${isActive ? ' data-active' : ''}>
  <a class="band-hit" href="/catalog" ${isActive ? 'tabindex="-1" aria-hidden="true"' : ''}><span class="sr">Все объекты</span></a>
  <div class="band-media">${ARCH}</div>
  <div class="band-spine" aria-hidden="true"><span class="spine-no">+</span><span class="spine-name">Все объекты</span><span class="spine-price"></span></div>
  <div class="band-open">
    <${isActive ? 'h1' : 'h2'} class="open-title" tabindex="-1">Все объекты</${isActive ? 'h1' : 'h2'}>
    <p class="all-text">Вышлем вам все топовые предложения в WhatsApp или Telegram.</p>
    <div class="open-actions"><button type="button" class="btn-bone" data-lead data-kind="all">Получить доступ ко всем объектам</button></div>
  </div>
</article>`;
}

function detail(p, active) {
  const specs = [
    [p.beds, 'спальни'],
    [`${p.areaFrom ? 'от ' : ''}${p.area}`, `м²${p.areaNote ? ` · ${p.areaNote}` : ''}`],
    [p.sea.replace(/\s?(км|м)$/, ''), `${p.sea.endsWith('км') ? 'км' : 'м'} ${p.seaNote || 'до моря'}`],
    [p.handover === 'Готова' ? 'Готова' : p.handoverShort, p.handover === 'Готова' ? 'к заселению' : 'сдача']
  ];
  return `<section class="detail" id="d-${p.slug}" data-detail="${p.slug}" aria-label="${esc(p.name)} — подробно" ${p.slug === active ? '' : 'hidden'}>
  <div class="d-head">
    <p class="d-no">${pad(p.index)} / 05</p>
    <p class="d-summary">${esc(p.summary)}</p>
  </div>
  <dl class="d-specs">${specs.map(([v, l]) => `<div${String(v).length > 7 ? ' class="is-long"' : ''}><dt>${esc(l)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
  <div class="d-strip" tabindex="0" aria-label="Все изображения ${esc(p.name)}">
    ${p.images.map(i => `<figure class="${i.tall ? 'is-tall' : ''}">${img(i, { sizes: '(min-width: 900px) 60vw, 88vw' })}<figcaption><span>Визуализация</span> ${esc(i.caption)}${i.note ? ` · <strong>${esc(i.note)}</strong>` : ''}</figcaption></figure>`).join('')}
  </div>
  <div class="d-cols">
    <ul class="d-high">${p.highlights.map(h => `<li>${esc(h)}</li>`).join('')}</ul>
    <dl class="d-facts">${p.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}${p.baths ? `<div><dt>Ванные</dt><dd>${p.baths}</dd></div>` : ''}</dl>
  </div>
  <div class="d-cta">
    <div><p class="d-cta-name">${esc(p.name)}</p><p class="d-cta-price">${esc(priceLabel(p))}${p.qualifier ? ` <span>${esc(p.qualifier)}</span>` : ''}</p></div>
    <p class="d-cta-what">${esc(p.presentation)} — пришлём в WhatsApp или Telegram.</p>
    <button type="button" class="btn-ink" data-lead data-slug="${p.slug}">Получить презентацию</button>
  </div>
</section>`;
}

// Параметры сборки: домен production, версия политики для формы и юридические тексты основного сайта.
let OPT = { origin: '', policyVersion: '', legal: { privacy: '', legal: '' } };

// Футер: логотип и три ссылки на документы.
function footer() {
  return `<footer class="foot">
  <a class="foot-logo" href="/" aria-label="${BRAND}"><img src="/shared/logo-white.svg" alt="${BRAND}" width="236" height="52" loading="lazy"></a>
  <nav class="foot-links" aria-label="Документы">
    <a href="/privacy">Обработка данных</a>
    <a href="/legal">Правовая информация</a>
    <a href="/privacy#cookie" data-cookie-settings>Cookie</a>
  </nav>
</footer>`;
}

// Нижняя панель на телефоне: объект, цена и кнопка заявки.
function mbar(p) {
  return `<div class="mbar" aria-hidden="true">
  <p class="mbar-txt"><span class="mbar-name">${esc(p ? p.name : 'Все объекты')}</span><span class="mbar-price">${p ? esc(priceLabel(p)) : 'топовые предложения'}</span></p>
  <button type="button" class="mbar-btn" data-lead data-dock tabindex="-1">${p ? 'Презентация' : 'Получить доступ'}</button>
</div>`;
}

function header(extra = '') {
  return `<a class="skip" href="#main">К содержанию</a>
<header class="box">
  <a class="box-logo" href="/" aria-label="${BRAND}"><img src="/shared/logo-white.svg" alt="${BRAND}" width="236" height="52"></a>
  <nav class="box-nav" aria-label="Навигация"><a href="/catalog" class="box-all">Все объекты</a>${extra}</nav>
</header>`;
}

function legalPage(kind) {
  const title = kind === 'privacy' ? 'Политика обработки персональных данных' : 'Правовая информация';
  return page({
    title: `${title} | ${BRAND}`, description: title, path: `/${kind}`, css: CSS, js: '/persiana/consent.js', theme: THEME, origin: OPT.origin,
    body: `${header()}
<main id="main" class="legal">
  ${OPT.legal[kind]}
  <nav class="legal-actions" aria-label="Навигация по документам">
    <a class="btn-bone" href="/nature-resort">Вернуться к объектам</a>
    <a class="legal-alt" href="/${kind === 'privacy' ? 'legal' : 'privacy'}">${kind === 'privacy' ? 'Правовая информация' : 'Политика обработки данных'}</a>
  </nav>
</main>
${footer()}`
  });
}

function body(active) {
  const p = bySlug.get(active);
  return `<a class="skip" href="#main">К содержанию</a>
<header class="box">
  <a class="box-logo" href="/" aria-label="${BRAND}"><img src="/shared/logo-white.svg" alt="${BRAND}" width="236" height="52"></a>
  <div class="dock" aria-hidden="true">
    <span class="dock-name">${esc(p ? p.name : 'Все объекты')}</span>
    <span class="dock-price">${p ? esc(priceLabel(p)) : ''}</span>
  </div>
  <nav class="box-nav" aria-label="Навигация">
    <a href="/catalog" class="box-all" data-go="catalog">Все объекты</a>
    <button type="button" class="dock-cta" data-lead data-dock tabindex="-1">Презентация</button>
  </nav>
</header>
<main id="main">
  <section class="shutters" aria-label="Объекты">
    ${properties.map(x => band(x, active)).join('\n')}
    ${allBand(active)}
  </section>
  ${properties.map(x => detail(x, active)).join('\n')}
</main>
${footer()}
${mbar(p)}
<dialog class="drawer" id="lead" aria-labelledby="lead-title">
  <div class="drawer-in">
    <button type="button" class="drawer-x" data-close aria-label="Закрыть">×</button>
    <div class="drawer-thumb" aria-hidden="true"></div>
    <p class="drawer-kind" id="lead-kind">Презентация</p>
    <h2 class="drawer-title" id="lead-title">—</h2>
    <p class="drawer-what" id="lead-what"></p>
    <form class="lf" id="lead-form" novalidate>
      ${LEAD_FIELDS}
      <button type="submit" class="btn-blue">Отправить</button>
    </form>
    <div class="drawer-done" id="lead-done" hidden>
      <h3 tabindex="-1">Заявка принята</h3>
      <p id="lead-done-text"></p>
      <button type="button" class="btn-bone" data-close>Вернуться к объектам</button>
    </div>
  </div>
</dialog>`;
}

// Страница после сохранённой заявки: на ней срабатывают рекламные конверсии (Google Ads, LinkedIn) по согласию.
function thankYouPage() {
  return page({
    title: `Благодарим за ваш запрос | ${BRAND}`, description: 'Заявка принята.', path: '/thank-you', css: CSS, js: '/persiana/thank-you.js', theme: THEME, origin: OPT.origin, index: false,
    body: `${header()}
<main id="main" class="legal thanks">
  <p class="legal-meta" id="ty-kind">Заявка принята</p>
  <h1 id="ty-title">Спасибо!</h1>
  <p id="ty-text">Вышлем вам все топовые предложения в WhatsApp или Telegram.</p>
  <nav class="legal-actions" aria-label="Дальше"><a class="btn-bone" href="/" id="ty-back">Вернуться к объектам</a><a class="legal-alt" href="/catalog">Все объекты</a></nav>
</main>
${footer()}`
  });
}

export function renderPersiana(path, options = {}) {
  OPT = { ...OPT, ...options, legal: { ...OPT.legal, ...(options.legal || {}) } };
  if (path === '/privacy' || path === '/legal') return { status: 200, html: legalPage(path.slice(1)) };
  if (path === '/thank-you') return { status: 200, html: thankYouPage() };
  const slug = path === '/' ? 'nature-resort' : path.slice(1);
  if (slug !== 'catalog' && !bySlug.has(slug)) {
    return { status: 404, html: page({ title: `Страница не найдена | ${BRAND}`, description: '', path, css: CSS, js: '/persiana/consent.js', theme: THEME, origin: OPT.origin, index: false, body: `${header()}<main id="main" class="legal"><h1>Страница не найдена</h1><nav class="legal-actions"><a class="btn-bone" href="/">К объектам</a></nav></main>${footer()}` }) };
  }
  const p = bySlug.get(slug);
  const title = p ? `${p.name} — ${p.type.toLowerCase()} ${priceLabel(p)}, ${p.city} | ${BRAND}` : `Все объекты | ${BRAND}`;
  const description = p ? p.summary : 'Актуальные объекты недвижимости в Испании: доступ по запросу в WhatsApp или Telegram.';
  return {
    status: 200,
    html: page({
      title, description, path: path === '/' ? '/' : `/${slug}`, og: p ? picture(p.images[0].id).large : null, origin: OPT.origin,
      css: CSS, js: '/persiana/persiana.js', theme: THEME,
      fonts: ['sofia-sans-extra-condensed-latin-normal.woff2', 'golos-text-cyrillic-normal.woff2'],
      data: { active: slug, policyVersion: OPT.policyVersion, properties: properties.map(x => ({ slug: x.slug, name: x.name, price: x.price, priceLabel: priceLabel(x), presentation: x.presentation, title: `${x.name} — ${x.type.toLowerCase()} ${priceLabel(x)}, ${x.city} | ${BRAND}`, images: x.images.map(i => ({ caption: i.caption, note: i.note || '', alt: i.alt, pos: i.pos || '50% 50%', ...picture(i.id) })) })) },
      body: body(slug)
    })
  };
}

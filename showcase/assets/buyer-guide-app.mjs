// «Гид покупателя» — three local design prototypes of one full-screen guide.
// A Premium Editorial · B Personal Concierge · C Interactive Buyer Guide.
// The lead forms here are visual prototypes: nothing is sent or stored.
import * as C from './buyer-guide-content.mjs';
import { messengerIcon } from './messenger-icons.mjs';

const VARIANTS = { a: 'Premium Editorial', b: 'Personal Concierge', c: 'Interactive Guide' };
const STORE = 'sp:buyer-guide-variant-v2';
const DEFAULT_VARIANT = 'b'; // chosen by the client on 2026-11-23
const root = document.documentElement;
const local = ['127.0.0.1', 'localhost'].includes(location.hostname) || location.pathname.startsWith('/preview/');
const previewRoute = () => /^\/preview\/buyer-guide-[abc]\/?$/.test(location.pathname);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

let dialog, scroller, view, variant, returnFocus;
let teardown = [];

const esc = value => String(value).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad = n => String(n).padStart(2, '0');
const euro = n => `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Math.round(n))} €`;
const pct = n => `${String(n).replace('.', ',')}%`;

const paths = {
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  arrow: '<path d="M5 19 19 5M5 5h14v14"/>',
  right: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  left: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  check: '<path d="m5 12.5 4.2 4.2L19 7"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  doc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10.5 5-3v9l-5-3"/>',
  shield: '<path d="M12 3 5 6v6c0 4.2 3 7.6 7 9 4-1.4 7-4.8 7-9V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 8.5-8.5M16 7l2.5 2.5M14 9l2 2"/>',
  phone: '<path d="M6.5 3h3l1.5 5-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2 5 1.5v3a2 2 0 0 1-2 2A17 17 0 0 1 4.5 5a2 2 0 0 1 2-2z"/>',
  // Minimal line icons for the file chapters (24px grid, 1.5 stroke).
  route: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h7.5a3.5 3.5 0 0 0 0-7h-7a3.5 3.5 0 0 1 0-7H16"/>',
  file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  percent: '<path d="M18.5 5.5 5.5 18.5"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
  houseCheck: '<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="m9.5 14.5 2 2 3.5-3.5"/>',
  warning: '<path d="M10.3 4.2 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4M12 17h.01"/>'
};
// Horizontal-only reveal inside a scrolling strip; never moves the guide itself.
function revealInline(item, behavior = 'auto') {
  const strip = item?.parentElement;
  if (!strip || strip.scrollWidth <= strip.clientWidth) return;
  strip.scrollTo({ left: item.offsetLeft - (strip.clientWidth - item.offsetWidth) / 2, behavior });
}
const icon = (name, cls = '') => `<svg class="g-icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name]}</svg>`;
const closeButton = cls => `<button type="button" class="g-close ${cls}" data-guide-close aria-label="Закрыть гид">${icon('close')}</button>`;
// The attribute is composed so static asset scanners (build/tests) never read a template placeholder as a path.
const quoted = value => `"${esc(value)}"`;
const photo = (cls, loading = 'eager') => `<img class="${cls}" src=${quoted(C.expert.photo)} width="500" height="750" alt="${esc(C.expert.photoAlt)}" loading="${loading}" decoding="async">`;

// ---------- Shared parts ----------
const METHODS = {
  whatsapp: { name: 'WhatsApp', label: 'Номер WhatsApp', type: 'tel', mode: 'tel', placeholder: '+34 600 000 000', auto: 'tel' },
  telegram: { name: 'Telegram', label: 'Telegram: @username или номер', type: 'text', mode: 'text', placeholder: '@username', auto: 'username' },
  phone: { name: 'Звонок', label: 'Номер телефона', type: 'tel', mode: 'tel', placeholder: '+34 600 000 000', auto: 'tel' }
};
const methodIcon = m => m === 'phone' ? icon('phone') : messengerIcon(m).outerHTML.replace('quiz-messenger-icon', 'g-icon g-brand');
function fields(id) {
  return `
   <label class="g-field"><span class="g-field-label">Ваше имя</span>
    <input name="name" autocomplete="given-name" required minlength="2" maxlength="60" placeholder="Как к вам обращаться" aria-describedby="${id}-name-error">
    <span class="g-error" id="${id}-name-error"></span></label>
   <fieldset class="g-methods"><legend class="g-field-label">Куда прислать</legend>
    ${Object.entries(METHODS).map(([key, m], i) => `<label class="g-method"><input type="radio" name="method" value="${key}"${i ? '' : ' checked'}><span>${methodIcon(key)}${m.name}</span></label>`).join('')}
   </fieldset>
   <label class="g-field"><span class="g-field-label" data-contact-label>${METHODS.whatsapp.label}</span>
    <input name="contact" type="tel" inputmode="tel" autocomplete="tel" required placeholder="${METHODS.whatsapp.placeholder}" maxlength="40" aria-describedby="${id}-contact-error">
    <span class="g-error" id="${id}-contact-error"></span></label>`;
}
const submit = label => `<button type="submit" class="g-submit">${esc(label)}${icon('arrow')}</button>`;
const consent = () => `<p class="g-consent">${C.offer.consent}</p>${local ? '<p class="g-proto-note">Прототип: форма не отправляет и не сохраняет данные.</p>' : ''}`;
const quizLink = () => `<p class="g-quiz">${esc(C.offer.quizPrompt)} <button type="button" data-guide-quiz>${esc(C.offer.quizLink)}${icon('right')}</button></p>`;
function leadForm(id, extraClass = '') {
  return `<form class="g-form ${extraClass}" data-guide-form novalidate>
   <div class="g-form-body">${fields(id)}${submit(C.offer.button)}${consent()}</div>
  </form>`;
}
function pdfMock(cls) {
  return `<div class="g-pdf ${cls}" aria-hidden="true">
   <div class="g-pdf-page g-pdf-under"></div>
   <div class="g-pdf-page">
    <div class="g-pdf-top"><img src="/assets/logo.svg" alt="" width="118" height="26"><span>PDF</span></div>
    <span class="g-pdf-kicker">Чек-лист покупателя</span>
    <strong class="g-pdf-title">${esc(C.checklist.title)}</strong>
    <ul>${C.checklist.preview.map(item => `<li><i>${icon('check')}</i>${esc(item)}</li>`).join('')}</ul>
    <span class="g-pdf-foot">Spain Property for Sale · Deniz Estate</span>
   </div>
  </div>`;
}
function ratesTable(cls) {
  return `<div class="${cls}-wrap"><table class="${cls}">
   <caption>Налог при покупке по регионам · ориентир 2026</caption>
   <thead><tr><th scope="col">Регион</th><th scope="col">Вторичное жильё</th><th scope="col">Новостройка</th></tr></thead>
   <tbody>${C.regionRates.map(r => `<tr><th scope="row">${esc(r.name)}<small>${esc(r.area)}</small></th><td>ITP ${r.itp[0] === r.itp[1] ? pct(r.itp[0]) : `${pct(r.itp[0])}–${pct(r.itp[1])}`}${r.itpAbove ? `<small>${pct(r.itpAbove.rate)} свыше 1 млн €</small>` : ''}</td><td>IVA 10% + AJD ${pct(r.ajd)}</td></tr>`).join('')}</tbody>
  </table></div>`;
}

// ---------- A · Premium Editorial ----------
function renderA() {
  const chapters = [['ga-path', 'Путь покупки'], ['ga-money', 'Документы, налоги и расходы'], ['ga-check', 'Проверка и риски'], ['ga-care', 'Наше сопровождение'], ['ga-offer', 'Бесплатный чек-лист']];
  const head = (n, title, text) => `<header class="ga-head"><span class="ga-num">${pad(n)}</span><h3>${title}</h3><p>${text}</p></header>`;
  return `<div class="ga">
  <header class="ga-bar"><img class="ga-logo" src="/assets/logo.svg" width="236" height="52" alt="Spain Property for Sale"><span class="ga-bar-title">Гид покупателя · Испания</span>${closeButton('ga-close')}</header>
  <section class="ga-cover">
   <figure class="ga-portrait">${photo('ga-photo')}<figcaption><strong>${esc(C.expert.name)}</strong><span>${esc(C.expert.role)}</span></figcaption></figure>
   <div class="ga-cover-copy">
    <p class="ga-kicker">Гид покупателя · выпуск 2026</p>
    <h2 class="ga-title" id="guide-title" tabindex="-1">Недвижимость в&nbsp;Испании: что важно знать до&nbsp;покупки</h2>
    <p class="ga-lead">${esc(C.welcome.text)}</p>
    <blockquote class="ga-quote"><p>«${esc(C.expert.quote)}»</p><footer>${esc(C.expert.name)} · ${esc(C.expert.role)}</footer></blockquote>
    <nav class="ga-toc" aria-label="Содержание гида">${chapters.map(([id, title], i) => `<a href="#${id}"><span>${pad(i + 1)}</span>${title}</a>`).join('')}</nav>
   </div>
  </section>
  <section class="ga-chapter" id="ga-path">
   ${head(1, 'Путь покупки', 'Восемь шагов — от первого разговора до записи в Реестре собственности.')}
   <ol class="ga-steps">${C.steps.map((s, i) => `<li><span class="ga-step-n">${pad(i + 1)}</span><div><h4>${esc(s.title)}</h4><p>${esc(s.text)}</p></div></li>`).join('')}</ol>
   <aside class="ga-stat"><strong>${esc(C.timing.value)}</strong><span>${esc(C.timing.text)}</span></aside>
  </section>
  <section class="ga-chapter" id="ga-money">
   ${head(2, 'Документы, налоги и&nbsp;расходы', 'Что подготовить и сколько закладывать сверх цены объекта.')}
   <div class="ga-money">
    <div class="ga-col"><h4 class="ga-label">Документы</h4><ul class="ga-list">${C.documents.map(([t, d]) => `<li><strong>${esc(t)}</strong><span>${esc(d)}</span></li>`).join('')}</ul></div>
    <div class="ga-col"><h4 class="ga-label">Налог при покупке</h4>${C.purchaseTaxes.map(t => `<div class="ga-figure"><strong>${esc(t.value)}</strong><span><b>${esc(t.name)}</b> · ${esc(t.label)}<br>${esc(t.text)}</span></div>`).join('')}<p class="ga-note">${esc(C.taxTip)}</p></div>
    <div class="ga-col"><h4 class="ga-label">Сверх цены</h4><strong class="ga-big">${esc(C.costSummary.value)}</strong><p class="ga-big-note">${esc(C.costSummary.text)}</p>
     <ul class="ga-list ga-list--tight">${C.costs.map(([t, d]) => `<li><strong>${esc(t)}</strong><span>${esc(d)}</span></li>`).join('')}</ul>
     <h4 class="ga-label ga-label--gap">Каждый год</h4><ul class="ga-list ga-list--tight">${C.annualTaxes.map(([t, v]) => `<li><strong>${esc(t)}</strong><span>${esc(v)}</span></li>`).join('')}</ul></div>
   </div>
   ${ratesTable('ga-rates')}
  </section>
  <section class="ga-chapter" id="ga-check">
   ${head(3, 'Проверка и&nbsp;риски', 'Что проверить до задатка — и ошибки, которые чаще всего обходятся дороже всего.')}
   <div class="ga-two">
    <div><h4 class="ga-label">Что проверить</h4><ol class="ga-checks">${C.checks.map(([t, d]) => `<li>${icon('check')}<div><strong>${esc(t)}</strong><span>${esc(d)}</span></div></li>`).join('')}</ol></div>
    <div class="ga-risks"><h4 class="ga-label">Типичные ошибки</h4><ol>${C.risks.map(([t, d], i) => `<li><span>${pad(i + 1)}</span><div><strong>${esc(t)}</strong><p>${esc(d)}</p></div></li>`).join('')}</ol></div>
   </div>
  </section>
  <section class="ga-chapter" id="ga-care">
   ${head(4, 'Наше сопровождение', 'Deniz Estate сопровождает покупателя от подбора до получения ключей.')}
   <ol class="ga-services">${C.services.map((s, i) => `<li><span class="ga-step-n">${pad(i + 1)}</span><h4>${esc(s.title)}</h4><p>${esc(s.text)}</p></li>`).join('')}</ol>
   <p class="ga-extra"><span>Также</span>${C.extraServices.map(esc).join('<i aria-hidden="true">·</i>')}</p>
  </section>
  <section class="ga-offer" id="ga-offer">
   <div class="ga-offer-doc">${pdfMock('ga-pdf')}</div>
   <div class="ga-offer-copy">
    <p class="ga-kicker ga-kicker--light">05 · ${esc(C.checklist.kicker)}</p>
    <h3>${esc(C.offer.title)}</h3>
    <p class="ga-offer-text">${esc(C.checklist.text)} ${esc(C.offer.text)}</p>
    <ul class="g-trust">${C.offer.trust.map(t => `<li>${icon('check')}${esc(t)}</li>`).join('')}</ul>
    ${leadForm('ga', 'g-form--row')}
    ${quizLink()}
   </div>
  </section>
  <footer class="ga-foot"><p>${esc(C.disclaimer)}</p></footer>
 </div>`;
}

// ---------- B · Personal Concierge ----------
// Expert on white → the guide packaged as one file → the existing region quiz.
// No form of its own: every call to action opens the site's quiz.
function pathPage() {
  return `<div class="g-pdf-page gb-page-path">
    <span class="g-pdf-kicker">Раздел 1</span>
    <strong class="gb-page-title">8 шагов: от бюджета до ключей</strong>
    <ol>${C.steps.map((s, i) => `<li><b>${pad(i + 1)}</b>${esc(s.title)}</li>`).join('')}</ol>
    <span class="g-pdf-foot">Spain Property for Sale · стр. 2</span>
   </div>`;
}
function renderB() {
  const cta = cls => `<button type="button" class="gb-cta ${cls}" data-guide-quiz>${esc(C.quizOffer.button)}${icon('arrow')}</button>`;
  return `<div class="gb">
  <header class="gb-bar"><img class="gb-logo" src="/assets/logo.svg" width="236" height="52" alt="Spain Property for Sale">${closeButton('gb-close')}</header>
  <section class="gb-hello">
   <figure class="gb-portrait">
    <div class="gb-photo"><img class="gb-cutout" src=${quoted(C.expert.cutout)} width="988" height="887" alt="${esc(C.expert.photoAlt)}" decoding="async"></div>
    <figcaption class="gb-sign"><strong>${esc(C.expert.name)}</strong><span>${esc(C.expert.role)}</span></figcaption>
   </figure>
   <div class="gb-intro">
    <p class="gb-greet">${esc(C.welcome.greeting)}</p>
    <h2 id="guide-title" tabindex="-1">Спокойная покупка дома в&nbsp;Испании начинается с&nbsp;понятного плана</h2>
    <p class="gb-lead">${esc(C.quizOffer.intro)}</p>
    <blockquote class="gb-quote"><p>«${esc(C.expert.quote)}»</p><footer>${esc(C.expert.name)}, ${esc(C.expert.role.replace(/^О/, 'о'))}</footer></blockquote>
    <div class="gb-actions">${cta('')}<a class="gb-link" href="#gb-file">Что внутри файла${icon('down')}</a></div>
   </div>
  </section>
  <section class="gb-file" id="gb-file">
   <div class="gb-file-inner">
    <div class="gb-file-pages" aria-hidden="true">
     <div class="g-pdf gb-page gb-page--inner">${pathPage()}</div>
     ${pdfMock('gb-page gb-page--cover')}
    </div>
    <div class="gb-file-body">
     <p class="gb-kicker">${esc(C.checklist.kicker)}</p>
     <h3>Всё, что важно знать до&nbsp;покупки, — в&nbsp;одном файле</h3>
     <p class="gb-file-text">${esc(C.checklist.text)}</p>
     <ul class="gb-contents">${C.fileContents.map(([t, d, name]) => `<li><span class="gb-contents-icon">${icon(name)}</span><div><strong>${esc(t)}</strong><small>${esc(d)}</small></div></li>`).join('')}</ul>
    </div>
   </div>
  </section>
  <section class="gb-final">
   <div class="gb-final-card">
    <div class="gb-final-copy">
     <h3>${esc(C.quizOffer.title)}</h3>
     <p>${esc(C.quizOffer.text)}</p>
     <ul class="g-trust">${C.offer.trust.map(t => `<li>${icon('check')}${esc(t)}</li>`).join('')}</ul>
    </div>
    <div class="gb-final-action">${cta('gb-cta--light')}<p>${esc(C.quizOffer.note)}</p></div>
   </div>
  </section>
 </div>`;
}

// ---------- C · Interactive Buyer Guide ----------
const C_SECTIONS = [['gc-expert', 'Знакомство'], ['gc-steps', 'Этапы покупки'], ['gc-money', 'Документы и налоги'], ['gc-check', 'Проверка и риски'], ['gc-care', 'Сопровождение'], ['gc-offer', 'Чек-лист']];
function renderC() {
  const head = (n, title, text) => `<header class="gc-head"><span class="gc-head-n">${n}</span><div><h3>${title}</h3><p>${text}</p></div></header>`;
  const acc = (title, body, open = false) => `<details class="gc-acc"${open ? ' open' : ''}><summary><span>${title}</span>${icon('plus', 'gc-acc-icon')}</summary><div class="gc-acc-body">${body}</div></details>`;
  return `<div class="gc">
  <aside class="gc-side">
   <img class="gc-logo" src="/assets/logo.svg" width="236" height="52" alt="Spain Property for Sale">
   <p class="gc-side-title">Гид покупателя</p>
   <div class="gc-progress"><span class="gc-bar"><i data-gc-bar></i></span><span class="gc-progress-text" data-gc-progress>Пройдено 0 из ${C_SECTIONS.length}</span></div>
   <nav class="gc-nav" aria-label="Разделы гида">${C_SECTIONS.map(([id, title], i) => `<a href="#${id}" data-gc-link="${id}"><span class="gc-nav-n">${i + 1}</span><span class="gc-nav-t">${title}</span></a>`).join('')}</nav>
   <a class="gc-side-cta" href="#gc-offer">Получить чек-лист${icon('arrow')}</a>
   ${closeButton('gc-close gc-close--side')}
  </aside>
  <div class="gc-main">
   <div class="gc-top">${closeButton('gc-close')}</div>
   <section class="gc-sec gc-intro" id="gc-expert">
    <p class="gc-eyebrow">Интерактивный гид · ${C_SECTIONS.length} разделов</p>
    <h2 id="guide-title" tabindex="-1">Покупка недвижимости в&nbsp;Испании — шаг за&nbsp;шагом</h2>
    <p class="gc-lead">${esc(C.welcome.text)}</p>
    <div class="gc-expert">
     ${photo('gc-expert-photo')}
     <div class="gc-expert-body">
      <p class="gc-eyebrow gc-eyebrow--muted">Ваш эксперт</p>
      <strong class="gc-expert-name">${esc(C.expert.name)}</strong><span class="gc-expert-role">${esc(C.expert.role)}</span>
      <blockquote>«${esc(C.expert.quote)}»</blockquote>
      <div class="gc-chips">${C.facts.map(([v, t]) => `<span title="${esc(t)}"><b>${esc(v)}</b>${esc(t)}</span>`).join('')}</div>
     </div>
    </div>
   </section>
   <section class="gc-sec" id="gc-steps">
    ${head(2, 'Этапы покупки', 'Выберите шаг, чтобы увидеть подробности.')}
    <div class="gc-stepper">
     <div class="gc-tabs" role="tablist" aria-label="Этапы покупки">${C.steps.map((s, i) => `<button type="button" role="tab" id="gc-tab-${i}" aria-controls="gc-step-panel" aria-selected="${i === 0}" tabindex="${i ? -1 : 0}" data-step="${i}"><span>${i + 1}</span>${esc(s.title)}</button>`).join('')}</div>
     <div class="gc-panel" id="gc-step-panel" role="tabpanel" aria-labelledby="gc-tab-0" data-step-panel></div>
     <div class="gc-step-nav"><button type="button" class="gc-ghost" data-step-prev>${icon('left')}Назад</button><span class="gc-step-count" data-step-count></span><button type="button" class="gc-ghost" data-step-next>Далее${icon('right')}</button></div>
    </div>
    <p class="gc-timing">${icon('clock')}<span><b>${esc(C.timing.value)}</b> — ${esc(C.timing.text)}</span></p>
   </section>
   <section class="gc-sec" id="gc-money">
    ${head(3, 'Документы, налоги и расходы', 'Посчитайте расходы для своего региона и раскройте нужный раздел.')}
    <div class="gc-calc" data-calc>
     <div class="gc-calc-in">
      <h4>Калькулятор расходов</h4>
      <label class="gc-input"><span>Регион</span><select data-calc-region>${C.regionRates.map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select></label>
      <div class="gc-seg" role="radiogroup" aria-label="Тип жилья"><label><input type="radio" name="gc-type" value="resale" checked><span>Вторичное</span></label><label><input type="radio" name="gc-type" value="new"><span>Новостройка</span></label></div>
      <label class="gc-input"><span>Цена объекта, €</span><input data-calc-price inputmode="numeric" autocomplete="off" value="300 000" aria-describedby="gc-calc-note"></label>
     </div>
     <dl class="gc-calc-out" aria-live="polite">
      <div><dt data-calc-tax-label>Налог</dt><dd data-calc-tax>—</dd></div>
      <div><dt>Нотариус, реестр и юрист (${pct(C.feeRange[0])}–${pct(C.feeRange[1])})</dt><dd data-calc-fees>—</dd></div>
      <div class="gc-calc-total"><dt>Итого сверх цены</dt><dd data-calc-total>—</dd></div>
      <p class="gc-calc-note" id="gc-calc-note" data-calc-note></p>
     </dl>
    </div>
    ${acc('Документы покупателя', `<ul class="gc-list">${C.documents.map(([t, d]) => `<li><strong>${esc(t)}</strong><span>${esc(d)}</span></li>`).join('')}</ul>`, true)}
    ${acc('Налоги при покупке', `<ul class="gc-list">${C.purchaseTaxes.map(t => `<li><strong>${esc(t.name)} · ${esc(t.value)}</strong><span>${esc(t.label)} — ${esc(t.text.toLowerCase())}</span></li>`).join('')}</ul><p class="gc-tip">${esc(C.taxTip)}</p>${ratesTable('gc-rates')}`)}
    ${acc('Ежегодные налоги и платежи', `<ul class="gc-list">${C.annualTaxes.map(([t, v, d]) => `<li><strong>${esc(t)} · ${esc(v)}</strong><span>${esc(d)}</span></li>`).join('')}</ul>`)}
    ${acc('Дополнительные расходы', `<ul class="gc-list">${C.costs.map(([t, d]) => `<li><strong>${esc(t)}</strong><span>${esc(d)}</span></li>`).join('')}</ul><p class="gc-tip"><b>${esc(C.costSummary.value)}</b> — ${esc(C.costSummary.text)}.</p>`)}
   </section>
   <section class="gc-sec" id="gc-check">
    ${head(4, 'Проверка и риски', 'Отметьте, что уже проверено, — полный список будет в PDF.')}
    <div class="gc-checklist">
     <div class="gc-checklist-head"><strong>Перед задатком</strong><span class="gc-ring" style="--done:0" data-check-ring><span data-check-count>0/${C.checks.length}</span></span></div>
     <ul>${C.checks.map(([t, d], i) => `<li><label><input type="checkbox" data-check="${i}"><span class="gc-box">${icon('check')}</span><span class="gc-check-text"><strong>${esc(t)}</strong><small>${esc(d)}</small></span></label></li>`).join('')}</ul>
    </div>
    <h4 class="gc-subhead">Типичные ошибки</h4>
    <div class="gc-risks">${C.risks.map(([t, d]) => acc(`${icon('alert', 'gc-risk-icon')}${esc(t)}`, `<p>${esc(d)}</p>`)).join('')}</div>
   </section>
   <section class="gc-sec" id="gc-care">
    ${head(5, 'Наше сопровождение', 'Что берёт на себя команда Deniz Estate.')}
    <div class="gc-services">${C.services.map(s => `<article><span class="gc-service-icon">${icon(s.icon)}</span><h4>${esc(s.title)}</h4><p>${esc(s.text)}</p></article>`).join('')}
     <article class="gc-service-more"><h4>Также</h4>${C.extraServices.map(s => `<p>${icon('plus')}${esc(s)}</p>`).join('')}</article></div>
   </section>
   <section class="gc-sec" id="gc-offer">
    ${head(6, 'Чек-лист и подборка', 'Два шага — и всё придёт в удобный мессенджер.')}
    <div class="gc-offer">
     <div class="gc-offer-info">${pdfMock('gc-pdf')}<p class="gc-eyebrow gc-eyebrow--light">${esc(C.checklist.kicker)}</p><h3>${esc(C.offer.title)}</h3><p>${esc(C.offer.text)}</p><ul class="g-trust">${C.offer.trust.map(t => `<li>${icon('check')}${esc(t)}</li>`).join('')}</ul></div>
     <form class="g-form gc-wizard" data-guide-form data-wizard novalidate>
      <ol class="gc-wiz-steps"><li class="is-active" data-wiz-mark="1"><span>1</span>Что прислать</li><li data-wiz-mark="2"><span>2</span>Контакты</li></ol>
      <div class="gc-wiz-pane" data-pane="1">
       <fieldset class="gc-wants"><legend class="g-field-label">Что прислать?</legend>
        <label class="gc-want"><input type="radio" name="want" value="both" checked><span><strong>Чек-лист + подборка объектов</strong><small>PDF и варианты под ваш регион, бюджет и цели</small></span></label>
        <label class="gc-want"><input type="radio" name="want" value="checklist"><span><strong>Только чек-лист</strong><small>PDF «${esc(C.checklist.title)}»</small></span></label>
       </fieldset>
       <button type="button" class="g-submit" data-wiz-next>Далее${icon('right')}</button>
      </div>
      <div class="gc-wiz-pane" data-pane="2" hidden>
       <div class="g-form-body">${fields('gc')}${submit('Получить')}<button type="button" class="gc-ghost gc-back" data-wiz-back>${icon('left')}Назад</button>${consent()}</div>
      </div>
     </form>
    </div>
    ${quizLink()}
   </section>
   <footer class="gc-foot"><p>${esc(C.disclaimer)}</p></footer>
  </div>
 </div>`;
}

// ---------- Behaviour ----------
function setupForm(form) {
  const body = form.querySelector('.g-form-body');
  const contact = form.elements.contact;
  const label = form.querySelector('[data-contact-label]');
  const methodValue = () => form.querySelector('input[name=method]:checked')?.value || 'whatsapp';
  const sync = () => {
    const m = METHODS[methodValue()];
    label.textContent = m.label; contact.type = m.type; contact.inputMode = m.mode; contact.placeholder = m.placeholder; contact.autocomplete = m.auto;
    setError(contact, '');
  };
  function setError(input, message) {
    input.toggleAttribute('aria-invalid', Boolean(message));
    const out = form.querySelector(`#${input.getAttribute('aria-describedby')}`);
    if (out) out.textContent = message;
  }
  form.addEventListener('change', event => { if (event.target.name === 'method') sync(); });
  form.addEventListener('input', event => { if (event.target.hasAttribute('aria-invalid')) setError(event.target, ''); });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const name = form.elements.name.value.trim();
    const value = contact.value.trim();
    const digits = value.replace(/\D/g, '').length;
    const method = methodValue();
    const nameError = name.length < 2 ? 'Укажите, как к вам обращаться.' : '';
    const contactError = method === 'telegram'
      ? (/^@?[a-z0-9_]{5,32}$/i.test(value) || digits >= 7 ? '' : 'Укажите @username или номер телефона.')
      : (digits >= 7 ? '' : 'Укажите номер телефона с кодом страны.');
    setError(form.elements.name, nameError);
    setError(contact, contactError);
    if (nameError || contactError) { (nameError ? form.elements.name : contact).focus(); return; }
    const want = form.querySelector('input[name=want]:checked')?.value;
    const success = document.createElement('div');
    success.className = 'g-success';
    success.setAttribute('role', 'status');
    success.tabIndex = -1;
    success.innerHTML = `<span class="g-success-icon">${icon('check')}</span>
     <h4>Спасибо, ${esc(name)}!</h4>
     <p>${method === 'phone'
      ? `Специалист свяжется с вами по телефону${want === 'checklist' ? '' : ' и уточнит критерии подборки'}.`
      : `${want === 'checklist' ? 'Чек-лист придёт' : 'Чек-лист и персональная подборка придут'} в ${METHODS[method].name}.`}</p>
     <p class="g-proto-note">Прототип: заявка не отправлена и нигде не сохранена.</p>
     <button type="button" class="g-submit g-submit--ghost" data-guide-quiz>Указать регион и бюджет${icon('right')}</button>`;
    (form.matches('[data-wizard]') ? form : body).replaceChildren(success);
    success.focus({ preventScroll: true });
  });
  if (form.matches('[data-wizard]')) {
    const panes = form.querySelectorAll('[data-pane]');
    const marks = form.querySelectorAll('[data-wiz-mark]');
    const go = n => {
      panes.forEach(pane => { pane.hidden = pane.dataset.pane !== String(n); });
      marks.forEach(mark => { mark.classList.toggle('is-active', Number(mark.dataset.wizMark) <= n); });
      (n === 2 ? form.elements.name : form.querySelector('input[name=want]:checked'))?.focus({ preventScroll: true });
    };
    form.querySelector('[data-wiz-next]').addEventListener('click', () => go(2));
    form.querySelector('[data-wiz-back]').addEventListener('click', () => go(1));
  }
}

function setupStepper(scope) {
  const tabs = [...scope.querySelectorAll('[role=tab][data-step]')];
  const panel = scope.querySelector('[data-step-panel]');
  const count = scope.querySelector('[data-step-count]');
  const prev = scope.querySelector('[data-step-prev]');
  const next = scope.querySelector('[data-step-next]');
  if (!tabs.length || !panel) return;
  let index = 0;
  function show(i, focus = false) {
    index = Math.max(0, Math.min(tabs.length - 1, i));
    const step = C.steps[index];
    tabs.forEach((tab, n) => {
      tab.setAttribute('aria-selected', String(n === index));
      tab.tabIndex = n === index ? 0 : -1;
      tab.classList.toggle('is-done', n < index);
    });
    panel.setAttribute('aria-labelledby', tabs[index].id);
    panel.innerHTML = `<span class="gc-panel-n">${pad(index + 1)}</span>
     <div class="gc-panel-body"><h4>${esc(step.title)}</h4><p>${esc(step.text)}</p>
      <p class="gc-panel-help">${icon('check')}<span><b>Чем поможем:</b> ${esc(step.help)}</span></p></div>`;
    if (!reduced.matches) panel.animate?.([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.22,1,.36,1)' });
    count.textContent = `Шаг ${index + 1} из ${tabs.length}`;
    prev.disabled = index === 0;
    next.disabled = index === tabs.length - 1;
    revealInline(tabs[index], reduced.matches ? 'auto' : 'smooth');
    if (focus) tabs[index].focus({ preventScroll: true });
  }
  tabs.forEach((tab, n) => tab.addEventListener('click', () => show(n)));
  scope.querySelector('[role=tablist]').addEventListener('keydown', event => {
    const keys = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 };
    if (event.key in keys) { event.preventDefault(); show(keys[event.key], true); }
  });
  prev.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  show(0);
}

function setupCalculator(scope) {
  const calc = scope.querySelector('[data-calc]');
  if (!calc) return;
  const region = calc.querySelector('[data-calc-region]');
  const price = calc.querySelector('[data-calc-price]');
  const out = name => calc.querySelector(`[data-calc-${name}]`);
  const parse = () => Number(price.value.replace(/\D/g, '')) || 0;
  const range = (a, b) => Math.round(a) === Math.round(b) ? euro(a) : `${euro(a)} – ${euro(b)}`;
  function update() {
    const rates = C.regionRates.find(r => r.id === region.value) || C.regionRates[0];
    const type = calc.querySelector('input[name=gc-type]:checked').value;
    const value = Math.min(parse(), 50000000);
    let low, high, label;
    if (type === 'new') { low = high = 10 + rates.ajd; label = `IVA 10% + AJD ${pct(rates.ajd)}`; }
    else {
      [low, high] = rates.itpAbove && value > rates.itpAbove.from ? [rates.itpAbove.rate, rates.itpAbove.rate] : rates.itp;
      label = `ITP ${low === high ? pct(low) : `${pct(low)}–${pct(high)}`}`;
    }
    out('tax-label').textContent = `Налог: ${label}`;
    if (!value) { ['tax', 'fees', 'total'].forEach(k => { out(k).textContent = '—'; }); }
    else {
      out('tax').textContent = range(value * low / 100, value * high / 100);
      out('fees').textContent = range(value * C.feeRange[0] / 100, value * C.feeRange[1] / 100);
      out('total').textContent = range(value * (low + C.feeRange[0]) / 100, value * (high + C.feeRange[1]) / 100);
    }
    out('note').textContent = `${rates.area}: ${rates.note}${type === 'new' ? `, AJD ${pct(rates.ajd)}` : ''}. Ориентир на 2026 год, без ипотеки; точный расчёт — у юриста.`;
  }
  price.addEventListener('input', update);
  price.addEventListener('blur', () => { const v = parse(); price.value = v ? new Intl.NumberFormat('ru-RU').format(v) : ''; });
  calc.addEventListener('change', update);
  update();
}

function setupChecklist(scope) {
  const boxes = [...scope.querySelectorAll('[data-check]')];
  const count = scope.querySelector('[data-check-count]');
  const ring = scope.querySelector('[data-check-ring]');
  if (!boxes.length) return;
  const update = () => {
    const done = boxes.filter(box => box.checked).length;
    count.textContent = `${done}/${boxes.length}`;
    ring.style.setProperty('--done', String(done / boxes.length));
  };
  boxes.forEach(box => box.addEventListener('change', update));
}

function setupProgress(scope) {
  const links = new Map([...scope.querySelectorAll('[data-gc-link]')].map(a => [a.dataset.gcLink, a]));
  const bar = scope.querySelector('[data-gc-bar]');
  const text = scope.querySelector('[data-gc-progress]');
  if (!links.size) return;
  const seen = new Set();
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const id = entry.target.id;
      seen.add(id);
      links.forEach((link, key) => {
        link.classList.toggle('is-active', key === id);
        link.classList.toggle('is-done', seen.has(key) && key !== id);
        if (key === id) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current');
      });
      revealInline(links.get(id));
    }
    bar.style.transform = `scaleX(${seen.size / links.size})`;
    text.textContent = `Пройдено ${seen.size} из ${links.size}`;
  }, { root: scroller, rootMargin: '-35% 0px -55% 0px' });
  links.forEach((_, id) => { const section = scope.querySelector(`#${id}`); if (section) observer.observe(section); });
  teardown.push(() => observer.disconnect());
}

function render(next) {
  teardown.forEach(fn => fn()); teardown = [];
  variant = VARIANTS[next] ? next : DEFAULT_VARIANT;
  try { localStorage.setItem(STORE, variant); } catch {}
  dialog.dataset.variant = variant;
  view.innerHTML = { a: renderA, b: renderB, c: renderC }[variant]();
  view.querySelectorAll('[data-guide-form]').forEach(setupForm);
  if (variant === 'c') { setupStepper(view); setupCalculator(view); setupChecklist(view); setupProgress(view); }
  scroller.scrollTop = 0;
  dialog.querySelectorAll('[data-variant-pick]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.variantPick === variant)));
  if (previewRoute()) history.replaceState(history.state, '', `/preview/buyer-guide-${variant}`);
}

function close() {
  if (!dialog?.open || dialog.classList.contains('is-closing')) return;
  if (reduced.matches) { dialog.close(); return; }
  dialog.classList.add('is-closing');
  setTimeout(() => { dialog.classList.remove('is-closing'); dialog.close(); }, 260);
}

function ensureDialog() {
  if (dialog) return;
  dialog = document.createElement('dialog');
  dialog.className = 'guide';
  dialog.setAttribute('aria-labelledby', 'guide-title');
  dialog.innerHTML = `<div class="guide-scroll"><div class="guide-view"></div></div>
   ${local ? `<div class="guide-proto" role="group" aria-label="Прототип: вариант дизайна">
    <span class="guide-proto-label">Прототип</span>
    ${Object.entries(VARIANTS).map(([key, name]) => `<button type="button" data-variant-pick="${key}" aria-pressed="false" title="${name}"><b>${key.toUpperCase()}</b><span>${name}</span></button>`).join('')}
   </div>` : ''}`;
  document.body.append(dialog);
  scroller = dialog.querySelector('.guide-scroll');
  view = dialog.querySelector('.guide-view');
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('close', () => {
    teardown.forEach(fn => fn()); teardown = [];
    root.classList.remove('guide-open');
    returnFocus?.focus?.({ preventScroll: true });
  });
  dialog.addEventListener('click', event => {
    const target = event.target.closest('a,button');
    if (!target || !dialog.contains(target)) return;
    if (target.matches('[data-guide-close]')) close();
    else if (target.matches('[data-variant-pick]')) render(target.dataset.variantPick);
    else if (target.matches('[data-guide-quiz]')) {
      // Hand over to the existing region quiz without changing its logic.
      returnFocus = null;
      dialog.close();
      document.querySelector('.hero-action [data-open-quiz]')?.click();
    } else if (target.matches('a[href^="#"]')) {
      event.preventDefault();
      view.querySelector(target.getAttribute('href'))?.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' });
    }
  });
}

export function openGuide({ variant: requested, trigger } = {}) {
  ensureDialog();
  let saved;
  try { saved = localStorage.getItem(STORE); } catch {}
  const next = requested || (local && VARIANTS[saved] ? saved : DEFAULT_VARIANT);
  returnFocus = trigger || document.activeElement;
  if (!dialog.open) {
    root.classList.add('guide-open');
    dialog.showModal();
  }
  render(next);
  dialog.querySelector('#guide-title')?.focus({ preventScroll: true });
}

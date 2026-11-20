import { messengerIcon } from './messenger-icons.mjs';
import { THANK_YOU_PATH, isThankYouPath, receiptFromSession, rememberSavedLead } from './lead-receipt.mjs';
import { steps as originalQuestions, copy, policyVersion } from './quiz.config.mjs';
import { telegramUsername, normalizeName, contactMethodLabel } from './contact.mjs';
import { createPhoneField } from './phone-field.mjs';
import { dailyPriceStamp, nextPriceStampChange } from './price-clock.mjs';
import { regions, pricingData, priceSource, generateBudgetRanges, selectedBudgetRanges, formatMoney } from './pricing.mjs';

const storageKey = 'spain-property-cinematic-quiz-v1';
const titles = {
  ru: ['Какое побережье вы рассматриваете?', 'Какие города предпочтительнее?', 'Укажите тип объекта', 'Выберите бюджет', 'Какая ваша основная цель?', 'Когда планируете приехать в Испанию?', 'PDF презентация с объектами по вашим критериям сформирована и готова к отправке.'],
  en: ['Which coast feels like home?', 'Which cities shall we consider?', 'What are you looking for?', 'Your property budget', 'What is your reason for buying?', 'When are you planning to visit?', 'A PDF PRESENTATION WITH THE PROPERTIES MATCHING YOUR CRITERIA IS PREPARED AND READY TO SEND.']
};
let lang = document.documentElement.lang === 'en' ? 'en' : 'ru';
const text = (ru, en) => lang === 'en' ? en : ru;
const money = value => formatMoney(value, lang);
let step = 0;
let selection = { regions: [], cities: [], anyCityRegions: [], propertyType: '' };
let budget = null;
let budgetMode = '';
let purpose = '';
let timeline = '';
let onlineViewings = false;
let crossRegionOptIn = false;
let contactName = '';
let contactValues = { whatsapp: '', telegram: '', viber: '', phone: '' };
let messenger = 'whatsapp';
let consent = true;
let submitting = false;
let complete = false;
let requestId = crypto.randomUUID();
let focusBefore;
let phoneField;
let scrollY = 0;
let viewportFrame;
let priceStampTimer;
const phoneStates = Object.fromEntries(['whatsapp', 'viber', 'phone'].map(method => [method, { country: 'ES', source: 'fallback', hasInput: false }]));
const propertyTypes = [
  ['apartment', 'Квартира / апартаменты', 'Apartment'], ['villa', 'Дом / вилла', 'House / villa'], ['both', 'Рассматриваю оба варианта', 'Considering both'],
  ['penthouse', 'Пентхаус', 'Penthouse'], ['townhouse', 'Таунхаус / бунгало', 'Townhouse / bungalow'], ['commercial', 'Коммерческая недвижимость', 'Commercial property']
];
const questionFor = id => originalQuestions.find(question => question.id === id);
const validValue = (id, value) => questionFor(id)?.options.some(option => option[0] === value);
const typeName = type => propertyTypes.find(row => row[0] === type)?.[lang === 'en' ? 2 : 1] || type;
const regionName = id => regions.find(region => region.id === id)?.[lang] || id;
const labelFor = (id, value) => questionFor(id)?.options.find(row => row[0] === value)?.[lang === 'en' ? 2 : 1] || value;
try {
  const saved = JSON.parse(sessionStorage.getItem(storageKey));
  if (saved?.policyVersion === policyVersion) {
    selection.regions = [...new Set(saved.selection?.regions?.filter(id => regions.some(region => region.id === id)) || [])];
    selection.cities = [...new Set(saved.selection?.cities?.filter(id => pricingData.some(row => row.cityId === id && selection.regions.includes(row.regionId))) || [])];
    selection.anyCityRegions = [...new Set(saved.selection?.anyCityRegions?.filter(id => selection.regions.includes(id)) || [])];
    selection.propertyType = propertyTypes.some(row => row[0] === saved.selection?.propertyType) ? saved.selection.propertyType : '';
    purpose = validValue('purpose', saved.purpose) ? saved.purpose : '';
    timeline = validValue('timeline', saved.timeline) ? saved.timeline : '';
    onlineViewings = saved.onlineViewings === true;
    crossRegionOptIn = saved.crossRegionOptIn === true;
    if (saved.budget?.deferred===true&&!generateBudgetRanges(selection).ranges.length) {
      budget={deferred:true};budgetMode='deferred';
    } else {
      const restored = selectedBudgetRanges(selection, saved.budget?.ranges || (saved.budget?.custom === false ? [saved.budget] : []));
      if (restored.length) { budget = { ranges: restored }; budgetMode = 'range'; }
    }
    if (/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(saved.requestId)) requestId = saved.requestId;
    step = Math.min(6, Math.max(0, Number.isInteger(saved.step) ? saved.step : 0));
  }
} catch { /* Selection restoration is optional; contacts are never stored. */ }
function persist() {
  try { sessionStorage.setItem(storageKey, JSON.stringify({ policyVersion, selection, budget, budgetMode, purpose, timeline, onlineViewings, crossRegionOptIn, step, requestId })); } catch {}
}
function invalidateBudget() { budget = null; budgetMode = ''; crossRegionOptIn = false; }
function validCities() { return selection.regions.length > 0 && selection.regions.every(id => selection.anyCityRegions.includes(id) || selection.cities.some(city => pricingData.some(row => row.cityId === city && row.regionId === id))); }
function budgetStepNeeded() { return generateBudgetRanges(selection).ranges.length > 0; }
function hasAnswer(index = step) {
  if (index === 3 && !budgetStepNeeded()) return true;
  return [selection.regions.length > 0, validCities(), Boolean(selection.propertyType), Boolean(budget&&(budget.deferred===true?!generateBudgetRanges(selection).ranges.length:budgetMode==='range'&&selectedBudgetRanges(selection,budget.ranges).length>0)), Boolean(purpose), Boolean(timeline), true][index];
}
// Never resume beyond an unanswered selection, even if sessionStorage was edited.
for (let i = 0; i < step; i++) if (!hasAnswer(i)) { step = i; break; }

function node(tag, attrs = {}, content) {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (name === 'class') element.className = value;
    else element.setAttribute(name, String(value));
  }
  if (content !== undefined) element.textContent = content;
  return element;
}
function button(label, className, action) {
  const element = node('button', { type: 'button', class: className }, label);
  element.addEventListener('click', action); return element;
}
const dialog = node('dialog', { class: 'quiz-dialog', 'aria-labelledby': 'quiz-title' });
document.body.append(dialog);
function close() { if (!submitting) dialog.close(); }
dialog.addEventListener('cancel', event => { if (submitting) event.preventDefault(); });
dialog.addEventListener('click', event => {
  if (event.target !== dialog || submitting) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
});
dialog.addEventListener('close', () => {
  clearTimeout(priceStampTimer);
  phoneField?.cancel(); phoneField = undefined; cancelAnimationFrame(viewportFrame);
  document.documentElement.classList.remove('quiz-open'); document.body.classList.remove('quiz-open');
  document.body.style.removeProperty('--quiz-page-scroll-offset');
  window.scrollTo({ top: scrollY, behavior: 'instant' });
  focusBefore?.focus({ preventScroll: true });
  if (complete) {
    if (isThankYouPath(location.pathname)) { location.replace('/'); return; }
    selection = { regions: [], cities: [], anyCityRegions: [], propertyType: '' }; budget = null; budgetMode = ''; purpose = ''; timeline = ''; onlineViewings = false; step = 0;
    contactName = ''; contactValues = { whatsapp: '', telegram: '', viber: '', phone: '' }; consent = true; complete = false; crossRegionOptIn = false; requestId = crypto.randomUUID();
    try { sessionStorage.removeItem(storageKey); } catch {}
  }
});
function choice({ value, label, checked, multiple = false, name, note, onChange }) {
  const wrapper = node('label', { class: 'quiz-choice' });
  const input = node('input', { type: multiple ? 'checkbox' : 'radio', name, value }); input.checked = checked;
  const words = node('span', { class: 'quiz-choice-words' }); words.append(node('span', {}, label));
  if (note) words.append(node('small', {}, note));
  wrapper.append(input, words, node('span', { class: 'quiz-choice-mark', 'aria-hidden': 'true' }));
  input.addEventListener('change', () => { onChange(input.checked); persist(); updateNext(); });
  return wrapper;
}
function updateNext() { const next = dialog.querySelector('[data-next]'); if (next) next.disabled = !hasAnswer(); }
function edit(index) {
  // Auto-skip step 3 (budget) when no ranges are available.
  if (index === 3 && !budgetStepNeeded()) {
    // Clear any stale budget value and jump over.
    if (budget !== null) invalidateBudget();
    index = step < 3 ? 4 : 2; // forward → 4, backward → 2
  }
  step = index; persist(); render();
}
function render() {
  clearTimeout(priceStampTimer);
  phoneField?.cancel(); phoneField = undefined;
  dialog.lang = lang; dialog.dataset.stage = complete ? 'success' : step === 6 ? 'contact' : `question-${step}`;
  const shell = node('div', { class: 'quiz-shell' });
  const header = node('div', { class: 'quiz-top' });
  const identity = node('div', { class: 'quiz-brand' });
  identity.append(node('img', { src: '/assets/logo-white.svg', width: 236, height: 52, alt: 'Spain Property for Sale' }));
  const closeButton = button('', 'quiz-close', close); closeButton.setAttribute('aria-label', copy[lang].close);
  const closeIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  closeIcon.setAttribute('viewBox', '0 0 24 24');
  closeIcon.setAttribute('width', '22'); closeIcon.setAttribute('height', '22');
  closeIcon.setAttribute('aria-hidden', 'true'); closeIcon.setAttribute('focusable', 'false');
  const cross = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  cross.setAttribute('d', 'M6 6 18 18M18 6 6 18');
  cross.setAttribute('fill', 'none'); cross.setAttribute('stroke', 'currentColor');
  cross.setAttribute('stroke-width', '1.7'); cross.setAttribute('stroke-linecap', 'round');
  closeIcon.append(cross); closeButton.append(closeIcon);
  header.append(identity, closeButton);
  const progressWrap = node('div', { class: 'quiz-progress-wrap' });
  const progress = node('progress', { class: 'quiz-progress', max: 7, value: complete ? 7 : step + 1, 'aria-label': text('Прогресс подбора', 'Selection progress') });
  progressWrap.append(progress);
  const content = node('div', { class: 'quiz-content' });
  const heading = node('h2', { class: 'quiz-title', id: 'quiz-title', tabindex: '-1' }, complete ? copy[lang].successTitle : titles[lang][step]);
  content.append(heading);
  shell.append(header, progressWrap, content);
  if (complete) {
    content.append(node('p', { class: 'quiz-intro' }, copy[lang].successText));
    const actions = node('div', { class: 'quiz-actions' }); actions.append(button(text('Вернуться на сайт', 'Return to website'), 'quiz-primary', close)); shell.append(actions);
  } else if (step === 6) renderContact(content, shell);
  else {
    if (step === 0) renderRegions(content);
    if (step === 1) renderCities(content);
    if (step === 2) renderPropertyType(content);
    if (step === 3) renderBudget(content);
    if (step === 4 || step === 5) renderOriginalQuestion(content, step === 4 ? 'purpose' : 'timeline');
    const actions = node('div', { class: 'quiz-actions' });
    if (step > 0) actions.append(button(copy[lang].back, 'quiz-secondary', () => edit(step - 1)));
    const next = button(copy[lang].next + ' →', 'quiz-primary', () => { if (hasAnswer()) edit(step + 1); }); next.dataset.next = ''; next.disabled = !hasAnswer();
    actions.append(next); shell.append(actions);
  }
  dialog.replaceChildren(shell);
  if(step===3&&!complete)updatePriceStamp();
  if (dialog.open) {
    heading.focus({ preventScroll: true });
  }
}
function intro(content, ru, en) { content.append(node('p', { class: 'quiz-intro' }, text(ru, en))); }
function renderRegions(content) {
  intro(content, 'Выберите одно или несколько направлений. Затем уточним города и бюджет.', 'Choose one or more destinations. We will then refine the cities and budget.');
  const fieldset = node('fieldset', { class: 'quiz-options quiz-region-options', 'aria-labelledby': 'quiz-title' });
  for (const region of regions) fieldset.append(choice({ value: region.id, name: 'regions', multiple: true, label: region[lang], note: region.name !== region[lang] ? region.name : undefined, checked: selection.regions.includes(region.id), onChange(checked) {
    selection.regions = checked ? [...selection.regions, region.id] : selection.regions.filter(id => id !== region.id);
    selection.cities = selection.cities.filter(id => pricingData.some(row => row.cityId === id && selection.regions.includes(row.regionId)));
    selection.anyCityRegions = selection.anyCityRegions.filter(id => selection.regions.includes(id));
    if (checked) selection.anyCityRegions.push(region.id);
    invalidateBudget();
  } }));
  content.append(fieldset);
}
function renderCities(content) {
  intro(content, 'Оставьте весь регион или выберите конкретные города. Цены будут зависеть от вашего выбора.', 'Keep an entire region or choose specific cities. Price thresholds will follow your selection.');
  for (const regionId of selection.regions) {
    const group = node('fieldset', { class: 'quiz-city-group' }); group.append(node('legend', {}, regionName(regionId)));
    const choices = node('div', { class: 'quiz-options' });
    const syncChoices=()=>{
      for(const input of choices.querySelectorAll('input')){
        input.checked=input.name===`any-${regionId}`
          ?selection.anyCityRegions.includes(regionId)
          :selection.cities.includes(input.value);
      }
    };
    const any = choice({ value: regionId, name: `any-${regionId}`, multiple: true, label: text('Любой город в регионе', 'Any city in this region'), checked: selection.anyCityRegions.includes(regionId), onChange(checked) {
      selection.anyCityRegions = checked ? [...new Set([...selection.anyCityRegions, regionId])] : selection.anyCityRegions.filter(id => id !== regionId);
      if (checked) selection.cities = selection.cities.filter(id => !pricingData.some(row => row.cityId === id && row.regionId === regionId));
      invalidateBudget(); syncChoices();
    } }); choices.append(any);
    for (const city of pricingData.filter(row => row.regionId === regionId)) choices.append(choice({ value: city.cityId, name: `cities-${regionId}`, multiple: true, label: city.city, checked: selection.cities.includes(city.cityId), onChange(checked) {
      selection.anyCityRegions = selection.anyCityRegions.filter(id => id !== regionId);
      selection.cities = checked ? [...new Set([...selection.cities, city.cityId])] : selection.cities.filter(id => id !== city.cityId);
      invalidateBudget(); syncChoices();
    } }));
    group.append(choices); content.append(group);
  }
}
function renderPropertyType(content) {
  intro(content, 'Для квартир и вилл рассчитаем ориентир по выбранным городам. Другие типы обсудим индивидуально.', 'Apartments and villas have location based price thresholds. Other property types are discussed individually.');
  const fieldset = node('fieldset', { class: 'quiz-options quiz-property-options', 'aria-labelledby': 'quiz-title' });
  for (const [value, ru, en] of propertyTypes) fieldset.append(choice({ value, name: 'propertyType', label: text(ru, en), checked: selection.propertyType === value, onChange() { if (selection.propertyType !== value) invalidateBudget(); selection.propertyType = value; } }));
  content.append(fieldset);
}
function rangeLabel(range) { return range.max === null ? text(`От ${money(range.min)}`, `${money(range.min)} and above`) : range.min === 0 ? text(`До ${money(range.max)}`, `Up to ${money(range.max)}`) : `${money(range.min)} – ${money(range.max)}`; }
function renderBudget(content) {
  const generated = generateBudgetRanges(selection);
  intro(content, generated.ranges.length ? 'Можно выбрать один или несколько вариантов.' : 'Для этого типа недвижимости бюджет уточним при персональном подборе.', generated.ranges.length ? 'Choose one or more options.' : 'We will clarify the budget for this property type during your personal selection.');
  const edits = node('div', { class: 'quiz-edit-links' }); edits.append(button(text('Изменить побережье', 'Change coast'), 'quiz-text-button', () => edit(0)), button(text('Изменить тип', 'Change property type'), 'quiz-text-button', () => edit(2))); content.append(edits);
  const fieldset = node('fieldset', { class: 'quiz-options quiz-budget-options', 'aria-labelledby': 'quiz-title' });
  for (const range of generated.ranges) fieldset.append(choice({
    value: range.id, name: 'budget', multiple: true, label: rangeLabel(range),
    checked: budget?.ranges?.some(item => item.min === range.min && item.max === range.max),
    onChange(checked) {
      const current = budget?.ranges || [];
      const chosen = checked ? [...current, range] : current.filter(item => item.min !== range.min || item.max !== range.max);
      const ranges = selectedBudgetRanges(selection, chosen);
      budget = ranges.length ? { ranges } : null;
      budgetMode = ranges.length ? 'range' : '';
    }
  }));
  if(!generated.ranges.length)fieldset.append(choice({value:'deferred',name:'budget',label:text('Уточнить бюджет при подборе','Clarify budget during selection'),checked:budgetMode==='deferred',onChange(){budgetMode='deferred';budget={deferred:true};}}));
  content.append(fieldset);
}
function updatePriceStamp(){
  clearTimeout(priceStampTimer);
  const element=dialog.querySelector('#quiz-price-stamp');if(!element)return;
  const now=new Date(),stamp=dailyPriceStamp(now);
  element.textContent=stamp.label;element.dateTime=stamp.date+'T09:00';
  priceStampTimer=setTimeout(()=>{if(dialog.open&&step===3)updatePriceStamp();},Math.min(2147483647,nextPriceStampChange(now)-now.getTime()+10));
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&dialog.open&&step===3)updatePriceStamp();});
function renderOriginalQuestion(content, id) {
  intro(content, id === 'purpose' ? 'Это поможет понять, на что обратить внимание при подборе.' : 'Можно начать с онлайн-просмотров, если поездка пока не запланирована.', id === 'purpose' ? 'This helps us understand what matters most for your selection.' : 'You can start with online viewings if a visit is not planned yet.');
  const group = node('fieldset', { class: 'quiz-options quiz-options-single', 'aria-labelledby': 'quiz-title' });
  for (const [value, ru, en] of questionFor(id).options) group.append(choice({ value, name: id, label: text(ru, en), checked: (id === 'purpose' ? purpose : timeline) === value, onChange() { if (id === 'purpose') purpose = value; else timeline = value; } }));
  content.append(group);
  if (id === 'timeline') {
    const online = node('label', { class: 'quiz-expand-geography quiz-online-viewings' });
    const input = node('input', { type: 'checkbox', name: 'onlineViewings', id: 'quiz-online-viewings' });
    input.checked = onlineViewings;
    input.addEventListener('change', () => { onlineViewings = input.checked; persist(); });
    online.append(input, node('span', {}, text('Хочу смотреть объекты онлайн', 'I want to view properties online')),
      node('span', { class: 'quiz-popular', 'aria-hidden': 'true' }, text('Популярно', 'Popular')));
    content.append(online);
  }
}
function attribution() {
  const result = { source: 'cinematic-quiz' };
  const url = new URL(location.href);
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) if (url.searchParams.has(key)) result[key] = url.searchParams.get(key).slice(0, 200);
  // Keep origin/path only: arbitrary URL parameters can contain private information.
  result.landing = `${url.origin}${url.pathname}`.slice(0, 1024);
  try { if (document.referrer) { const referrer = new URL(document.referrer); result.referrer = `${referrer.origin}${referrer.pathname}`.slice(0, 1024); } } catch {}
  return result;
}
const initialAttribution = attribution();
function renderContact(content, shell) {
  const t = copy[lang];
  content.append(node('p', { class: 'quiz-intro' }, text('Укажите, удобный способ получения презентации. Получение презентации не является бронированием недвижимости или обязательством заключить сделку и носит исключительно информационный характер. Контактные данные брокеров указаны в презентации.', 'Select how you would like to receive the presentation. Receiving the presentation is not a booking or an obligation to conclude a transaction and is purely informational. Broker contact details are listed in the presentation.')));
  const form = node('form', { id: 'quiz-lead-form', novalidate: '', 'aria-labelledby': 'quiz-title' });
  const methods = node('fieldset', { class: 'quiz-options quiz-messengers', 'aria-label': t.messenger });
  for (const method of ['whatsapp', 'telegram', 'viber', 'phone']) {
    const option = choice({ value: method, name: 'messenger', label: contactMethodLabel(method, lang), checked: messenger === method, onChange() { messenger = method; render(); } });
    option.querySelector('.quiz-choice-mark').remove();
    option.insertBefore(messengerIcon(method), option.querySelector('.quiz-choice-words'));
    methods.append(option);
  }
  const nameLabel = node('label', { class: 'quiz-field' }, t.name);
  const nameInput = node('input', { id: 'quiz-name', name: 'name', type: 'text', placeholder: t.namePlaceholder, autocomplete: 'given-name', maxlength: 80, required: '', 'aria-describedby': 'quiz-error' }); nameInput.value = contactName;
  nameInput.addEventListener('input', () => { contactName = nameInput.value; nameInput.removeAttribute('aria-invalid'); error.textContent = ''; }); nameLabel.append(nameInput);
  const usesPhone = messenger !== 'telegram';
  const phoneState = phoneStates[messenger];
  const phoneLabel = messenger === 'whatsapp' ? t.phone : messenger === 'viber' ? text('Ваш номер Viber', 'Your Viber number') : text('Ваш номер телефона', 'Your phone number');
  const phonePlaceholder = messenger === 'whatsapp' ? t.nationalPlaceholder : messenger === 'viber' ? text('Номер Viber', 'Viber number') : text('Номер телефона', 'Phone number');
  const contactLabel = node('label', { class: 'quiz-field', for: 'quiz-contact' }, usesPhone ? phoneLabel : t.telegram);
  const input = node('input', { id: 'quiz-contact', name: 'contact', type: usesPhone ? 'tel' : 'text', autocomplete: usesPhone ? 'tel' : 'off', maxlength: 64, required: '', placeholder: usesPhone ? phonePlaceholder : '@username', 'aria-describedby': 'quiz-error' }); input.value = contactValues[messenger];
  input.addEventListener('input', () => { contactValues[messenger] = input.value; input.removeAttribute('aria-invalid'); error.textContent = ''; });
  if (usesPhone) {
    phoneState.hasInput = Boolean(input.value.trim());
    phoneField = createPhoneField({ input, lang, text: { ...t, nationalPlaceholder: phonePlaceholder }, state: phoneState, onCountry() {}, onInput: value => { contactValues[messenger] = value; }, onError: message => { error.textContent = message; input.setAttribute('aria-invalid', String(Boolean(message))); } });
    contactLabel.append(phoneField.row, phoneField.hint);
  } else { contactLabel.append(input, node('small', { class: 'quiz-hint' }, t.telegramHint)); }
  const consentLabel = node('label', { class: 'quiz-consent' });
  const checkbox = node('input', { id: 'quiz-consent', name: 'consent', type: 'checkbox', required: '', 'aria-describedby': 'quiz-error' }); checkbox.checked = consent;
  checkbox.addEventListener('change', () => { consent = checkbox.checked; error.textContent = ''; });
  const words = node('span'); words.append(document.createTextNode(t.consentBefore), node('a', { href: lang === 'en' ? '/en/privacy' : '/privacy', target: '_blank', rel: 'noopener noreferrer' }, t.consentLink), document.createTextNode(t.consentAfter)); consentLabel.append(checkbox, words);
  const trap = node('div', { class: 'quiz-trap', 'aria-hidden': 'true' }); trap.append(node('input', { name: 'website', type: 'text', tabindex: '-1', autocomplete: 'off' }));
  const error = node('p', { class: 'quiz-error', id: 'quiz-error', role: 'alert' });
  form.append(methods, nameLabel, contactLabel, consentLabel, trap, error); content.append(form);
  const actions = node('div', { class: 'quiz-actions' });
  const back = button(t.back, 'quiz-secondary', () => edit(5));
  const submit = node('button', { type: 'submit', class: 'quiz-primary', form: form.id }, text('Получить PDF', 'Get PDF'));
  actions.append(back, submit); shell.append(actions);
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (submitting) return;
    const name = normalizeName(nameInput.value);
    if (!name) { error.textContent = t.invalidName; nameInput.setAttribute('aria-invalid', 'true'); nameInput.focus(); return; }
    const raw = usesPhone ? await phoneField.value() : input.value.trim();
    if (!dialog.open || !form.isConnected || submitting) return;
    const phoneLike = typeof raw === 'string' && /^\+[\d\s()-]+$/.test(raw) && raw.replace(/\D/g, '').length >= 7 && raw.replace(/\D/g, '').length <= 15;
    if (!(phoneLike || messenger === 'telegram' && telegramUsername(raw || ''))) { error.textContent = usesPhone ? t.invalidPhone : t.invalidTelegram; input.setAttribute('aria-invalid', 'true'); input.focus(); return; }
    if (!checkbox.checked) { error.textContent = t.consentError; checkbox.focus(); return; }
    for (let index = 0; index < 6; index++) if (!hasAnswer(index)) { edit(index); return; }
    submitting = true; error.textContent = ''; submit.textContent = text('Сохраняем заявку…', 'Saving your request…'); submit.setAttribute('aria-busy', 'true');
    const controls = [...dialog.querySelectorAll('input,select,button')]; for (const control of controls) control.disabled = true;
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify({ requestId, name, language: lang, answers: { regions: selection.regions, propertyType: selection.propertyType, budgets: ['dynamic'], purpose, timeline, onlineViewings }, region: 'unspecified', messenger, contact: raw, ...(usesPhone ? { phoneCountry: phoneState.country } : {}), consent: { accepted: true, policyVersion }, website: trap.querySelector('input').value, pricing: { version: 1, ...selection, budget, crossRegionOptIn }, attribution: initialAttribution }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { error.textContent = response.status === 429 ? t.rateError : result.code === 'invalid_name' ? t.invalidName : result.code === 'invalid_contact' ? usesPhone ? t.invalidPhone : t.invalidTelegram : t.networkError; return; }
      if (result.success !== true || !result.leadId) throw new Error('unconfirmed');
      complete = true; contactName = ''; contactValues = { whatsapp: '', telegram: '', viber: '', phone: '' }; consent = true;
      try { sessionStorage.removeItem(storageKey); } catch {}
      window.dispatchEvent(new CustomEvent('lead_saved', { detail: { source: 'cinematic-quiz' } }));
      window.dataLayer?.push({ event: 'lead_saved', lead_source: 'cinematic-quiz' });
      if (rememberSavedLead(result, lang)) { location.assign(THANK_YOU_PATH); return; }
      render();
    } catch { error.textContent = t.networkError; }
    finally { clearTimeout(timeout); submitting = false; if (!complete) { for (const control of controls) control.disabled = false; submit.removeAttribute('aria-busy'); submit.textContent = text('Получить PDF', 'Get PDF'); } }
  });
}
function updateViewport() {
  if (!dialog.open) return;
  const viewport = window.visualViewport;
  dialog.style.setProperty('--quiz-visible-height', `${Math.floor(viewport?.height || innerHeight)}px`);
  dialog.style.setProperty('--quiz-viewport-top', `${Math.max(0, viewport?.offsetTop || 0)}px`);
  cancelAnimationFrame(viewportFrame);
  viewportFrame = requestAnimationFrame(() => {
    const active = document.activeElement;
    const content = active?.closest?.('.quiz-content');
    if (!content || !active.matches('input:not([type=radio]):not([type=checkbox]),select')) return;
    const field = active.getBoundingClientRect(); const area = content.getBoundingClientRect();
    if (field.bottom > area.bottom - 16) content.scrollTop += field.bottom - area.bottom + 16;
    else if (field.top < area.top + 16) content.scrollTop -= area.top + 16 - field.top;
  });
}
window.visualViewport?.addEventListener('resize', updateViewport);
window.visualViewport?.addEventListener('scroll', updateViewport);
window.addEventListener('resize', updateViewport);
dialog.addEventListener('focusin', updateViewport);
function openQuiz(event) {
  if (dialog.open) return;
  const presetRegion = event?.currentTarget?.dataset.presetRegion;
  if (regions.some(region => region.id === presetRegion)) {
    const presetType = event.currentTarget.dataset.presetPropertyType === 'villa' ? 'villa' : 'apartment';
    if (selection.regions.length !== 1 || selection.regions[0] !== presetRegion || selection.propertyType !== presetType) invalidateBudget();
    selection.regions = [presetRegion];
    selection.cities = selection.cities.filter(id => pricingData.some(row => row.cityId === id && row.regionId === presetRegion));
    selection.anyCityRegions = selection.anyCityRegions.filter(id => id === presetRegion);
    selection.propertyType = presetType;
    step = 1;
    persist();
  }
  focusBefore = document.activeElement; scrollY = window.scrollY;
  document.body.style.setProperty('--quiz-page-scroll-offset', `${-scrollY}px`);
  document.documentElement.classList.add('quiz-open'); document.body.classList.add('quiz-open');
  render(); dialog.showModal(); updateViewport(); dialog.querySelector('#quiz-title')?.focus({ preventScroll: true });
}
for (const trigger of document.querySelectorAll('[data-open-quiz]')) trigger.addEventListener('click', openQuiz);
if (isThankYouPath(location.pathname)) {
  const receipt = receiptFromSession();
  if (!receipt) location.replace('/');
  else { lang = receipt.language; complete = true; openQuiz(); }
}

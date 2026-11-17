import { THANK_YOU_PATH, isThankYouPath, receiptFromSession, rememberSavedLead } from './lead-receipt.mjs';
import { steps as originalQuestions, copy, policyVersion } from './quiz.config.mjs';
import { telegramUsername, normalizeName } from './contact.mjs';
import { createPhoneField } from './phone-field.mjs';
import { regions, pricingData, priceSource, generateBudgetRanges, createPricingSummary, formatMoney } from './pricing.mjs';

const storageKey = 'spain-property-cinematic-quiz-v1';
const titles = {
  ru: ['Какое побережье вам ближе?', 'Какие города рассмотрим?', 'Что вы ищете?', 'Ваш бюджет на недвижимость', 'Для чего вы выбираете дом?', 'Когда планируете приехать?', 'Обсудим вашу подборку'],
  en: ['Which coast feels like home?', 'Which cities shall we consider?', 'What are you looking for?', 'Your property budget', 'What is your reason for buying?', 'When are you planning to visit?', 'Let’s discuss your selection']
};
const stageNames = { ru: ['Побережье', 'Города', 'Тип объекта', 'Бюджет', 'Цель', 'Приезд', 'Контакт'], en: ['Coast', 'Cities', 'Property', 'Budget', 'Purpose', 'Visit', 'Contact'] };
let lang = document.documentElement.lang === 'en' ? 'en' : 'ru';
const text = (ru, en) => lang === 'en' ? en : ru;
const money = value => formatMoney(value, lang);
let step = 0;
let selection = { regions: [], cities: [], anyCityRegions: [], propertyType: '' };
let budget = null;
let budgetMode = '';
let purpose = '';
let timeline = '';
let crossRegionOptIn = false;
let contactName = '';
let contactValues = { whatsapp: '', telegram: '' };
let messenger = 'whatsapp';
let consent = false;
let submitting = false;
let complete = false;
let requestId = crypto.randomUUID();
let focusBefore;
let phoneField;
let scrollY = 0;
let viewportFrame;
const phoneState = { country: 'ES', source: 'fallback', hasInput: false };
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
    crossRegionOptIn = saved.crossRegionOptIn === true;
    const ranges = generateBudgetRanges(selection).ranges;
    if (saved.budget?.custom === true && Number.isFinite(saved.budget.min) && saved.budget.min >= 0 && saved.budget.min === saved.budget.max) {
      budget = saved.budget; budgetMode = 'custom';
    } else if (ranges.some(range => range.min === saved.budget?.min && range.max === saved.budget?.max)) {
      budget = saved.budget; budgetMode = 'range';
    }
    if (/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(saved.requestId)) requestId = saved.requestId;
    step = Math.min(6, Math.max(0, Number.isInteger(saved.step) ? saved.step : 0));
  }
} catch { /* Selection restoration is optional; contacts are never stored. */ }
function persist() {
  try { sessionStorage.setItem(storageKey, JSON.stringify({ policyVersion, selection, budget, budgetMode, purpose, timeline, crossRegionOptIn, step, requestId })); } catch {}
}
function invalidateBudget() { budget = null; budgetMode = ''; crossRegionOptIn = false; }
function validCities() { return selection.regions.length > 0 && selection.regions.every(id => selection.anyCityRegions.includes(id) || selection.cities.some(city => pricingData.some(row => row.cityId === city && row.regionId === id))); }
function hasAnswer(index = step) {
  return [selection.regions.length > 0, validCities(), Boolean(selection.propertyType), Boolean(budget && Number.isFinite(budget.min) && budget.min >= 0), Boolean(purpose), Boolean(timeline), true][index];
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
  phoneField?.cancel(); phoneField = undefined; cancelAnimationFrame(viewportFrame);
  document.documentElement.classList.remove('quiz-open'); document.body.classList.remove('quiz-open');
  document.body.style.removeProperty('--quiz-page-scroll-offset');
  window.scrollTo({ top: scrollY, behavior: 'instant' });
  focusBefore?.focus({ preventScroll: true });
  if (complete) {
    if (isThankYouPath(location.pathname)) { location.replace('/'); return; }
    selection = { regions: [], cities: [], anyCityRegions: [], propertyType: '' }; budget = null; budgetMode = ''; purpose = ''; timeline = ''; step = 0;
    contactName = ''; contactValues = { whatsapp: '', telegram: '' }; consent = false; complete = false; crossRegionOptIn = false; requestId = crypto.randomUUID();
    try { sessionStorage.removeItem(storageKey); } catch {}
  }
});
function choice({ value, label, checked, multiple = false, name, note, onChange }) {
  const wrapper = node('label', { class: 'quiz-choice' });
  const input = node('input', { type: multiple ? 'checkbox' : 'radio', name, value }); input.checked = checked;
  const words = node('span', { class: 'quiz-choice-words' }); words.append(node('span', {}, label));
  if (note) words.append(node('small', {}, note));
  wrapper.append(input, words, node('span', { class: 'quiz-choice-mark', 'aria-hidden': 'true' }, multiple ? '✓' : ''));
  input.addEventListener('change', () => { onChange(input.checked); persist(); updateNext(); });
  return wrapper;
}
function updateNext() { const next = dialog.querySelector('[data-next]'); if (next) next.disabled = !hasAnswer(); }
function edit(index) { step = index; persist(); render(); }
function render({ focusChoice } = {}) {
  phoneField?.cancel(); phoneField = undefined;
  dialog.lang = lang; dialog.dataset.stage = complete ? 'success' : step === 6 ? 'contact' : `question-${step}`;
  const shell = node('div', { class: 'quiz-shell' });
  const header = node('div', { class: 'quiz-top' });
  const identity = node('div', { class: 'quiz-brand' });
  identity.append(node('img', { src: '/assets/logo-white.svg', width: 205, height: 46, alt: 'Spain Property for Sale' }));
  const closeButton = button('×', 'quiz-close', close); closeButton.setAttribute('aria-label', copy[lang].close);
  header.append(identity, node('p', { class: 'quiz-top-note' }, text('Ваше место в Испании', 'Your place in Spain')), closeButton);
  const progressWrap = node('div', { class: 'quiz-progress-wrap' });
  const progress = node('progress', { class: 'quiz-progress', max: 7, value: complete ? 7 : step + 1, 'aria-label': text('Прогресс подбора', 'Selection progress') });
  progressWrap.append(progress, node('span', {}, complete ? text('Заявка сохранена', 'Request saved') : `${stageNames[lang][step]} · ${step + 1} / 7`));
  const content = node('div', { class: 'quiz-content' });
  const heading = node('h2', { class: 'quiz-title', id: 'quiz-title', tabindex: '-1' }, complete ? copy[lang].successTitle : titles[lang][step]);
  content.append(heading);
  shell.append(header, progressWrap, content);
  if (complete) {
    content.append(node('p', { class: 'quiz-intro' }, text('Ваш запрос сохранён. Свяжемся с вами выбранным способом, чтобы уточнить критерии и подготовить подборку.', 'Your request has been saved. We will contact you using your chosen method to refine your criteria and prepare a selection.')));
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
    else actions.append(node('span', { class: 'quiz-action-note' }, text('Можно выбрать несколько', 'Multiple choices welcome')));
    const next = button(copy[lang].next + ' →', 'quiz-primary', () => { if (hasAnswer()) edit(step + 1); }); next.dataset.next = ''; next.disabled = !hasAnswer();
    actions.append(next); shell.append(actions);
  }
  dialog.replaceChildren(shell);
  if (dialog.open) {
    const choice = focusChoice && [...dialog.querySelectorAll('.quiz-choice input')].find(input => input.name === focusChoice.name && input.value === focusChoice.value);
    (choice || heading).focus({ preventScroll: true });
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
    const any = choice({ value: regionId, name: `any-${regionId}`, multiple: true, label: text('Любой город в регионе', 'Any city in this region'), checked: selection.anyCityRegions.includes(regionId), onChange(checked) {
      selection.anyCityRegions = checked ? [...new Set([...selection.anyCityRegions, regionId])] : selection.anyCityRegions.filter(id => id !== regionId);
      if (checked) selection.cities = selection.cities.filter(id => !pricingData.some(row => row.cityId === id && row.regionId === regionId));
      invalidateBudget(); persist(); render({ focusChoice: { name: `any-${regionId}`, value: regionId } });
    } }); choices.append(any);
    for (const city of pricingData.filter(row => row.regionId === regionId)) choices.append(choice({ value: city.cityId, name: `cities-${regionId}`, multiple: true, label: city.city, checked: selection.cities.includes(city.cityId), onChange(checked) {
      selection.anyCityRegions = selection.anyCityRegions.filter(id => id !== regionId);
      selection.cities = checked ? [...new Set([...selection.cities, city.cityId])] : selection.cities.filter(id => id !== city.cityId);
      invalidateBudget(); persist(); render({ focusChoice: { name: `cities-${regionId}`, value: city.cityId } });
    } }));
    group.append(choices); content.append(group);
  }
}
function renderPropertyType(content) {
  intro(content, 'Для квартир и вилл рассчитаем ориентир по выбранным городам. Другие типы обсудим индивидуально.', 'Apartments and villas have location based price thresholds. Other property types are discussed individually.');
  const fieldset = node('fieldset', { class: 'quiz-options', 'aria-labelledby': 'quiz-title' });
  for (const [value, ru, en] of propertyTypes) fieldset.append(choice({ value, name: 'propertyType', label: text(ru, en), checked: selection.propertyType === value, onChange() { if (selection.propertyType !== value) invalidateBudget(); selection.propertyType = value; } }));
  content.append(fieldset);
}
function rangeLabel(range) { return range.max === null ? text(`От ${money(range.min)}`, `${money(range.min)} and above`) : `${money(range.min)} – ${money(range.max)}`; }
function renderBudget(content) {
  const generated = generateBudgetRanges(selection);
  intro(content, generated.minimum === null ? 'В таблице нет цен для этого типа недвижимости. Укажите свой бюджет, и мы уточним критерии индивидуально.' : `Ориентир начинается от ${money(generated.minimum)}. Для региона без выбранного города это порог в отдельных городах, а не на всём побережье.`, generated.minimum === null ? 'The table has no thresholds for this property type. Enter your budget and we will refine your criteria individually.' : `Indicative thresholds start at ${money(generated.minimum)}. For an entire region, this applies to individual listed cities, not every location.`);
  const edits = node('div', { class: 'quiz-edit-links' }); edits.append(button(text('Изменить географию', 'Change locations'), 'quiz-text-button', () => edit(0)), button(text('Изменить тип', 'Change property type'), 'quiz-text-button', () => edit(2))); content.append(edits);
  const fieldset = node('fieldset', { class: 'quiz-options', 'aria-labelledby': 'quiz-title' });
  const feedback = node('div', { class: 'quiz-budget-feedback', 'aria-live': 'polite', 'aria-atomic': 'false' });
  for (const range of generated.ranges) fieldset.append(choice({ value: range.id, name: 'budget', label: rangeLabel(range), checked: budgetMode === 'range' && budget?.min === range.min && budget?.max === range.max, onChange() { budgetMode = 'range'; budget = { min: range.min, max: range.max, custom: false }; customInput.disabled = true; customInput.value = ''; updateFeedback(feedback); } }));
  fieldset.append(choice({ value: 'custom', name: 'budget', label: text('Укажу свой бюджет', 'Enter my own budget'), note: text('Можно указать сумму ниже ориентира', 'Amounts below the threshold are welcome'), checked: budgetMode === 'custom', onChange() { budgetMode = 'custom'; budget = null; customInput.disabled = false; customInput.focus(); updateFeedback(feedback); } }));
  const customLabel = node('label', { class: 'quiz-custom-budget' }, text('Сумма в евро', 'Amount in euros'));
  const customInput = node('input', { type: 'text', inputmode: 'numeric', id: 'quiz-custom-budget', name: 'customBudget', placeholder: '200 000', autocomplete: 'off', 'aria-describedby': 'quiz-budget-source' });
  customInput.disabled = budgetMode !== 'custom'; customInput.value = budgetMode === 'custom' && budget ? String(budget.min) : '';
  customInput.addEventListener('input', () => {
    const value = customInput.value.replace(/[\s\u00a0]/g, '').replace(',', '.');
    const amount = /^\d+(?:\.\d{1,2})?$/.test(value) ? Number(value) : NaN;
    budget = Number.isFinite(amount) && amount >= 0 && amount <= 100000000000 ? { min: amount, max: amount, custom: true } : null;
    customInput.setAttribute('aria-invalid', String(Boolean(value) && !budget)); persist(); updateNext(); updateFeedback(feedback);
  }); customLabel.append(customInput); content.append(fieldset, customLabel, feedback);
  content.append(node('p', { class: 'quiz-source-note', id: 'quiz-budget-source' }, text(`Пороговые цены из таблицы заказчика от ${priceSource.date}. Диапазоны созданы для выбора бюджета. Это не наличие объектов и не обещание предложения по указанной цене.`, `Indicative thresholds from the supplied table dated ${priceSource.date}. Ranges are budget categories, not available listings or an offer at these prices.`)));
  updateFeedback(feedback);
}
function updateFeedback(container) {
  container.replaceChildren();
  if (!budget) return;
  const summary = createPricingSummary(selection, budget, { allowOtherRegions: crossRegionOptIn });
  const title = summary.belowMinimum ? text('Бюджет ниже ориентира. Заявку можно отправить.', 'Below the threshold. You can still send your request.') : summary.ineligible.length ? text('Бюджет подходит не для всех выбранных направлений.', 'This budget does not reach every selected threshold.') : summary.missingData ? text('Уточним стоимость индивидуально.', 'We will clarify pricing individually.') : text('Сохраним этот бюджет для подбора.', 'We will use this budget for your selection.');
  container.append(node('p', { class: `quiz-budget-status${summary.belowMinimum ? ' is-low' : ''}` }, title));
  if (summary.belowMinimum) container.append(node('p', {}, text(`Для выбранной локации и типа ориентир начинается от ${money(summary.minimum)}. Можем рассмотреть другие направления или уточнить критерии на консультации.`, `For your location and property type, indicative prices start at ${money(summary.minimum)}. We can discuss other locations or refine your criteria in a consultation.`)));
  if (summary.eligible.length || summary.ineligible.length) {
    const details = node('details', { class: 'quiz-price-details' });
    details.append(node('summary', {}, text('Пороги по городам и типам', 'City and property thresholds')));
    const list = node('ul', { class: 'quiz-threshold-list' });
    for (const entry of [...summary.eligible, ...summary.ineligible]) {
      const item = node('li');
      const note = lang === 'en' ? entry.noteEn : entry.note;
      item.append(node('span', {}, `${entry.city} · ${typeName(entry.type)}${note ? ` (${note})` : ''}`), node('strong', {}, `${money(entry.minimum)} · ${summary.eligible.includes(entry) ? text('порог достигнут', 'threshold reached') : text('выше бюджета', 'above budget')}`)); list.append(item);
    }
    details.append(list, node('p', { class: 'quiz-hint' }, budget.custom ? text('Сравнение с вашей суммой. Наличие объектов не подтверждено.', 'Compared with your amount. Listing availability is not confirmed.') : text('Для диапазона учитывается верхняя граница без включения. Для открытого диапазона используется нижняя. Наличие объектов не подтверждено.', 'For a range, the exclusive upper boundary is used; for an open range, its lower boundary. Availability is not confirmed.'))); container.append(details);
  }
  if (summary.ineligible.length) {
    if (summary.alternatives.length) {
      container.append(node('h3', { class: 'quiz-alternatives-title' }, text('Альтернативы по ценовому порогу', 'Alternatives by price threshold')));
      const list = node('ul', { class: 'quiz-alternative-list' });
      for (const item of summary.alternatives) list.append(node('li', {}, `${item.city} · ${typeName(item.type)} · ${text('от', 'from')} ${money(item.minimum)}${item.note ? ` (${lang === 'en' ? item.noteEn : item.note})` : ''}`));
      container.append(list);
    } else container.append(node('p', { class: 'quiz-hint' }, text('В выбранных регионах других подходящих порогов в таблице нет.', 'The table has no other matching thresholds in the selected regions.')));
    const label = node('label', { class: 'quiz-expand-geography' }); const input = node('input', { type: 'checkbox' }); input.checked = crossRegionOptIn;
    input.addEventListener('change', () => { crossRegionOptIn = input.checked; persist(); updateFeedback(container); container.querySelector('.quiz-expand-geography input')?.focus({ preventScroll: true }); });
    label.append(input, node('span', {}, text('Показать альтернативы в других регионах', 'Show alternatives in other regions'))); container.append(label);
  }
}
function renderOriginalQuestion(content, id) {
  intro(content, id === 'purpose' ? 'Это поможет понять, на что обратить внимание при подборе.' : 'Можно начать с онлайн-просмотров, если поездка пока не запланирована.', id === 'purpose' ? 'This helps us understand what matters most for your selection.' : 'You can start with online viewings if a visit is not planned yet.');
  const group = node('fieldset', { class: 'quiz-options quiz-options-single', 'aria-labelledby': 'quiz-title' });
  for (const [value, ru, en] of questionFor(id).options) group.append(choice({ value, name: id, label: text(ru, en), checked: (id === 'purpose' ? purpose : timeline) === value, onChange() { if (id === 'purpose') purpose = value; else timeline = value; } }));
  content.append(group);
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
  intro(content, 'Оставьте контакт. Подготовим подборку по вашим ответам и уточним детали поиска.', 'Leave a contact. We will prepare a selection using your answers and refine the details.');
  const summary = node('details', { class: 'quiz-selection-summary' }); summary.append(node('summary', {}, text('Ваши критерии', 'Your criteria')));
  summary.append(node('p', {}, `${selection.regions.map(regionName).join(', ')} · ${typeName(selection.propertyType)} · ${budget ? budget.custom ? money(budget.min) : rangeLabel(budget) : ''}`));
  summary.append(node('p', {}, `${labelFor('purpose', purpose)}. ${labelFor('timeline', timeline)}.`)); content.append(summary);
  const form = node('form', { id: 'quiz-lead-form', novalidate: '', 'aria-labelledby': 'quiz-title' });
  const methods = node('fieldset', { class: 'quiz-options quiz-messengers', 'aria-label': t.messenger });
  for (const method of ['whatsapp', 'telegram']) methods.append(choice({ value: method, name: 'messenger', label: method === 'whatsapp' ? 'WhatsApp' : 'Telegram', checked: messenger === method, onChange() { messenger = method; render(); } }));
  const nameLabel = node('label', { class: 'quiz-field' }, t.name);
  const nameInput = node('input', { id: 'quiz-name', name: 'name', type: 'text', placeholder: t.namePlaceholder, autocomplete: 'given-name', maxlength: 80, required: '', 'aria-describedby': 'quiz-error' }); nameInput.value = contactName;
  nameInput.addEventListener('input', () => { contactName = nameInput.value; nameInput.removeAttribute('aria-invalid'); error.textContent = ''; }); nameLabel.append(nameInput);
  const contactLabel = node('label', { class: 'quiz-field', for: 'quiz-contact' }, messenger === 'whatsapp' ? t.phone : t.telegram);
  const input = node('input', { id: 'quiz-contact', name: 'contact', type: messenger === 'whatsapp' ? 'tel' : 'text', autocomplete: messenger === 'whatsapp' ? 'tel' : 'off', maxlength: 64, required: '', placeholder: messenger === 'whatsapp' ? t.nationalPlaceholder : '@username', 'aria-describedby': 'quiz-error' }); input.value = contactValues[messenger];
  input.addEventListener('input', () => { contactValues[messenger] = input.value; input.removeAttribute('aria-invalid'); error.textContent = ''; });
  if (messenger === 'whatsapp') {
    phoneState.hasInput = Boolean(input.value.trim());
    phoneField = createPhoneField({ input, lang, text: t, state: phoneState, onCountry() {}, onInput: value => { contactValues.whatsapp = value; }, onError: message => { error.textContent = message; input.setAttribute('aria-invalid', String(Boolean(message))); } });
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
  const submit = node('button', { type: 'submit', class: 'quiz-primary', form: form.id }, text('Получить подборку →', 'Request selection →'));
  actions.append(back, submit); shell.append(actions);
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (submitting) return;
    const name = normalizeName(nameInput.value);
    if (!name) { error.textContent = t.invalidName; nameInput.setAttribute('aria-invalid', 'true'); nameInput.focus(); return; }
    const raw = messenger === 'whatsapp' ? await phoneField.value() : input.value.trim();
    if (!dialog.open || !form.isConnected || submitting) return;
    const phoneLike = typeof raw === 'string' && /^\+[\d\s()-]+$/.test(raw) && raw.replace(/\D/g, '').length >= 7 && raw.replace(/\D/g, '').length <= 15;
    if (!(phoneLike || messenger === 'telegram' && telegramUsername(raw || ''))) { error.textContent = messenger === 'whatsapp' ? t.invalidPhone : t.invalidTelegram; input.setAttribute('aria-invalid', 'true'); input.focus(); return; }
    if (!checkbox.checked) { error.textContent = t.consentError; checkbox.focus(); return; }
    for (let index = 0; index < 6; index++) if (!hasAnswer(index)) { edit(index); return; }
    submitting = true; error.textContent = ''; submit.textContent = text('Сохраняем заявку…', 'Saving your request…'); submit.setAttribute('aria-busy', 'true');
    const controls = [...dialog.querySelectorAll('input,select,button')]; for (const control of controls) control.disabled = true;
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify({ requestId, name, language: lang, answers: { regions: selection.regions, propertyType: selection.propertyType, budgets: ['dynamic'], purpose, timeline }, region: 'unspecified', messenger, contact: raw, ...(messenger === 'whatsapp' ? { phoneCountry: phoneState.country } : {}), consent: { accepted: true, policyVersion }, website: trap.querySelector('input').value, pricing: { version: 1, ...selection, budget, crossRegionOptIn }, attribution: initialAttribution }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { error.textContent = response.status === 429 ? t.rateError : result.code === 'invalid_name' ? t.invalidName : result.code === 'invalid_contact' ? messenger === 'whatsapp' ? t.invalidPhone : t.invalidTelegram : t.networkError; return; }
      if (result.success !== true || !result.leadId) throw new Error('unconfirmed');
      complete = true; contactName = ''; contactValues = { whatsapp: '', telegram: '' }; consent = false;
      try { sessionStorage.removeItem(storageKey); } catch {}
      window.dispatchEvent(new CustomEvent('lead_saved', { detail: { source: 'cinematic-quiz' } }));
      window.dataLayer?.push({ event: 'lead_saved', lead_source: 'cinematic-quiz' });
      if (rememberSavedLead(result, lang)) { location.assign(THANK_YOU_PATH); return; }
      render();
    } catch { error.textContent = t.networkError; }
    finally { clearTimeout(timeout); submitting = false; if (!complete) { for (const control of controls) control.disabled = false; submit.removeAttribute('aria-busy'); submit.textContent = text('Получить подборку →', 'Request selection →'); } }
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

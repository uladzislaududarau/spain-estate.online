import { pricingData, regions } from '../showcase/assets/property-prices.mjs';

const euro = value => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value) + ' €';
const typeLabel = type => ({ apartment: 'Квартира / апартаменты', villa: 'Вилла / дом', both: 'Квартира и вилла', penthouse: 'Пентхаус', townhouse: 'Таунхаус', commercial: 'Коммерческая недвижимость' })[type] || type;
export function cityLabel(cityId) {
  const row = pricingData.find(row => row.cityId === cityId);
  return row?.city || row?.cityName || row?.name || cityId;
}
export function regionLabel(regionId) {
  const row = regions.find(row => row.id === regionId);
  return row?.name || row?.label || regionId;
}
function matchLabel(match) {
  return `${cityLabel(match.cityId)} · ${typeLabel(match.type)} · от ${euro(match.minimum)}${match.note ? ` (${match.note})` : ''}`;
}
export function pricingLines(pricing) {
  if (!pricing) return [];
  const budget = pricing.budget;
  const formatRange = range => range.max === null ? `от ${euro(range.min)}` : range.max === range.min ? euro(range.min) : `${euro(range.min)} — ${euro(range.max)}`;
  const range = budget.deferred ? 'Уточнить при подборе' : budget.ranges ? budget.ranges.map(formatRange).join('; ') : formatRange(budget);
  return [
    `Города: ${pricing.cities.length ? pricing.cities.map(cityLabel).join(', ') + (pricing.anyCityRegions?.length ? '; любой город: ' + pricing.anyCityRegions.map(regionLabel).join(', ') : '') : 'Любой город в выбранных регионах'}`,
    `Тип для расчёта: ${typeLabel(pricing.propertyType)}`,
    `Бюджет покупателя: ${range}${budget.custom ? ' (ручной ввод)' : ''}`,
    `Минимальный ориентир таблицы: ${pricing.minimum === null ? 'Нет данных' : euro(pricing.minimum)}`,
    `Соответствие порогу: ${pricing.minimum === null ? 'Не определено, нужна консультация' : pricing.belowMinimum ? 'Ниже ориентира, заявка принимается' : 'Достигает ориентира в отдельных выбранных городах'}`,
    `Пороги выбранных городов: ${[...pricing.eligible, ...(pricing.ineligible || [])].map(entry => matchLabel(entry) + (entry.meetsThreshold ? ' [достигает]' : ' [ниже]')).join('; ') || 'Нет данных для выбранного типа'}`,
    `Альтернативы по цене: ${pricing.alternatives.length ? pricing.alternatives.map(matchLabel).join('; ') : 'Не показаны'}`,
    `Расширение географии: ${pricing.crossRegionOptIn ? 'Разрешено покупателем' : 'Только выбранные регионы'}`,
    `Источник цен: ${pricing.source}. Ориентиры, не наличие объектов.`
  ];
}
export function attributionLines(attribution) {
  return Object.entries(attribution || {}).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`);
}

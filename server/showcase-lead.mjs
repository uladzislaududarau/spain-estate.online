// Заявки с витрины объектов (site/persiana): короткая форма без квиза.
// Список объектов синхронизирован с site/shared/data.mjs; цены — для письма оператору.
export const showcaseProperties = {
  'nature-resort': { name: 'Nature Resort', price: 'от €199 900' },
  'horizon-ii': { name: 'Horizon II Resort', price: 'от €219 900' },
  'coronella-living': { name: 'Coronella Living', price: 'от €272 000' },
  'villas-de-la-sal': { name: 'Villas de la Sal', price: '€429 900' },
  'tm-tower': { name: 'TM Tower', price: 'от €607 000' }
};
export const showcaseLeadTypes = ['property_presentation', 'catalog_access'];
export const isShowcaseLead = lead => lead?.kind === 'showcase';
export function showcaseRequest(lead) {
  if (lead.leadType === 'catalog_access') return 'Доступ ко всем объектам';
  const property = showcaseProperties[lead.property];
  return `Презентация объекта: ${property ? `${property.name} (${property.price})` : lead.property}`;
}

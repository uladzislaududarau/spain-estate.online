/** Price thresholds supplied in the user's additional brief, not live inventory. */
export const priceSource = Object.freeze({
  id: 'user-provided-price-table-2026-11-16',
  date: '2026-11-16',
  currency: 'EUR',
  description: 'Ориентировочные минимальные пороги из таблицы заказчика. Не каталог объектов.',
  originalTableAvailable: false,
  geographyStatus: 'Names reproduced from the 21-row control table; no separate original spreadsheet supplied.'
});

export const regions = Object.freeze([
  { id: 'costa-brava', name: 'Costa Brava', ru: 'Коста-Брава', en: 'Costa Brava' },
  { id: 'costa-barcelona', name: 'Costa de Barcelona', ru: 'Барселона', en: 'Costa de Barcelona' },
  { id: 'costa-dorada', name: 'Costa Daurada', ru: 'Коста-Дорада', en: 'Costa Daurada' },
  { id: 'valencia', name: 'Costa de Valencia', ru: 'Валенсия', en: 'Costa de Valencia' },
  { id: 'costa-blanca', name: 'Costa Blanca', ru: 'Коста-Бланка', en: 'Costa Blanca' },
  { id: 'costa-calida', name: 'Costa Cálida', ru: 'Коста-Калида', en: 'Costa Cálida' },
  { id: 'costa-del-sol', name: 'Costa del Sol', ru: 'Коста-дель-Соль', en: 'Costa del Sol' },
  { id: 'mallorca', name: 'Balearic Coast', ru: 'Балеарские острова', en: 'Balearic Coast' },
  { id: 'canary-coast', name: 'Canary Coast', ru: 'Канарские острова', en: 'Canary Coast' }
].map(Object.freeze));

const rows = [
  ['costa-brava', 'lloret-de-mar', 'Lloret de Mar', 200000, 500000],
  ['costa-barcelona', 'barcelona', 'Barcelona', 350000, 1000000, 'пригород Барселоны', 'Barcelona suburbs'],
  ['costa-dorada', 'tarragona', 'Tarragona', 200000, 400000],
  ['valencia', 'valencia', 'Valencia', 280000, 550000, 'пригород Валенсии', 'Valencia suburbs'],
  ['valencia', 'gandia', 'Gandia', 200000, 450000],
  ['costa-blanca', 'alicante', 'Alicante', 250000, 450000],
  ['costa-blanca', 'elche', 'Elche', 150000, 300000],
  ['costa-blanca', 'torrevieja', 'Torrevieja', 150000, 250000],
  ['costa-blanca', 'orihuela-costa', 'Orihuela (Costa)', 180000, 300000],
  ['costa-blanca', 'benidorm', 'Benidorm', 250000, 550000, 'Finestrat рядом с Benidorm', 'Finestrat near Benidorm'],
  ['costa-blanca', 'elda', 'Elda', 120000, 200000],
  ['costa-blanca', 'san-juan-de-alicante', 'San Juan de Alicante', 300000, 550000],
  ['costa-blanca', 'campello', 'Campello', 280000, 500000],
  ['costa-blanca', 'javea', 'Jávea', 350000, 700000],
  ['costa-blanca', 'guardamar-del-segura', 'Guardamar del Segura', 200000, 350000],
  ['costa-calida', 'murcia', 'Murcia', 160000, 280000],
  ['costa-del-sol', 'malaga', 'Málaga', 350000, 900000],
  ['costa-del-sol', 'fuengirola', 'Fuengirola', 350000, 800000],
  ['costa-del-sol', 'estepona', 'Estepona', 330000, 850000],
  ['mallorca', 'palma-de-mallorca', 'Palma de Mallorca', 400000, 1200000],
  ['canary-coast', 'las-palmas-de-gran-canaria', 'Las Palmas de Gran Canaria', 280000, 550000]
];

export const pricingData = Object.freeze(rows.map(([regionId, cityId, city, apartmentMin, villaMin, villaLocationNote, villaLocationNoteEn]) => Object.freeze({
  id: `${regionId}:${cityId}`, regionId, cityId, city,
  apartmentMin, villaMin,
  ...(villaLocationNote ? { villaLocationNote, villaLocationNoteEn } : {})
})));

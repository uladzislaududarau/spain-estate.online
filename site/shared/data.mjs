// Публичные данные пяти объектов. Источник — OBJECTS.ru.md и прайсы пакета (28.11.2026).
// Сюда не попадают внутренние прайсы, комиссии, имена застройщиков и чужие контакты.
import { readFileSync } from 'node:fs';

export const BRAND = 'Spain Property for Sale';
const media = JSON.parse(readFileSync(new URL('./media.json', import.meta.url)));
const POOL = 'Бассейн — дополнительная опция';
const SM = 'Сан-Мигель-де-Салинас';

const img = (id, caption, alt, extra = {}) => ({ id, caption, alt, ...extra });

export const properties = [
  {
    slug: 'nature-resort', name: 'Nature Resort', type: 'Апартаменты', city: SM, cityShort: 'Сан-Мигель',
    price: 199900, from: true, qualifier: 'без налогов',
    beds: '2–3', baths: '2', area: '65,44', areaFrom: true, areaNote: 'строительная площадь', sea: '10 км', handover: 'Сентябрь 2028', handoverShort: '09.2028',
    summary: 'Апартаменты с просторными террасами и частными садами на первом этаже. Закрытый комплекс на 67 квартир с бассейнами и зелёными зонами.',
    highlights: ['Бассейны для взрослых и детей', 'Частные сады у квартир первого этажа', 'Аэротермия, двойное остекление, встроенные шкафы'],
    facts: [['Этажей', '8'], ['Квартир', '67'], ['Гольф Las Colinas', '7 км'], ['Zenia Boulevard', '9 км']],
    presentation: 'Свободные квартиры, площади, цены и условия покупки',
    images: [
      img('nature-resort/aerial-pool', 'Двор с бассейном', 'Светлые корпуса Nature Resort вокруг двора с бассейном', { pos: '50% 60%' }),
      img('nature-resort/aerial-rear', 'Корпус с террасами', 'Жилой корпус Nature Resort с террасами и зелёными зонами'),
      img('nature-resort/aerial-city', 'Комплекс и город', 'Nature Resort на фоне застройки Сан-Мигель-де-Салинас')
    ]
  },
  {
    slug: 'horizon-ii', name: 'Horizon II Resort', type: 'Бунгало', city: SM, cityShort: 'Сан-Мигель',
    price: 219900, from: true, qualifier: 'без налогов',
    beds: '2–3', baths: '2', area: '65,01–85,88', areaFrom: false, areaNote: 'строительная площадь', sea: '9 км', handover: 'Сентябрь 2027', handoverShort: '09.2027',
    summary: 'Бунгало с частным садом на первом этаже или солярием на крыше. Три бассейна и более 3 400 м² озеленения.',
    highlights: ['Сад у нижних бунгало, солярий у верхних', 'Меблированная кухня с плитой и вытяжкой', 'Бронированная входная дверь'],
    facts: [['Бассейнов', '3'], ['Озеленение', '3 400 м²'], ['Zenia Boulevard', '9 км']],
    presentation: 'Схема комплекса, планировки нижних и верхних бунгало, цены и условия оплаты',
    images: [
      img('horizon-ii/pool-facade', 'Бунгало вдоль бассейна', 'Двухэтажные бунгало Horizon II вдоль бассейна с газоном', { pos: '50% 62%' }),
      img('horizon-ii/aerial-masterplan', 'Комплекс с высоты', 'Horizon II с высоты: ряды бунгало, сады и бассейны')
    ]
  },
  {
    slug: 'coronella-living', name: 'Coronella Living', type: 'Бунгало', city: 'Торревьеха', cityShort: 'Торревьеха',
    price: 272000, from: true, qualifier: '',
    beds: '2–3', baths: '1–2', area: '84', areaFrom: true, areaNote: '', sea: '4 км', handover: 'Август 2027', handoverShort: '08.2027',
    summary: 'Бунгало с частным садом или солярием рядом с розовой лагуной Торревьехи. Infinity-бассейн, бассейн с подогревом и два джакузи.',
    highlights: ['Солярий с барбекю, мойкой и душем у верхних бунгало', 'Тёплые полы в ванных', 'Паркоместо с подготовкой для зарядки электромобиля'],
    facts: [['Infinity-бассейн', '70 м²'], ['Джакузи с подогревом', '2'], ['Блоков', '13'], ['Аэропорт Аликанте', '51 км']],
    presentation: 'Планировка 2-спального бунгало, генплан, спецификация и свободные варианты',
    images: [
      img('coronella-living/terrace-pool', 'Терраса над бассейнами', 'Терраса с плетёными креслами над бассейнами Coronella Living', { pos: '50% 62%' }),
      img('coronella-living/aerial', 'Комплекс и лагуна', 'Coronella Living с высоты, на горизонте розовая лагуна'),
      img('coronella-living/pool', 'Бассейн и джакузи', 'Бассейн с двумя джакузи перед корпусами', { pos: '50% 60%' }),
      img('coronella-living/living-room', 'Гостиная с кухней', 'Светлая гостиная с обеденной зоной и кухней'),
      img('coronella-living/terrace-view', 'Вид с террасы', 'Терраса со столиком и видом на сады комплекса'),
      img('coronella-living/bedroom', 'Спальня', 'Спальня с большим окном'),
      img('coronella-living/garden-view', 'Сады', 'Зелёные зоны и бассейн между корпусами'),
      img('coronella-living/entrance', 'Вход в комплекс', 'Аллея у входа с фонтанами и лавандой')
    ]
  },
  {
    slug: 'villas-de-la-sal', name: 'Villas de la Sal', type: 'Вилла', city: SM, cityShort: 'Сан-Мигель',
    price: 429900, from: false, qualifier: 'без налогов',
    beds: '3', baths: '2', area: '107,32', areaFrom: false, areaNote: 'строительная площадь', sea: '6 км', handover: 'Готова', handoverShort: 'Готова',
    summary: 'Готовая одноэтажная вилла №107 на собственном участке 283 м² с солярием на крыше и юго-западной ориентацией.',
    highlights: ['Участок 283,04 м², солярий 86,45 м²', 'Видеодомофон, водонагреватель 150 л', POOL],
    facts: [['Участок', '283 м²'], ['Солярий', '86 м²'], ['Терраса', '11 м²'], ['Ориентация', 'юго-запад']],
    presentation: 'План виллы №107 и участка, комплектация и условия покупки',
    note: POOL,
    images: [
      img('villas-de-la-sal/villa-pool', 'Фасад и терраса', 'Одноэтажная белая вилла с крытой террасой. Бассейн на визуализации — дополнительная опция', { pos: '50% 62%', note: POOL }),
      img('villas-de-la-sal/villa-aerial', 'Участок с высоты', 'Вилла и участок с высоты. Бассейн на визуализации — дополнительная опция', { note: POOL })
    ]
  },
  {
    slug: 'tm-tower', name: 'TM Tower', type: 'Апартаменты', city: 'Бенидорм', cityShort: 'Бенидорм',
    price: 607000, from: true, qualifier: '',
    beds: '1–4', baths: '', area: '75', areaFrom: true, areaNote: '', sea: '150 м', seaNote: 'до пляжа Поньенте', handover: '2028', handoverShort: '2028',
    summary: 'Апартаменты в 64-этажной башне высотой 230 м, в 150 метрах от пляжа Поньенте.',
    highlights: ['Бассейны с подогревом', 'Скай-бар со смотровой площадкой', 'Фитнес, кинотеатр и спортзоны'],
    facts: [['Этажей', '64'], ['Высота', '230 м'], ['Квартир', '260'], ['Аэропорт Аликанте', '55 км']],
    presentation: 'Характеристики башни, планировки и свободные апартаменты',
    images: [
      img('tm-tower/coast', 'Башня над пляжем Поньенте', 'TM Tower среди высоток Бенидорма над пляжем Поньенте', { pos: '42% 45%' }),
      img('tm-tower/tower-exterior', 'Башня целиком', 'TM Tower от основания до вершины на фоне неба', { tall: true, pos: '50% 30%' }),
      img('tm-tower/terrace', 'Кухня и терраса', 'Кухня-гостиная с выходом на террасу над морем')
    ]
  }
].map((p, i) => ({ ...p, index: i + 1 }));

export const bySlug = new Map(properties.map(p => [p.slug, p]));

// Изображение: ширины из media.json, webp.
export function picture(id) {
  const sizes = media[id];
  const widths = Object.keys(sizes).map(Number).sort((a, b) => a - b);
  const max = widths.at(-1);
  const src = w => `/shared/media/${id}-${w}.webp`;
  return {
    srcset: widths.map(w => `${src(w)} ${w}w`).join(', '),
    src: src(widths.find(w => w >= 800) || max),
    thumb: src(widths[0]), small: src(widths.find(w => w >= 480) || max), large: src(max),
    width: max, height: sizes[max]
  };
}

const nbsp = ' ';
export const money = n => `€${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, nbsp)}`;
export const priceLabel = p => `${p.from ? 'от ' : ''}${money(p.price)}`;
export const areaLabel = p => `${p.areaFrom ? 'от ' : ''}${p.area}${nbsp}м²`;

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Данные для клиента (без лишнего).
export function clientData() {
  return properties.map(p => ({
    slug: p.slug, name: p.name, type: p.type, city: p.city, cityShort: p.cityShort, price: p.price, from: p.from,
    priceLabel: priceLabel(p), qualifier: p.qualifier, presentation: p.presentation,
    images: p.images.map(i => ({ ...i, ...picture(i.id) }))
  }));
}

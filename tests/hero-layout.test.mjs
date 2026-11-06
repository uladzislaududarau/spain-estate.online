import test from 'node:test';
import assert from 'node:assert/strict';
import { stabilizeHeroHeight } from '../showcase/assets/hero-layout.mjs';

function browser() {
  const properties = new Map(); const events = new Map(); let measurements = 0;
  const win = { document: { documentElement: { clientWidth: 390 } },
    requestAnimationFrame(fn) { fn(); return 1; }, cancelAnimationFrame() {},
    addEventListener(name, fn) { events.set(name, fn); }, removeEventListener(name) { events.delete(name); } };
  const surface = { height: 549, style: { removeProperty(name) { properties.delete(name); }, setProperty(name, value) { properties.set(name, value); } },
    getBoundingClientRect() { measurements++; return { height: this.height }; } };
  return { win, surface, properties, events, measurements: () => measurements };
}

test('Скрытие панелей и открытие клавиатуры не меняют высоту мобильного слайдера', () => {
  const b = browser(); stabilizeHeroHeight(b.surface, b.win);
  for (const height of [590, 300, 549]) { b.surface.height = height; b.events.get('resize')(); }
  assert.equal(b.properties.get('--mobile-hero-height'), '549px');
  assert.equal(b.measurements(), 1);
});

test('Новая ширина пересчитывает слайдер, десктоп и отключение освобождают фиксацию', () => {
  const b = browser(); const stop = stabilizeHeroHeight(b.surface, b.win);
  b.win.document.documentElement.clientWidth = 430; b.surface.height = 580; b.events.get('resize')();
  assert.equal(b.properties.get('--mobile-hero-height'), '580px');
  b.win.document.documentElement.clientWidth = 1200; b.events.get('resize')();
  assert.equal(b.properties.has('--mobile-hero-height'), false);
  stop(); assert.equal(b.events.size, 0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../showcase/index.html', import.meta.url), 'utf8');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]).find(code => code.includes('fonts-loading'));
function run(fonts) {
  const classes = new Set();
  const events = new Map();
  let timeout;
  vm.runInNewContext(script, {
    document: { fonts, documentElement: { classList: { add: name => classes.add(name), remove: name => classes.delete(name) } }, addEventListener: (event, callback) => events.set(event, callback) },
    setTimeout: (callback, delay) => { timeout = { callback, delay }; return 1; }, clearTimeout: () => { timeout = null; }
  });
  return { classes, events, timeout: () => timeout };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test('Первый показ текста ожидает основные шрифты и продолжается при ошибке загрузки', async () => {
  for (const fail of [false, true]) {
    let finish;
    const pending = new Promise((resolve, reject) => { finish = fail ? () => reject(new Error('network')) : resolve; });
    const page = run({ load: () => pending });
    assert.equal(page.classes.has('fonts-loading'), true);
    page.events.get('DOMContentLoaded')();
    finish([]);
    await flush();
    assert.equal(page.classes.has('fonts-loading'), false);
    assert.equal(page.classes.has('fonts-ready'), true);
    assert.equal(page.timeout(), null);
  }
});

test('Зависший запрос шрифтов не скрывает текст дольше 1800 мс, отсутствие Font API не скрывает его', () => {
  const page = run({ load: () => new Promise(() => {}) });
  page.events.get('DOMContentLoaded')();
  assert.equal(page.timeout().delay, 1800);
  page.timeout().callback();
  assert.equal(page.classes.has('fonts-loading'), false);
  assert.equal(page.classes.has('fonts-ready'), true);
  assert.equal(run(undefined).classes.size, 0);
});

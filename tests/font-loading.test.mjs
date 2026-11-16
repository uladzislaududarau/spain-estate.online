import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../showcase/index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../showcase/assets/estate.css', import.meta.url), 'utf8');

test('Локальные шрифты используют swap и не блокируют первоначальный текст', () => {
  const faces = [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)].map(match => match[1]);
  assert.ok(faces.length > 0);
  for (const face of faces) {
    assert.match(face, /font-display\s*:\s*swap/);
    assert.match(face, /src\s*:\s*url\(['"]?\.\/[^)]+\.woff2['"]?\)/);
  }
  assert.doesNotMatch(html, /fonts-loading|fonts-ready/);
  assert.doesNotMatch(css, /\.fonts-loading/);
});

test('Заголовок и основное действие доступны до выполнения отложенных скриптов', () => {
  assert.match(html, /<h1\b[^>]*>Недвижимость в Испании для комфортного проживания и выгодных инвестиций\.<\/h1>/);
  assert.match(html, /<button\b[^>]*data-open-quiz[^>]*>Начать поиск/);
  assert.doesNotMatch(html, /document\.fonts\.load|style=["'][^"']*(?:visibility\s*:\s*hidden|opacity\s*:\s*0)/);
  for (const match of html.matchAll(/<script\b([^>]*)\bsrc=["'][^"']+["']([^>]*)>/g)) {
    assert.match(match[1] + match[2], /\bdefer\b|\btype=["']module["']/);
  }
});

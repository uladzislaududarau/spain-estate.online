import { readFile, writeFile, mkdir, copyFile, readdir, stat, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSiteOrigin, renderLanding, renderThankYou, robots, sitemap } from '../server/seo.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(root, 'showcase');
const output = path.join(root, 'dist');
const origin = buildSiteOrigin();
// Удаляется только воспроизводимый результат сборки, исходники и архив не затрагиваются.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const copied = new Set();
async function emit(relative, content) {
  const target = path.join(output, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content);
}
async function dependencies(relative) {
  const content = await readFile(path.join(source, relative), 'utf8');
  const refs = [
    ...[...content.matchAll(/(?:src|href|srcset)=["']([^"']+)["']/g)].map(match => match[1]),
    ...[...content.matchAll(/url\(["']?([^)'"\s]+)["']?\)/g)].map(match => match[1]),
    ...[...content.matchAll(/(?:from\s*|import\s*\()["'](\.[^"']+)["']/g)].map(match => match[1])
  ];
  for (const ref of refs) {
    if (/^(?:https?:|data:|#)/.test(ref)) continue;
    const file = ref.startsWith('/') ? ref.slice(1) : path.posix.join(path.posix.dirname(relative), ref);
    if (!file.startsWith('assets/') || copied.has(file)) continue;
    if (file.includes('..')) throw new Error('Недопустимый путь ресурса');
    copied.add(file);
    await stat(path.join(source, file));
    await mkdir(path.dirname(path.join(output, file)), { recursive: true });
    await copyFile(path.join(source, file), path.join(output, file));
    if (/\.(?:css|mjs)$/.test(file)) await dependencies(file);
  }
}
for (const [input, target] of [
  ['index.html', 'index.html'], ['index.html', 'thank-you/index.html'],
  ['legal/ru-privacy.html', 'privacy/index.html'], ['legal/ru-legal.html', 'legal/index.html'],
  ['legal/en-privacy.html', 'en/privacy/index.html'], ['legal/en-legal.html', 'en/legal/index.html']
]) {
  const html = await readFile(path.join(source, input), 'utf8');
  await emit(target, target === 'thank-you/index.html' ? renderThankYou(html) : input === 'index.html' ? renderLanding(html, origin) : html);
  await dependencies(input);
}
// Лицензии поставляются вместе с используемыми ресурсами.
for (const file of await readdir(path.join(source, 'assets'))) {
  if (['logo.svg', 'logo-white.svg'].includes(file) || /(?:OFL\.txt|\.LICENSE)$/.test(file)) await copyFile(path.join(source, 'assets', file), path.join(output, 'assets', file));
}
await copyFile(path.join(source, 'favicon.ico'), path.join(output, 'favicon.ico'));
await emit('robots.txt', robots(origin));
if (origin) await emit('sitemap.xml', sitemap(origin));
await emit('404.html', '<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Страница не найдена | Spain Property for Sale</title><h1>Страница не найдена</h1><p><a href="/">Перейти на главную Spain Property for Sale</a></p></html>');
await emit('_redirects', '/index.html / 301\n/concept-7-warm-travertine.html / 301\n/showcase/concept-7-warm-travertine.html / 301\n/showcase/index.html / 301\n/showcase/ / 301\n');
await emit('_headers', `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n${origin ? '' : '  X-Robots-Tag: noindex, nofollow\n'}`);
console.log(`Сборка dist готова: ${copied.size} связанных ресурсов. ${origin ? `Домен: ${origin}` : 'Предпросмотр без индексации.'}`);
console.log('Для Cloudflare используется cloudflare/worker.mjs. Приём заявок включается после настройки D1 и секретов уведомлений.');

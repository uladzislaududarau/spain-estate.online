import { readFile, writeFile, mkdir, copyFile, readdir, stat, rm, cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSiteOrigin, robots, sitemap } from '../server/seo.mjs';
import { buildPersiana, persianaPaths } from '../site/build.mjs';

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
// Главная и страницы объектов — витрина site/persiana. Прежний лендинг с квизом остаётся на /quiz без индексации.
for (const [input, target] of [
  ['index.html', 'quiz/index.html'],
  ['legal/en-privacy.html', 'en/privacy/index.html'], ['legal/en-legal.html', 'en/legal/index.html']
]) {
  const html = await readFile(path.join(source, input), 'utf8');
  await emit(target, html);
  await dependencies(input);
}
await buildPersiana({ output, origin, source });
// Лицензии поставляются вместе с используемыми ресурсами.
for (const file of await readdir(path.join(source, 'assets'))) {
  if (['logo.svg', 'logo-white.svg'].includes(file) || /(?:OFL\.txt|\.LICENSE)$/.test(file)) await copyFile(path.join(source, 'assets', file), path.join(output, 'assets', file));
}
// Manifest-driven sequence requests are dynamic and must be emitted in full.
await cp(path.join(source, 'assets/sequence'), path.join(output, 'assets/sequence'), { recursive: true });
await cp(path.join(source, 'assets/cinema-main'), path.join(output, 'assets/cinema-main'), { recursive: true });
await cp(path.join(source, 'assets/vendor'), path.join(output, 'assets/vendor'), { recursive: true });
// Hero gallery frames and buyer-guide media are requested from JavaScript by name.
await cp(path.join(source, 'assets/hero-gallery'), path.join(output, 'assets/hero-gallery'), { recursive: true });
await cp(path.join(source, 'assets/buyer-guide'), path.join(output, 'assets/buyer-guide'), { recursive: true });
await copyFile(path.join(source, 'favicon.ico'), path.join(output, 'favicon.ico'));
await emit('robots.txt', robots(origin));
if (origin) await emit('sitemap.xml', sitemap(origin, persianaPaths));
// 404.html формирует витрина (buildPersiana).
await emit('_redirects', '/index.html / 301\n/concept-7-warm-travertine.html / 301\n/showcase/concept-7-warm-travertine.html / 301\n/showcase/index.html / 301\n/showcase/ / 301\n');
// Static Assets may omit Content-Length inside the binding. Supply the exact size
// of each deployed clip so the media handler can answer Safari's range probe.
const clipHeaders = [];
for (const tier of ['mobile', 'desktop']) {
  const clip = `assets/cinema-main/scroll-${tier}.mp4`;
  const { size } = await stat(path.join(output, clip));
  clipHeaders.push(`/${clip}\n  X-Cinema-Length: ${size}`);
}
await emit('_headers', `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n${origin ? '' : '  X-Robots-Tag: noindex, nofollow\n'}${clipHeaders.join('\n')}\n`);
console.log(`Сборка dist готова: ${copied.size} связанных ресурсов. ${origin ? `Домен: ${origin}` : 'Предпросмотр без индексации.'}`);
console.log('Для Cloudflare используется cloudflare/worker.mjs. Приём заявок включается после настройки D1 и секретов уведомлений.');

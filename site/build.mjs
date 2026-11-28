// Сборка витрины в dist: HTML-страницы и их статические файлы.
import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPersiana } from './persiana/render.mjs';
import { properties } from './shared/data.mjs';
import { policyVersion } from '../showcase/assets/quiz.config.mjs';

const here = fileURLToPath(new URL('./', import.meta.url));
export const persianaPaths = ['/', ...properties.map(p => `/${p.slug}`), '/catalog'];

// Юридические тексты берутся из единственного источника — showcase/legal.
async function legalBody(file) {
  const html = await readFile(file, 'utf8');
  const match = html.match(/<main id="main">([\s\S]*?)<nav class="legal-actions"/);
  if (!match) throw new Error(`Не найден текст документа: ${file}`);
  return match[1].trim();
}

export async function buildPersiana({ output, origin, source }) {
  const legal = {
    privacy: await legalBody(path.join(source, 'legal/ru-privacy.html')),
    legal: await legalBody(path.join(source, 'legal/ru-legal.html'))
  };
  const options = { origin, policyVersion, legal };
  const emit = async (relative, html) => {
    const target = path.join(output, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, html);
  };
  for (const route of persianaPaths) {
    const { html } = renderPersiana(route, options);
    await emit(route === '/' ? 'index.html' : `${route.slice(1)}/index.html`, html);
  }
  for (const route of ['/privacy', '/legal', '/thank-you']) await emit(`${route.slice(1)}/index.html`, renderPersiana(route, options).html);
  await emit('404.html', renderPersiana('/404', options).html);
  // Только клиентские файлы: render.mjs, data.mjs, page.mjs и build.mjs в dist не попадают.
  await mkdir(path.join(output, 'persiana'), { recursive: true });
  for (const file of ['persiana.css', 'persiana.js', 'consent.js', 'thank-you.js']) await cp(path.join(here, 'persiana', file), path.join(output, 'persiana', file));
  for (const entry of ['lib', 'media', 'fonts', 'lead.js', 'logo.svg', 'logo-white.svg', 'favicon.svg', 'media.json']) {
    await cp(path.join(here, 'shared', entry), path.join(output, 'shared', entry), { recursive: true });
  }
}

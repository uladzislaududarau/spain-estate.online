import { readdir, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
let count = 0;
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await walk(file);
    else if (/\.(mjs|js)$/.test(file)) { execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' }); count++; }
    else if (file.endsWith('.html')) {
      const html = await readFile(file, 'utf8');
      for (const [, attrs, body] of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
        if (!body.trim() || /type=["']application\/ld\+json/.test(attrs)) continue;
        new vm.Script(body, { filename: file }); count++;
      }
    }
  }
}
for (const directory of ['cloudflare', 'server', 'scripts', 'tests', 'showcase']) await walk(directory);
console.log(`Проверен синтаксис ${count} JavaScript-файлов и встроенных скриптов.`);

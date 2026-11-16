import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../server/index.mjs';

test('Production preview serves compiled route files unchanged using the same local API server', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'spain-production-preview-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const routes = ['index.html', 'thank-you/index.html', 'privacy/index.html', 'legal/index.html', 'en/privacy/index.html', 'en/legal/index.html'];
  for (const relative of routes) {
    await mkdir(path.dirname(path.join(directory, relative)), { recursive: true });
    await writeFile(path.join(directory, relative), `<title>compiled ${relative}</title>`);
  }
  await writeFile(path.join(directory, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  const app = await createApp({ assetDirectory: directory, saveLead: async lead => ({ lead, duplicate: false }) });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => app.close(resolve)));
  const origin = `http://127.0.0.1:${app.address().port}`;
  for (const [route, file] of [['/', 'index.html'], ['/thank-you', 'thank-you/index.html'], ['/privacy', 'privacy/index.html'], ['/legal', 'legal/index.html'], ['/en/privacy', 'en/privacy/index.html'], ['/en/legal', 'en/legal/index.html']]) {
    const response = await fetch(origin + route);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), `<title>compiled ${file}</title>`);
  }
  assert.equal(await (await fetch(origin + '/robots.txt')).text(), 'User-agent: *\nDisallow: /\n');
  assert.equal((await fetch(origin + '/sitemap.xml')).status, 404);
  assert.equal((await fetch(origin + '/server/schema.mjs')).status, 404);
  assert.equal((await fetch(origin + '/api/lead')).status, 405);
});

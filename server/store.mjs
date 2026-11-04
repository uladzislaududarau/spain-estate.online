import { mkdir, open, readFile, rename, unlink, readdir } from 'node:fs/promises';
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import path from 'node:path';

export async function createStore(directory) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const keyPath = path.join(directory, 'encryption.key');
  let key;
  try {
    const handle = await open(keyPath, 'wx', 0o600);
    key = randomBytes(32);
    try { await handle.writeFile(key); await handle.sync(); } finally { await handle.close(); }
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    key = await readFile(keyPath);
  }
  if (key.length !== 32) throw new Error('Некорректный ключ хранилища');
  const decode = bytes => {
    const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8'));
  };
  const get = async id => {
    try { return decode(await readFile(path.join(directory, `${id}.enc`))); }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  };
  let serial = Promise.resolve();
  return {
    get,
    async save(lead) {
      // Последовательная запись исключает гонку одинаковых запросов в одном процессе.
      const task = serial.then(async () => {
        const previous = await get(lead.requestId);
        if (previous) return { lead: previous, duplicate: true };
        const cutoff = Date.now() - 10 * 60 * 1000;
        for (const filename of await readdir(directory)) {
          if (!filename.endsWith('.enc')) continue;
          const candidate = decode(await readFile(path.join(directory, filename)));
          if (Date.parse(candidate.savedAt) >= cutoff && candidate.contact === lead.contact && candidate.messenger === lead.messenger) return { lead: candidate, duplicate: true };
        }
        const iv = randomBytes(12);
        const cipher = createCipheriv('aes-256-gcm', key, iv);
        const encrypted = Buffer.concat([cipher.update(JSON.stringify(lead), 'utf8'), cipher.final()]);
        const bytes = Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
        const temporary = path.join(directory, `${lead.requestId}.${randomBytes(6).toString('hex')}.tmp`);
        const handle = await open(temporary, 'wx', 0o600);
        try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
        try { await rename(temporary, path.join(directory, `${lead.requestId}.enc`)); }
        catch (error) { await unlink(temporary).catch(() => {}); throw error; }
        return { lead, duplicate: false };
      });
      serial = task.catch(() => {});
      return task;
    }
  };
}

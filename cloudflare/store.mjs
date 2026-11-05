import { keys, fingerprint, encrypt, decrypt } from './crypto.mjs';
import { sendNotification } from './notifications.mjs';
import { sendToGoogleSheets, sheetsEnabled } from './google-sheets.mjs';

export async function createCloudStore(env, fetcher = fetch) {
  if (!env.DB) throw new Error('database_not_configured');
  const db = env.DB;
  const key = await keys(env.LEAD_ENCRYPTION_KEY);
  const exportSheets = sheetsEnabled(env);
  const pendingCondition = exportSheets ? "(email_status != 'sent' OR sheets_status != 'sent')" : "email_status != 'sent'";
  return {
    async rateLimit(ip) {
      const now = Date.now();
      const bucket = Math.floor(now / 60000);
      const hash = await fingerprint(key.hashing, `rate:v1:${bucket}:${ip}`);
      const row = await db.prepare('INSERT INTO lead_rate_limits (bucket_key, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(bucket_key) DO UPDATE SET count = count + 1 RETURNING count')
        .bind(hash, now + 120000).first();
      return row.count <= 12;
    },
    async save(lead) {
      const now = Date.now();
      const contactHash = await fingerprint(key.hashing, `contact:v1:${lead.messenger}:${lead.contact}`);
      const encrypted = await encrypt(key.encryption, lead);
      // Одно условное INSERT исключает гонку повторных заявок между экземплярами Worker.
      const result = await db.prepare(`INSERT OR IGNORE INTO leads
        (id, request_id, contact_hash, created_at, payload, next_attempt_at)
        SELECT ?, ?, ?, ?, ?, ? WHERE NOT EXISTS
        (SELECT 1 FROM leads WHERE contact_hash = ? AND created_at >= ?)`)
        .bind(lead.leadId, lead.requestId, contactHash, now, encrypted, now, contactHash, now - 600000).run();
      const row = await db.prepare('SELECT id FROM leads WHERE request_id = ? OR (contact_hash = ? AND created_at >= ?) ORDER BY created_at DESC LIMIT 1')
        .bind(lead.requestId, contactHash, now - 600000).first();
      if (!row) throw new Error('lead_not_saved');
      return { leadId: row.id, duplicate: result.meta.changes === 0 };
    },
    async deliver(id) {
      const now = Date.now();
      const lease = crypto.randomUUID();
      const row = await db.prepare(`UPDATE leads SET lease_token = ?, lease_until = ?
        WHERE id = ? AND lease_until <= ? AND next_attempt_at <= ?
        AND ${pendingCondition} RETURNING *`)
        .bind(lease, now + 120000, id, now, now).first();
      if (!row) return;
      let failed = false;
      try {
        const lead = await decrypt(key.encryption, row.payload);
        const deliverChannel = async (column, sender) => {
          if (row[column] === 'sent') return;
          try {
            if (!await sender(lead)) { failed = true; return; }
            await db.prepare(`UPDATE leads SET ${column} = 'sent' WHERE id = ? AND lease_token = ?`).bind(id, lease).run();
          } catch { failed = true; }
        };
        await Promise.all([
          deliverChannel('email_status', lead => sendNotification('email', lead, env, fetcher)),
          ...(exportSheets ? [deliverChannel('sheets_status', lead => sendToGoogleSheets(lead, env, fetcher))] : [])
        ]);
      } catch { failed = true; }
      // Содержимое ошибок сторонних API не сохраняется: в нём могут оказаться токены или контакты.
      const delay = Math.min(3600000, 60000 * 2 ** Math.min(row.attempts, 6));
      await db.prepare('UPDATE leads SET attempts = attempts + 1, next_attempt_at = ?, lease_until = 0, lease_token = NULL, last_error = ? WHERE id = ? AND lease_token = ?')
        .bind(Date.now() + delay, failed ? 'delivery_failed' : null, id, lease).run();
    },
    async pending() {
      const result = await db.prepare(`SELECT id FROM leads WHERE next_attempt_at <= ? AND lease_until <= ? AND ${pendingCondition} ORDER BY created_at LIMIT 5`)
        .bind(Date.now(), Date.now()).all();
      return result.results.map(row => row.id);
    },
    async cleanupRateLimits() {
      await db.prepare('DELETE FROM lead_rate_limits WHERE expires_at < ?').bind(Date.now()).run();
    },
    async cleanupExpiredLeads() {
      // Удаляются только истёкшие заявки; свежие заявки и ключ шифрования сохраняются.
      const cutoff = Date.now() - 180 * 86400000;
      await db.prepare('DELETE FROM leads WHERE id IN (SELECT id FROM leads WHERE created_at < ? LIMIT 500)').bind(cutoff).run();
    }
  };
}

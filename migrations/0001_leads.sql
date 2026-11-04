-- Контакты и ответы хранятся только внутри зашифрованного payload.
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
  contact_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  payload TEXT NOT NULL,
  telegram_status TEXT NOT NULL DEFAULT 'pending',
  email_status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL,
  lease_until INTEGER NOT NULL DEFAULT 0,
  lease_token TEXT,
  last_error TEXT
);
CREATE INDEX IF NOT EXISTS leads_contact_created ON leads(contact_hash, created_at);
CREATE INDEX IF NOT EXISTS leads_retry ON leads(next_attempt_at);
CREATE TABLE IF NOT EXISTS lead_rate_limits (
  bucket_key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lead_rate_expiry ON lead_rate_limits(expires_at);

-- Индекс для плановой очистки только истёкших заявок, без изменения самих записей.
CREATE INDEX IF NOT EXISTS leads_retention_created ON leads(created_at);

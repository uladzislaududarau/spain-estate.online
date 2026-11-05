-- Отдельный статус экспорта: ошибки Sheets не повторяют успешные email.
-- Старые заявки также ожидают экспорта после включения канала Sheets.
ALTER TABLE leads ADD COLUMN sheets_status TEXT NOT NULL DEFAULT 'pending';

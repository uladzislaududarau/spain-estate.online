/** Приём заявок только от подписанных запросов Worker. Контакты не выводятся в журналы. */
const LEAD_COLUMNS = [
  'ID заявки', 'Дата', 'Время', 'Часовой пояс', 'Имя', 'Способ связи', 'Контакт',
  'Язык', 'Регион Испании', 'Цель покупки', 'Тип объекта', 'Бюджет', 'Срок покупки',
  'Согласие', 'Дата и время согласия (UTC)', 'Версия политики', 'Создано (UTC)', 'Источник'
];

function settings_() {
  const properties = PropertiesService.getScriptProperties();
  const id = properties.getProperty('SPREADSHEET_ID');
  const secret = properties.getProperty('WEBHOOK_SECRET');
  if (!/^[A-Za-z0-9_-]+$/.test(id || '') || !/^[a-f0-9]{64}$/i.test(secret || '')) throw new Error('not_configured');
  return { id: id, secret: secret, sheetName: properties.getProperty('SHEET_NAME') || 'Лиды' };
}

// Запускается владельцем один раз: создаёт заголовки и ключ, не изменяя существующие заявки.
function setup() {
  const properties = PropertiesService.getScriptProperties();
  if (!properties.getProperty('SPREADSHEET_ID')) throw new Error('SPREADSHEET_ID_required');
  if (!properties.getProperty('WEBHOOK_SECRET')) {
    properties.setProperty('WEBHOOK_SECRET', (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, ''));
  }
  const config = settings_();
  const book = SpreadsheetApp.openById(config.id);
  book.setSpreadsheetTimeZone('Asia/Nicosia');
  let sheet = book.getSheetByName(config.sheetName);
  if (!sheet) {
    const first = book.getSheets()[0];
    sheet = book.getSheets().length === 1 && first.getLastRow() === 0 ? first.setName(config.sheetName) : book.insertSheet(config.sheetName);
  }
  if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, LEAD_COLUMNS.length).setValues([LEAD_COLUMNS]);
  checkHeader_(sheet);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, LEAD_COLUMNS.length).setBackground('#15263D').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(11).setWrap(true);
  sheet.setRowHeight(1, 44);
  sheet.setColumnWidths(1, LEAD_COLUMNS.length, 150);
  sheet.setColumnWidth(1, 280);
  sheet.setColumnWidth(5, 200);
  sheet.setColumnWidths(9, 5, 240);
  if (!sheet.getFilter()) sheet.getRange(1, 1, sheet.getMaxRows(), LEAD_COLUMNS.length).createFilter();
  return 'Таблица готова. Секрет хранится только в свойствах скрипта.';
}

function checkHeader_(sheet) {
  const headers = sheet.getRange(1, 1, 1, LEAD_COLUMNS.length).getValues()[0];
  if (!LEAD_COLUMNS.every(function (value, index) { return headers[index] === value; })) throw new Error('sheet_header_changed');
}

function reply_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function safeCell_(value) {
  // Запрещаем выполнение формул и сохраняем телефоны/username как текст.
  return /^[\s]*[=+\-@]/.test(value) ? "'" + value : value;
}

function sameSignature_(a, b) {
  if (typeof b !== 'string' || a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index++) difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return difference === 0;
}

function doGet() { return reply_({ ok: true, service: 'spain-property-leads' }); }

function doPost(event) {
  let lock;
  try {
    const raw = event && event.postData && event.postData.contents;
    if (typeof raw !== 'string' || raw.length > 40000) return reply_({ ok: false });
    const envelope = JSON.parse(raw);
    if (envelope.version !== 1 || !Number.isSafeInteger(envelope.issuedAt) || Math.abs(Date.now() - envelope.issuedAt) > 300000
      || typeof envelope.payload !== 'string' || envelope.payload.length > 32768 || !/^[a-f0-9]{64}$/.test(envelope.signature || '')) return reply_({ ok: false });
    const config = settings_();
    const expected = Utilities.computeHmacSha256Signature(String(envelope.issuedAt) + '\n' + envelope.payload, config.secret, Utilities.Charset.UTF_8)
      .map(function (byte) { return ('0' + (byte & 255).toString(16)).slice(-2); }).join('');
    if (!sameSignature_(expected, envelope.signature)) return reply_({ ok: false });
    const payload = JSON.parse(envelope.payload);
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(payload.leadId || '')
      || !Array.isArray(payload.values) || payload.values.length !== LEAD_COLUMNS.length || payload.values[0] !== payload.leadId
      || !payload.values.every(function (value) { return typeof value === 'string' && value.length <= 4000; })) return reply_({ ok: false });
    lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return reply_({ ok: false });
    const sheet = SpreadsheetApp.openById(config.id).getSheetByName(config.sheetName);
    if (!sheet) throw new Error('sheet_missing');
    checkHeader_(sheet);
    const lastRow = sheet.getLastRow();
    const duplicate = lastRow > 1 && sheet.getRange(2, 1, lastRow - 1, 1).createTextFinder(payload.leadId).matchEntireCell(true).matchCase(true).findNext();
    if (!duplicate) {
      sheet.getRange(lastRow + 1, 1, 1, LEAD_COLUMNS.length).setNumberFormat('@').setValues([payload.values.map(safeCell_)]).setWrap(true).setVerticalAlignment('top');
      SpreadsheetApp.flush();
    }
    return reply_({ ok: true, leadId: payload.leadId, duplicate: Boolean(duplicate) });
  } catch (_) {
    return reply_({ ok: false });
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}

import { emitKeypressEvents } from 'node:readline';

// Токен вводится скрыто, используется только в памяти и не записывается в файл.
async function readToken() {
  if (!process.stdin.isTTY) throw new Error('Запустите команду в обычном интерактивном терминале.');
  process.stdout.write('Вставьте токен Telegram-бота и нажмите Enter (ввод скрыт): ');
  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const finish = () => {
      process.stdin.off('keypress', onKey);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write('\n');
    };
    const onKey = (text, key = {}) => {
      if (key.ctrl && key.name === 'c') { finish(); reject(new Error('Отменено.')); }
      else if (key.name === 'return' || key.name === 'enter') { finish(); resolve(value.trim()); }
      else if (key.name === 'backspace') value = value.slice(0, -1);
      else if (text && !key.ctrl && !key.meta) value += text;
    };
    process.stdin.on('keypress', onKey);
  });
}

try {
  const token = await readToken();
  if (!/^\d+:[A-Za-z0-9_-]+$/.test(token)) throw new Error('Неверный формат токена. Скопируйте его из BotFather.');
  let response;
  try {
    response = await fetch(`https://api.telegram.org/bot${token}/getUpdates`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeout: 0 }), signal: AbortSignal.timeout(15000)
    });
  } catch { throw new Error('Не удалось подключиться к Telegram API. Проверьте сеть.'); }
  const data = await response.json();
  if (!data.ok) {
    if (data.error_code === 409) throw new Error('У бота активен webhook или другой получатель обновлений. Ничего не отключено; используйте сохранённый Chat ID или остановите локальное получение обновлений и повторите.');
    throw new Error(`Telegram отклонил запрос (код ${data.error_code || response.status}). Проверьте токен.`);
  }
  const chats = new Map();
  for (const update of data.result || []) {
    const chat = update.message?.chat || update.edited_message?.chat || update.channel_post?.chat || update.my_chat_member?.chat || update.callback_query?.message?.chat;
    if (chat) chats.set(chat.id, chat);
  }
  if (!chats.size) console.log('Новых сообщений нет. Отправьте /start именно этому боту и повторите команду.');
  for (const chat of chats.values()) console.log(`TELEGRAM_CHAT_ID=${chat.id} (${chat.type}${chat.title ? ': ' + chat.title : ''})`);
  console.log('Скопируйте нужный ID в Secrets нового Cloudflare Worker. Токен не сохранён.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

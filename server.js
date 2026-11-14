const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');

const TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = String(process.env.ADMIN_ID || '');
const STAR_PRICE = Number(process.env.STAR_PRICE || 5); // ціна в зірках (5 або 10)

const bot = new TelegramBot(TOKEN, { polling: true });
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Сховище ключів: Map<string, { used: boolean, owner: string }>
const keys = new Map();

function generate9DigitKey() {
  let code;
  do {
    code = String(Math.floor(100000000 + Math.random() * 900000000));
  } while (keys.has(code));
  keys.set(code, { used: false, owner: 'system' });
  return code;
}

// Генеруємо 10 стартових 9-значних ключів при запуску
const initialKeys = Array.from({ length: 10 }, () => generate9DigitKey());
console.log('=== 10 СТАРТОВИХ КЛЮЧІВ ===\n' + initialKeys.join('\n'));

// Команда для адміна, щоб подивитися активні стартові ключі в боті
bot.onText(/\/keys/, (msg) => {
  if (ADMIN_ID && String(msg.from.id) !== ADMIN_ID) return;
  const active = [...keys.entries()]
    .filter(([, v]) => !v.used)
    .map(([k]) => `\`${k}\``)
    .join('\n');
  bot.sendMessage(msg.chat.id, `🔑 *Доступні невикористані ключі:*\n\n${active || 'Усі ключі використано'}`, { parse_mode: 'Markdown' });
});

// Старт бота — пропозиція купити ключ за Telegram Stars
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `Вітаю! Для доступу до застосунку потрібен одноразовий 9-значний ключ.\n\nВартість: *${STAR_PRICE} ⭐️*`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: `Купити ключ за ${STAR_PRICE} ⭐️`, callback_data: 'buy_key' }]]
      }
    }
  );
});

// Надсилання рахунку в Telegram Stars (валюта XTR)
bot.on('callback_query', async (query) => {
  if (query.data !== 'buy_key') return;
  await bot.answerCallbackQuery(query.id);
  await bot.sendInvoice(
    query.message.chat.id,
    'Персональний ключ доступу',
    'Одноразовий 9-значний ключ для активації доступу на 1 пристрої.',
    `key_purchase_${query.from.id}_${Date.now()}`,
    '', // для Telegram Stars provider_token завжди порожній рядок
    'XTR',
    [{ label: 'Ключ доступу (9 цифр)', amount: STAR_PRICE }]
  );
});

// Обов'язкове підтвердження перед оплатою
bot.on('pre_checkout_query', (query) => {
  bot.answerPreCheckoutQuery(query.id, true);
});

// Успішна оплата зірками -> видача 9-значного ключа
bot.on('message', (msg) => {
  if (!msg.successful_payment) return;
  const newKey = generate9DigitKey();
  keys.get(newKey).owner = String(msg.from.id);
  bot.sendMessage(
    msg.chat.id,
    `✅ Оплата пройшла успішно!\n\nТвій одноразовий ключ:\n\`${newKey}\`\n\nВведи ці 9 цифр на сайті.`,
    { parse_mode: 'Markdown' }
  );
});

// Перевірка 9-значного ключа із сайту
app.post('/api/verify', (req, res) => {
  const code = String(req.body?.key || '').trim();
  const record = keys.get(code);

  if (!record) return res.json({ ok: false, message: 'Невірний ключ' });
  if (record.used) return res.json({ ok: false, message: 'Цей ключ вже використано' });

  record.used = true;
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

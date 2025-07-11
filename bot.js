require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');
const path = require('path');

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.post('/webhook', (req, res) => {
  bot.handleUpdate(req.body);
  res.sendStatus(200);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

let cart = [];

bot.start((ctx) => {
  ctx.reply('Добро пожаловать в магазин!', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Открыть каталог', web_app: { url: process.env.RENDER_URL } }],
      ],
    },
  });
});

bot.command('catalog', (ctx) => {
  ctx.reply('Выберите категорию:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Оригинальные постеры', callback_data: 'category_posters' }],
        [{ text: 'Кринж от TR/BUTE', callback_data: 'category_creative' }],
      ],
    },
  });
});

bot.command('add', async (ctx) => {
  const item = ctx.message.text.replace('/add ', '');
  const products = {
    'Сталин-3000': 500,
    'Постер PEAK': 1500,
    'Кринж малый': 15000,
    'Кринж большой': 3000
  };
  if (products[item]) {
    cart.push({ userId: ctx.from.id, item, price: products[item] });
    ctx.reply(`${item} добавлен в корзину (${products[item]}₽). Используйте /start для оформления.`);
  } else {
    ctx.reply('Товар не найден. Используйте /catalog.');
  }
});

bot.on('callback_query', async (ctx) => {
  const category = ctx.callbackQuery.data;
  if (category === 'category_posters') {
    await ctx.reply('Товары в категории "Оригинальные постеры": Сталин-3000 (500₽), Постер "PEAK" (1500₽). Используйте /add.');
  } else if (category === 'category_creative') {
    await ctx.reply('Товары в категории "Кринж от TR/BUTE": Кринж малый (15000₽), Кринж большой (3000₽). Используйте /add.');
  }
  await ctx.telegram.answerCallbackQuery(ctx.callbackQuery.id); // Исправлено
});

bot.on('web_app_data', async (ctx) => {
  console.log('Received web_app_data:', ctx.webAppData.data.json());
  const data = ctx.webAppData.data.json();
  const userCart = cart.filter(item => item.userId === ctx.from.id);
  const message = `Получен заказ:\n${data}\nСохраненная корзина:\n${userCart.length ? userCart.map(item => `${item.item} - ${item.price}₽`).join('\n') : 'Пусто'}`;
  await ctx.reply(message);
  try {
    await bot.telegram.sendMessage(1222932847, `Новый заказ от @${ctx.from.username || ctx.from.id}:\n${message}`);
    console.log('Admin notification sent to 1222932847');
  } catch (error) {
    console.error('Failed to send admin notification:', error);
    await ctx.reply(`Ошибка отправки уведомления админу: ${error.message}`);
  }
});

app.listen(process.env.PORT || 3000, async () => {
  console.log(`Сервер запущен на порт ${process.env.PORT || 3000}`);
  await bot.telegram.setWebhook(`${process.env.RENDER_URL}/webhook`);
  console.log('Webhook установлен');
});
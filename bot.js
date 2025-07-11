require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');
const path = require('path');

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Проверка работоспособности сервера
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.sendStatus(200);
});

app.post('/webhook', (req, res) => {
  console.log('Webhook received:', req.body);
  bot.handleUpdate(req.body);
  res.sendStatus(200);
});

app.get('/', (req, res) => {
  console.log('Serving Mini App for userId:', req.query.userId);
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/cart/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  console.log('Fetching cart for userId:', userId);
  const userCart = cart.filter(item => item.userId === userId);
  res.json(userCart);
});

app.post('/add-to-cart', (req, res) => {
  const { userId, item, price } = req.body;
  console.log('Adding to cart:', { userId, item, price });
  cart.push({ userId, item, price });
  res.sendStatus(200);
});

let cart = [];

bot.start((ctx) => {
  console.log('Start command from userId:', ctx.from.id);
  ctx.reply('Добро пожаловать в магазин!', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Открыть каталог', web_app: { url: `${process.env.RENDER_URL}?userId=${ctx.from.id}` } }],
      ],
    },
  });
});

bot.command('catalog', (ctx) => {
  console.log('Catalog command from userId:', ctx.from.id);
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
    console.log('Added to cart via /add:', { userId: ctx.from.id, item, price: products[item] });
    ctx.reply(`${item} добавлен в корзину (${products[item]}₽). Используйте /start для оформления.`);
  } else {
    ctx.reply('Товар не найден. Используйте /catalog.');
  }
});

bot.on('callback_query', async (ctx) => {
  const category = ctx.callbackQuery.data;
  console.log('Callback query:', category, 'from userId:', ctx.from.id);
  if (category === 'category_posters') {
    await ctx.reply('Товары в категории "Оригинальные постеры": Сталин-3000 (500₽), Постер "PEAK" (1500₽). Используйте /add.');
  } else if (category === 'category_creative') {
    await ctx.reply('Товары в категории "Кринж от TR/BUTE": Кринж малый (15000₽), Кринж большой (3000₽). Используйте /add.');
  }
  await ctx.answerCallbackQuery();
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

bot.command('testadmin', async (ctx) => {
  try {
    await bot.telegram.sendMessage(1222932847, 'Тестовое уведомление');
    ctx.reply('Тестовое уведомление отправлено админу');
  } catch (error) {
    ctx.reply(`Ошибка: ${error.message}`);
  }
});

app.listen(process.env.PORT || 3000, async () => {
  console.log(`Сервер запущен на порт ${process.env.PORT || 3000}`);
  await bot.telegram.setWebhook(`${process.env.RENDER_URL}/webhook`);
  console.log('Webhook установлен');
});
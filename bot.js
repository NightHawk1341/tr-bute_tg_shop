require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');
const path = require('path');
const fs = require('fs');

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Webhook маршрут
app.post('/webhook', (req, res) => {
  bot.handleUpdate(req.body);
  res.sendStatus(200);
});

// Явный маршрут для Mini App
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Команда /start
bot.start((ctx) => {
  ctx.reply('Добро пожаловать в магазин!', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Открыть каталог', web_app: { url: process.env.RENDER_URL } }],
      ],
    },
  });
});

// Команда /catalog
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

// Команда /add
bot.command('add', async (ctx) => {
  const item = ctx.message.text.replace('/add ', '');
  const products = {
    'Сталин-3000': 500,
    'Постер PEAK': 1500,
    'Кринж малый': 15000,
    'Кринж большой': 3000
  };
  if (products[item]) {
    let cart = [];
    if (fs.existsSync('cart.json')) {
      cart = JSON.parse(fs.readFileSync('cart.json'));
    }
    cart.push({ userId: ctx.from.id, item, price: products[item] });
    fs.writeFileSync('cart.json', JSON.stringify(cart));
    ctx.reply(`${item} добавлен в корзину (${products[item]}₽). Используйте /start для оформления.`);
  } else {
    ctx.reply('Товар не найден. Используйте /catalog для списка товаров.');
  }
});

// Обработка callback_query
bot.on('callback_query', async (ctx) => {
  const category = ctx.callbackQuery.data;
  if (category === 'category_posters') {
    await ctx.reply('Товары в категории "Оригинальные постеры": Сталин-3000 (500₽), Постер "PEAK" (1500₽). Используйте /add для добавления в корзину.');
  } else if (category === 'category_creative') {
    await ctx.reply('Товары в категории "Кринж от TR/BUTE": Кринж малый (15000₽), Кринж большой (3000₽). Используйте /add для добавления в корзину.');
  }
  await ctx.answerCallbackQuery();
});

// Обработка заказов из Mini App
bot.on('web_app_data', async (ctx) => {
  const data = ctx.webAppData.data.json();
  let cart = [];
  if (fs.existsSync('cart.json')) {
    cart = JSON.parse(fs.readFileSync('cart.json'));
  }
  const userCart = cart.filter(item => item.userId === ctx.from.id);
  const message = `Получен заказ:\n${data}\nСохраненная корзина:\n${userCart.length ? userCart.map(item => `${item.item} - ${item.price}₽`).join('\n') : 'Пусто'}`;
  await ctx.reply(message);
  await bot.telegram.sendMessage(1222932847, `Новый заказ от @${ctx.from.username || ctx.from.id}:\n${message}`);
});

app.listen(process.env.PORT || 3000, async () => {
  console.log(`Сервер запущен на порт ${process.env.PORT || 3000}`);
  await bot.telegram.setWebhook(`${process.env.RENDER_URL}/webhook`);
  console.log('Webhook установлен');
});
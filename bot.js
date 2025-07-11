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

const fs = require('fs');

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
    ctx.reply(`${item} добавлен в корзину (${products[item]}₽).`);
  } else {
    ctx.reply('Товар не найден. Используйте /catalog.');
  }
});

bot.on('web_app_data', (ctx) => {
  const data = ctx.webAppData.data.json();
  let cart = [];
  if (fs.existsSync('cart.json')) {
    cart = JSON.parse(fs.readFileSync('cart.json'));
  }
  const userCart = cart.filter(item => item.userId === ctx.from.id);
  ctx.reply(`Получен заказ:\n${data}\nСвяжитесь с покупателем.`);
  bot.telegram.sendMessage(1222932847, `Новый заказ:\n${data}`);
});

bot.on('callback_query', async (ctx) => {
  const category = ctx.callbackQuery.data;
  if (category === 'category_posters') {
    await ctx.reply('Товары в категории "Оригинальные постеры": Сталин-3000 (500₽), Постер "PEAK" (1500₽). Используйте /add для добавления в корзину.');
  } else if (category === 'category_creative') {
    await ctx.reply('Товары в категории "Кринж от TR/BUTE": Кринж малый (15000₽), Кринж большой (3000₽). Используйте /add для добавления в корзину.');
  }
  await ctx.answerCallbackQuery();
});

bot.on('web_app_data', (ctx) => {
  const data = ctx.webAppData.data.json();
  ctx.reply(`Получен заказ:\n${data}\nСвяжитесь с покупателем для уточнения деталей.`);
});

bot.command('add', (ctx) => {
  const item = ctx.message.text.replace('/add ', '');
  const products = {
    'Сталин-3000': 500,
    'Постер PEAK': 1500,
    'Кринж малый': 15000,
    'Кринж большой': 3000
  };
  if (products[item]) {
    ctx.reply(`${item} добавлен в корзину (${products[item]}₽). Используйте /start для оформления.`);
  } else {
    ctx.reply('Товар не найден. Используйте /catalog для списка товаров.');
  }
});

app.listen(process.env.PORT || 3000, async () => {
  console.log(`Сервер запущен на порт ${process.env.PORT || 3000}`);
  await bot.telegram.setWebhook(`${process.env.RENDER_URL}/webhook`);
  console.log('Webhook установлен');
});
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

app.listen(process.env.PORT || 3000, async () => {
  console.log(`Сервер запущен на порт ${process.env.PORT || 3000}`);
  await bot.telegram.setWebhook(`${process.env.RENDER_URL}/webhook`);
  console.log('Webhook установлен');
});
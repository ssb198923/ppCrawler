process.env.NTBA_FIX_319 = 1;
require("dotenv").config();
const TelegramBot = require('node-telegram-bot-api');
const timeout = ms => new Promise(res => setTimeout(res, ms));
const botChannelId = process.env.BOT_CHANNEL_ID;

exports.sendMsg = (text) => {
    const bot = new TelegramBot(process.env.BOT_TOKEN, {polling: true});
    bot.sendMessage(botChannelId, text, { parse_mode :"html" })
    .then(() => {
        process.exit(0); 
    })
    .catch(err => {
        const e = err.toJSON();
        console.log(e);
        process.exit(200);
    });
};
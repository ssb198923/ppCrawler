process.env.NTBA_FIX_319 = 1;
require("dotenv").config();
const TelegramBot = require('node-telegram-bot-api');
const botChannelId = process.env.BOT_CHANNEL_ID;

exports.sendMsg = (text) => {
    return new Promise(function (resolve, reject){
        const bot = new TelegramBot(process.env.BOT_TOKEN, {polling: false});
        bot.sendMessage(botChannelId, text, { parse_mode :"html" })
        .then((res) => {
            resolve(res);
            return res;
        })
        .catch((err) => {
            reject(err);
            throw err;
        });        
    });
};
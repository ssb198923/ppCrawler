process.env.NTBA_FIX_319 = 1;
const TelegramBot = require('node-telegram-bot-api');
const timeout = ms => new Promise(res => setTimeout(res, ms))
const token = '5278992860:AAEm-A0TZM5FVByRd-TLC_gmO5T6VqO2QFo';
const bot = new TelegramBot(token, {polling: true});

bot.onText(/\/echo (.+)/, (msg, match) => {
    // 'msg' is the received Message from Telegram
    // 'match' is the result of executing the regexp above on the text content
    // of the message

    const chatId = msg.chat.id;
    const resp = match[1]; // the captured "whatever"

    // send back the matched "whatever" to the chat
    bot.sendMessage(chatId, resp);
});

// Listen for any kind of message. There are different kinds of
// messages.
bot.on('message', (msg) => {
    const chatId = msg.chat.id;

    console.log('chatId:'+chatId);
    // send a message to the chat acknowledging receipt of their message
    bot.sendMessage(chatId, 'Received your message');
});
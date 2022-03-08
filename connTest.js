const express = require('express');
const app = express();
const port = 5000;
require("dotenv").config();

app.get('/', function (req, res) {
    res.send('hello world!!');
});

app.listen(port, () => console.log(`${port}포트입니다.`));


const url = process.env.URI;

console.log(url);

const mongoose = require('mongoose');
mongoose
    .connect(
        url,
        {
            // useNewUrlPaser: true,
            // useUnifiedTofology: true,
            // useCreateIndex: true,
            // useFindAndModify: false,
        }
    )
    .then(() => console.log('MongoDB connected'))
    .catch((err) => {
        console.log(err);
    });


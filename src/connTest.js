const express = require('express');
const server = express();
const port = 5000;
require("dotenv").config();

server.get('/', (req, res) => {

    res.sendFile(__dirname+"/index.html");
});

server.get('/about', (req, res) => {

    res.sendFile(__dirname+"/about.html");
});

const url = process.env.URI;

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


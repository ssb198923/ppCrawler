const MongoClient = require("mongodb").MongoClient;
require("dotenv").config();
const url = process.env.URI;
const crawlDb = process.env.DBNAME;
const dbCollenction = process.env.COLLECTION;

exports.insertDb = (data) => {
    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        var dbo = db.db(crawlDb);
        dbo.collection(dbCollenction).insertMany(
            data,
            {
                ordered: false
            },
            function(err, res) {
            if (err) throw err;
            console.log("Number of documents inserted: " + res.insertedCount);
            db.close();
            }
        );
    });
}

exports.updateDb = (query, data) => {
    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        var dbo = db.db(crawlDb);
        console.log(data);
        dbo.collection(dbCollenction).updateMany(
            query,
            data,
            {
                upsert: true
            },
            function(err, res) {
            if (err) throw err;
            console.log("Number of documents updated: " + res.upsertedCount);
            db.close();
            }
        );
    });
}

exports.selectDb = (query) => {
    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        var dbo = db.db(crawlDb);
        dbo.collection(dbCollenction).find(query).toArray( function (err, result) {
            if (err) throw err;
            console.log(result);
            db.close();
        });
    });
}
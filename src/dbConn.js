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

exports.bulkWriteDb = (bulkOps, cb) => {
    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        const dbo = db.db(crawlDb);
        dbo.collection(dbCollenction).bulkWrite(
            bulkOps,
            function(err, res) {
                db.close();
                if (err) throw err;
                return cb(null, res);
            }
        );
    });
}

exports.updateDb = (query, data) => {
    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        var dbo = db.db(crawlDb);
        
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

exports.selectDb = (query, cb) => {
    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        var dbo = db.db(crawlDb);
        dbo.collection(dbCollenction).find(query).toArray( function (err, res) {
            if (err) throw err;
            // console.log(result);
            db.close();
            return cb(null, res);
        });
    });
}
const MongoClient = require("mongodb").MongoClient;
require("dotenv").config();
const url = process.env.URI;
const crawlDb = process.env.DBNAME;
const dbCollenction = process.env.COLLECTION;

exports.bulkWriteDb = (bulkOps) => {
    return new Promise(function (resolve, reject){
        MongoClient.connect(url, function(err, db) {
            if (err) throw err;
            const dbo = db.db(crawlDb);
            dbo.collection(dbCollenction).bulkWrite(
                bulkOps,
                function(err, res) {
                    db.close();
                    if (err) reject(err);
                    resolve(res)
                    return res;
                }
            );
        });
    });
}

exports.selectDb = (query) => {
    return new Promise(function (resolve, reject){
        MongoClient.connect(url, function(err, db) {
            if (err) reject(err);``
            const dbo = db.db(crawlDb);
            dbo.collection(dbCollenction).find(query).sort({ keyword : 1, regutc : 1 }).toArray(function (err, res) {
                if (err) reject(err);
                // console.log(res);
                db.close();
                resolve(res);
                return res;
            });
        });
    });
}

exports.getCount = (query) => {
    return new Promise(function (resolve, reject){
        MongoClient.connect(url, function(err, db) {
            if (err) reject(err);
            const dbo = db.db(crawlDb);
            dbo.collection(dbCollenction).countDocuments(query)
            .then((res) => {
                resolve(res);
                db.close();
                return res;
            })
            .catch((err) => reject(err));
        });
    });
}
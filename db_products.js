
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/mydb";

MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    console.log("Database created!");
    db.close();
});

MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbase = db.db("mobilePhones");
    dbase.createCollection("xiaomi", function(err, res) {
        if (err) throw err;
        console.log("Collection created!");
        db.close();
    });
});

MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbase = db.db("mobilePhones");
    dbase.createCollection("meizu", function(err, res) {
        if (err) throw err;
        console.log("Collection created!");
        db.close();
    });
});
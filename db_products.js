var MongoClient = require('mongodb').MongoClient;

var url = "mongodb://localhost:27017/items";

MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    console.log("Database created!");
    db.close();
});

MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbase = db.db("items");
    dbase.createCollection("phones", function(err, res) {
        if (err) throw err;
        console.log("Collection created!");
        db.close();
    });
});

MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbase = db.db("items");
    dbase.createCollection("clustering", function(err, res) {
        if (err) throw err;
        console.log("Collection created!");
        db.close();
    });
});

//  //  //  //  //  // SORTED   //  //  //
//
// MongoClient.connect(url, function(err, db) {
//     if (err) throw err;
//     var dbase = db.db("items");
//     var mysort = { cluster: 1 };
//     dbase.collection("PhonesClustering").find().sort(mysort).toArray(function(err, result) {
//         if (err) throw err;
//         console.log(result);
//         dbase.collection("clusteringSorted").insertMany(result);
//         db.close();
//     });
// });
//  //  //  //  //  // SORTED   //  //  //


// MongoClient.connect(url, function(err, db) {
//     if (err) throw err;
//     var dbase = db.db("items");
//     dbase.createCollection("cases", function(err, res) {
//         if (err) throw err;
//         console.log("Collection created!");
//         db.close();
//     });
// });
//
// MongoClient.connect(url, function(err, db) {
//     if (err) throw err;
//     var dbase = db.db("items");
//     dbase.createCollection("other", function(err, res) {
//         if (err) throw err;
//         console.log("Collection created!");
//         db.close();
//     });
// });
//





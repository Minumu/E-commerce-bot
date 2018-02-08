var restify = require('restify');
var builder = require('botbuilder');

var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017";

MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    console.log("Database created!");
    db.close();
});

MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbase = db.db("users");
    dbase.createCollection("profiles", function(err, res) {
        if (err) throw err;
        console.log("Collection created!");
        db.close();
    });
});

MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbase = db.db("users");
    dbase.createCollection("orders", function(err, res) {
        if (err) throw err;
        console.log("Collection created!");
        db.close();
    });
});

MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbase = db.db("users");
    dbase.createCollection("UnrecognizedQueries", function(err, res) {
        if (err) throw err;
        console.log("Collection created!");
        db.close();
    });
});

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// Listen for messages from users
server.post('/api/messages', connector.listen());

// Create your bot with a function to receive messages from the user.
// This default message handler is invoked if the user's utterance doesn't
// match any intents handled by other dialogs.

var bot = new builder.UniversalBot(connector,[
    function (session) {
    session.send("Hi! If you have an account, please, say 'log in'! If you don't, please, say 'sign up'! :)");}
]);

// bot.on('conversationUpdate', function(session){
//         bot.beginDialog(session.address, 'hi');
// });
//
// bot.dialog('hi', [
//     function (session) {
//         session.send("Hi! If you have an account, please, say 'log in'! If you don't, please, say 'sign up'! :)");
//     }
// ]);

bot.dialog('sign up', [
    function (session) {
        session.send("Let's create an account!");
        builder.Prompts.text(session, "Please, enter your first name");
    },
    function (session, results) {
        MongoClient.connect(url, function(err, db) {
            if (err) throw err;
            var myobj = { FirstName: results.response, LastName: ".", UserName: "." };
            var dbase = db.db("users");
            dbase.collection("profiles").insertOne(myobj, function(err, res) {
                if (err) throw err;
                console.log("1 document inserted");
                db.close();
            });
        });
        builder.Prompts.text(session, "... and your last name");
    },
    function (session, results) {
        MongoClient.connect(url, function(err, db) {
            if (err) throw err;
            var dbase = db.db("users");
            var myquery = { LastName: "." };
            var newvalues = { $set: { LastName: results.response } };
            dbase.collection("profiles").updateOne(myquery, newvalues, function(err, res) {
                if (err) throw err;
                console.log("1 document updated");
                db.close();
            });
        });
        session.replaceDialog('addUserName');
    }
]).triggerAction({ matches: /^(sign up)/i });

bot.dialog('addUserName', [
    function (session, args) {
        if (args && args.reprompt) {
            builder.Prompts.text(session, "Oops, this login is already taken :(. I know, it is annoying, but please, choose another one");
        } else {
            session.send("Thanks! Almost done! I need a login, it must be unique and more than five characters");
            builder.Prompts.text(session, "Please, enter a login");
        }
    },
    function (session, results) {
        session.userData.userName = results.response;
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            var dbase = db.db("users");
            var query = { UserName: session.userData.userName };
            dbase.collection("profiles").find(query).toArray(function (err, result) {
                if (err) throw err;
                if (result.length !== 0)
                    session.replaceDialog('addUserName', { reprompt: true });
                else {
                    var myquery = {UserName: "."};
                    var newvalues = {$set: {UserName: results.response}};
                    dbase.collection("profiles").updateOne(myquery, newvalues, function (err, res) {
                        if (err) throw err;
                        console.log("1 document updated");
                        db.close();
                    });
                    session.send(session.userData.userName + ", welcome to our online-shop! I will help you to choose all what you need (and even more)! :)");
                    session.replaceDialog('start');
                }
            });

        });
        session.send().endDialog();
    }
]);

bot.dialog('log in', [
    function (session, args) {
        if (args && args.reprompt) {
            builder.Prompts.text(session, "I do not find this login :(. Please, try again or say 'sign up' to create new one");
        } else {
            builder.Prompts.text(session, "Please, enter your login");
        }
    },
    function (session, results) {
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            var dbase = db.db("users");
            session.userData.userName = results.response;
            var query = { UserName: session.userData.userName };
            dbase.collection("profiles").find(query).toArray(function (err, result) {
                if (err) throw err;
                console.log(result);
                if (result.length === 0)
                    session.replaceDialog('log in', { reprompt: true });
                else {
                    session.send(session.userData.userName + ", welcome back to our online-shop! I will help you to choose all what you need (and even more)! :)");
                    session.replaceDialog('start');
                }
            });
        });
        session.send().endDialog();
    }
]).triggerAction({ matches: /^(log in)/i });

bot.dialog('start', [
    function (session) {
        var msg = new builder.Message(session)
            .text("What are you looking for today?")
            .suggestedActions(
                builder.SuggestedActions.create(
                    session,[
                        builder.CardAction.imBack(session, "Mobile phones", "Mobile phones"),
                        builder.CardAction.imBack(session, "Cases", "Cases"),
                        builder.CardAction.imBack(session, "Mobile phone accessories", "Mobile phone accessories")
                    ]
                )
            );
        builder.Prompts.choice(session, msg, ["Mobile phones", "Cases", "Mobile phone accessories"]);
    },
    function(session, results) {
        session.replaceDialog(results.response.entity);
    }
]).triggerAction({ matches: /^(buy|buy something|categories|show categories)$/i });

bot.dialog('Cases', [
    function (session) {
        var msg = new builder.Message(session)
            .text("Let's choose the producer!")
            .suggestedActions(
                builder.SuggestedActions.create(
                    session,[
                        builder.CardAction.imBack(session, "XIAOMI", "XIAOMI"),
                        builder.CardAction.imBack(session, "MEIZU", "MEIZU"),
                        builder.CardAction.imBack(session, "SAMSUNG", "SAMSUNG"),
                        builder.CardAction.imBack(session, "HTC", "HTC"),
                        builder.CardAction.imBack(session, "APPLE", "APPLE")
                    ]
                )
            );
        builder.Prompts.choice(session, msg, ["Xiaomi", "Meizu", "Samsung", "HTC", "Apple"]);
    },
    function(session, results) {
        session.replaceDialog(results.response.entity + " case");
    }
]).triggerAction({ matches: /(case|cases|phone cases|phone case|covers|phone covers|mobile phone case)$/i });

function findCase(query, callback) {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbase = db.db("items");
        dbase.collection("cases").find({"phoneProducer":query}).toArray(function (err, myDoc) {
            if (err) {
                callback(err, null);
            } else {
                callback(null, myDoc);
            }
        });
    });
}

bot.dialog('Xiaomi case', [
    function (session) {
        session.send("Okay, that's what I found");
        var query = "Xiaomi";
        var myDoc;
        findCase(query, function (err, content) {
            if (err) {
                console.log(err);
            } else {
                myDoc = content;
                var msg = new builder.Message(session);
                msg.attachmentLayout(builder.AttachmentLayout.carousel);
                var arr = [];
                for (var i = 0; i < myDoc.length; i++) {
                    // console.log(myDoc);
                    var title = myDoc[i].type;
                    var subtitle = myDoc[i].phoneProducer + " " + myDoc[i].model;
                    var price = myDoc[i].price + " UAH";
                    var link = myDoc[i].link;
                    arr[i] =
                        new builder.HeroCard(session)
                            .title(title)
                            .subtitle(subtitle)
                            .text(price)
                            .images([builder.CardImage.create(session, link)])
                            .buttons([
                                builder.CardAction.imBack(session, "buy case xiaomi " +
                                    "model: " + myDoc[i].model + " price: " + myDoc[i].price + " UAH", "Buy")
                            ])
                }
                msg.attachments(arr);
                session.send(msg);
            }
        });
    }
]).triggerAction({ matches: /^(xiaomi case|buy xiaomi case)$/i });

bot.dialog('Meizu case', [
    function (session) {
        session.send("Okay, that's what I found");
        var query = "Meizu";
        var myDoc;
        findCase(query, function (err, content) {
            if (err) {
                console.log(err);
            } else {
                myDoc = content;
                var msg = new builder.Message(session);
                msg.attachmentLayout(builder.AttachmentLayout.carousel);
                var arr = [];
                for (var i = 0; i < myDoc.length; i++) {
                    // console.log(myDoc);
                    var title = myDoc[i].type;
                    var subtitle = myDoc[i].phoneProducer + " " + myDoc[i].model;
                    var price = myDoc[i].price + " UAH";
                    var link = myDoc[i].link;
                    arr[i] =
                        new builder.HeroCard(session)
                            .title(title)
                            .subtitle(subtitle)
                            .text(price)
                            .images([builder.CardImage.create(session, link)])
                            .buttons([
                                builder.CardAction.imBack(session, "buy case meizu " +
                                    "model: " + myDoc[i].model + " price: " + myDoc[i].price + " UAH", "Buy")
                            ])
                }
                msg.attachments(arr);
                session.send(msg);
            }
        });
    }
]).triggerAction({ matches: /^(meizu case|buy meizu case)$/i });

bot.dialog('Samsung case', [
    function (session) {
        session.send("Okay, that's what I found");
        var query = "Samsung";
        var myDoc;
        findCase(query, function (err, content) {
            if (err) {
                console.log(err);
            } else {
                myDoc = content;
                var msg = new builder.Message(session);
                msg.attachmentLayout(builder.AttachmentLayout.carousel);
                var arr = [];
                for (var i = 0; i < myDoc.length; i++) {
                    // console.log(myDoc);
                    var title = myDoc[i].type;
                    var subtitle = myDoc[i].phoneProducer + " " + myDoc[i].model;
                    var price = myDoc[i].price + " UAH";
                    var link = myDoc[i].link;
                    arr[i] =
                        new builder.HeroCard(session)
                            .title(title)
                            .subtitle(subtitle)
                            .text(price)
                            .images([builder.CardImage.create(session, link)])
                            .buttons([
                                builder.CardAction.imBack(session, "buy case samsung " +
                                    "model: " + myDoc[i].model + " price: " + myDoc[i].price + " UAH", "Buy")
                            ])
                }
                msg.attachments(arr);
                session.send(msg);
            }
        });
    }
]).triggerAction({ matches: /^(samsung case|buy samsung case)$/i });

bot.dialog('HTC case', [
    function (session) {
        session.send("Okay, that's what I found");
        var query = "HTC";
        var myDoc;
        findCase(query, function (err, content) {
            if (err) {
                console.log(err);
            } else {
                myDoc = content;
                var msg = new builder.Message(session);
                msg.attachmentLayout(builder.AttachmentLayout.carousel);
                var arr = [];
                for (var i = 0; i < myDoc.length; i++) {
                    // console.log(myDoc);
                    var title = myDoc[i].type;
                    var subtitle = myDoc[i].phoneProducer + " " + myDoc[i].model;
                    var price = myDoc[i].price + " UAH";
                    var link = myDoc[i].link;
                    arr[i] =
                        new builder.HeroCard(session)
                            .title(title)
                            .subtitle(subtitle)
                            .text(price)
                            .images([builder.CardImage.create(session, link)])
                            .buttons([
                                builder.CardAction.imBack(session, "buy case HTC " +
                                    "model: " + myDoc[i].model + " price: " + myDoc[i].price + " UAH", "Buy")
                            ])
                }
                msg.attachments(arr);
                session.send(msg);
            }
        });
    }
]).triggerAction({ matches: /^(htc case|buy htc case)$/i });

bot.dialog('Apple case', [
    function (session) {
        session.send("Okay, that's what I found");
        var query = "Apple";
        var myDoc;
        findCase(query, function (err, content) {
            if (err) {
                console.log(err);
            } else {
                myDoc = content;
                var msg = new builder.Message(session);
                msg.attachmentLayout(builder.AttachmentLayout.carousel);
                var arr = [];
                for (var i = 0; i < myDoc.length; i++) {
                    // console.log(myDoc);
                    var title = myDoc[i].type;
                    var subtitle = myDoc[i].phoneProducer + " " + myDoc[i].model;
                    var price = myDoc[i].price + " UAH";
                    var link = myDoc[i].link;
                    arr[i] =
                        new builder.HeroCard(session)
                            .title(title)
                            .subtitle(subtitle)
                            .text(price)
                            .images([builder.CardImage.create(session, link)])
                            .buttons([
                                builder.CardAction.imBack(session, "buy case apple " +
                                    "model: " + myDoc[i].model + " price: " + myDoc[i].price + " UAH", "Buy")
                            ])
                }
                msg.attachments(arr);
                session.send(msg);
            }
        });
    }
]).triggerAction({ matches: /^(apple case|buy apple case)$/i });


bot.dialog('Mobile phone accessories', [
    function (session) {
        var msg = new builder.Message(session)
            .text("Let's choose the producer!")
            .suggestedActions(
                builder.SuggestedActions.create(
                    session,[
                        builder.CardAction.imBack(session, "XIAOMI", "XIAOMI"),
                        builder.CardAction.imBack(session, "MEIZU", "MEIZU"),
                        builder.CardAction.imBack(session, "SAMSUNG", "SAMSUNG"),
                        builder.CardAction.imBack(session, "HTC", "HTC"),
                        builder.CardAction.imBack(session, "APPLE", "APPLE")
                    ]
                )
            );
        builder.Prompts.choice(session, msg, ["Xiaomi", "Meizu", "Samsung", "HTC", "Apple"]);
    },
    function(session, results) {
        session.replaceDialog(results.response.entity + " screen");
    }
]).triggerAction({ matches: /(screen|phone screen|phone screen protector|phone protector|mobile phone screen protector)$/i });

function findScreen(query, callback) {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbase = db.db("items");
        dbase.collection("accessories").find({"phoneProducer":query}).toArray(function (err, myDoc) {
            if (err) {
                callback(err, null);
            } else {
                callback(null, myDoc);
            }
        });
    });
}

bot.dialog('Xiaomi screen', [
    function (session) {
        session.send("Okay, that's what I found");
        var query = "Xiaomi";
        var myDoc;
        findScreen(query, function (err, content) {
            if (err) {
                console.log(err);
            } else {
                myDoc = content;
                var msg = new builder.Message(session);
                msg.attachmentLayout(builder.AttachmentLayout.carousel);
                var arr = [];
                for (var i = 0; i < myDoc.length; i++) {
                    // console.log(myDoc);
                    var title = myDoc[i].type;
                    var subtitle = myDoc[i].phoneProducer + " " + myDoc[i].model;
                    var price = myDoc[i].price + " UAH";
                    var link = myDoc[i].link;
                    arr[i] =
                        new builder.HeroCard(session)
                            .title(title)
                            .subtitle(subtitle)
                            .text(price)
                            .images([builder.CardImage.create(session, link)])
                            .buttons([
                                builder.CardAction.imBack(session, "buy screen protector xiaomi " +
                                    "model: " + myDoc[i].model + " price: " + myDoc[i].price + " UAH", "Buy")
                            ])
                }
                msg.attachments(arr);
                session.send(msg);
            }
        });
    }
]).triggerAction({ matches: /^(xiaomi screen protector|buy xiaomi screen protector)$/i });

bot.dialog('Meizu screen', [
    function (session) {
        session.send("Okay, that's what I found");
        var query = "Meizu";
        var myDoc;
        findScreen(query, function (err, content) {
            if (err) {
                console.log(err);
            } else {
                myDoc = content;
                var msg = new builder.Message(session);
                msg.attachmentLayout(builder.AttachmentLayout.carousel);
                var arr = [];
                for (var i = 0; i < myDoc.length; i++) {
                    // console.log(myDoc);
                    var title = myDoc[i].type;
                    var subtitle = myDoc[i].phoneProducer + " " + myDoc[i].model;
                    var price = myDoc[i].price + " UAH";
                    var link = myDoc[i].link;
                    arr[i] =
                        new builder.HeroCard(session)
                            .title(title)
                            .subtitle(subtitle)
                            .text(price)
                            .images([builder.CardImage.create(session, link)])
                            .buttons([
                                builder.CardAction.imBack(session, "buy screen protector meizu " +
                                    "model: " + myDoc[i].model + " price: " + myDoc[i].price + " UAH", "Buy")
                            ])
                }
                msg.attachments(arr);
                session.send(msg);
            }
        });
    }
]).triggerAction({ matches: /^(meizu screen protector|buy meizu screen protector)$/i });

bot.dialog('Samsung screen', [
    function (session) {
        session.send("Okay, that's what I found");
        var query = "Samsung";
        var myDoc;
        findScreen(query, function (err, content) {
            if (err) {
                console.log(err);
            } else {
                myDoc = content;
                var msg = new builder.Message(session);
                msg.attachmentLayout(builder.AttachmentLayout.carousel);
                var arr = [];
                for (var i = 0; i < myDoc.length; i++) {
                    // console.log(myDoc);
                    var title = myDoc[i].type;
                    var subtitle = myDoc[i].phoneProducer + " " + myDoc[i].model;
                    var price = myDoc[i].price + " UAH";
                    var link = myDoc[i].link;
                    arr[i] =
                        new builder.HeroCard(session)
                            .title(title)
                            .subtitle(subtitle)
                            .text(price)
                            .images([builder.CardImage.create(session, link)])
                            .buttons([
                                builder.CardAction.imBack(session, "buy screen protector samsung " +
                                    "model: " + myDoc[i].model + " price: " + myDoc[i].price + " UAH", "Buy")
                            ])
                }
                msg.attachments(arr);
                session.send(msg);
            }
        });
    }
]).triggerAction({ matches: /^(samsung screen protector|buy samsung screen protector)$/i });

bot.dialog('HTC screen', [
    function (session) {
        session.send("Okay, that's what I found");
        var query = "HTC";
        var myDoc;
        findScreen(query, function (err, content) {
            if (err) {
                console.log(err);
            } else {
                myDoc = content;
                var msg = new builder.Message(session);
                msg.attachmentLayout(builder.AttachmentLayout.carousel);
                var arr = [];
                for (var i = 0; i < myDoc.length; i++) {
                    // console.log(myDoc);
                    var title = myDoc[i].type;
                    var subtitle = myDoc[i].phoneProducer + " " + myDoc[i].model;
                    var price = myDoc[i].price + " UAH";
                    var link = myDoc[i].link;
                    arr[i] =
                        new builder.HeroCard(session)
                            .title(title)
                            .subtitle(subtitle)
                            .text(price)
                            .images([builder.CardImage.create(session, link)])
                            .buttons([
                                builder.CardAction.imBack(session, "buy screen protector HTC " +
                                    "model: " + myDoc[i].model + " price: " + myDoc[i].price + " UAH", "Buy")
                            ])
                }
                msg.attachments(arr);
                session.send(msg);
            }
        });
    }
]).triggerAction({ matches: /^(htc screen protector|buy htc screen protector)$/i });

bot.dialog('Apple screen', [
    function (session) {
        session.send("Okay, that's what I found");
        var query = "Apple";
        var myDoc;
        findScreen(query, function (err, content) {
            if (err) {
                console.log(err);
            } else {
                myDoc = content;
                var msg = new builder.Message(session);
                msg.attachmentLayout(builder.AttachmentLayout.carousel);
                var arr = [];
                for (var i = 0; i < myDoc.length; i++) {
                    // console.log(myDoc);
                    var title = myDoc[i].type;
                    var subtitle = myDoc[i].phoneProducer + " " + myDoc[i].model;
                    var price = myDoc[i].price + " UAH";
                    var link = myDoc[i].link;
                    arr[i] =
                        new builder.HeroCard(session)
                            .title(title)
                            .subtitle(subtitle)
                            .text(price)
                            .images([builder.CardImage.create(session, link)])
                            .buttons([
                                builder.CardAction.imBack(session, "buy screen protector apple " +
                                    "model: " + myDoc[i].model + " price: " + myDoc[i].price + " UAH", "Buy")
                            ])
                }
                msg.attachments(arr);
                session.send(msg);
            }
        });
    }
]).triggerAction({ matches: /^(apple screen protector|buy apple screen protector)$/i });


function findPrices(session, callback) {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbase = db.db("items");
        for (var i = 0; i < 5; i++) {
            var query = {cluster: String(i)};
            dbase.collection("clustering").find(query).toArray(function (err, result) {
                if (err) throw err;
                // console.log(result);
                var maxMin = {cluster: result[0].cluster, max: 0, min: 500000};
                for (var j = 0; j < result.length; j++) {
                    if (parseInt(result[j].price) < maxMin.min) {
                        maxMin.min = parseInt(result[j].price);
                        // maxMin.cluster = parseInt(result[j].cluster);
                    }
                    if (parseInt(result[j].price) > maxMin.max) {
                        maxMin.max = parseInt(result[j].price);
                        // maxMin.cluster = parseInt(result[j].cluster);
                    }
                }
                session.conversationData.prices.push(maxMin);
            });
        }
    });
    callback(null, session.conversationData.prices);
}

bot.dialog('Mobile phones', [
    function (session) {
        var msg = new builder.Message(session)
        .text("You always can return and choose another category! Just say me 'buy' and I will understand ;)!")
            .suggestedActions(
                builder.SuggestedActions.create(
                    session, [
                        builder.CardAction.imBack(session, "Choose producer", "Choose producer"),
                        builder.CardAction.imBack(session, "Choose price", "Choose price")
                    ]
                )
            );
        builder.Prompts.choice(session, msg, ["Choose producer", "Choose price"]);
        if (session.conversationData.prices === undefined) {
            session.conversationData.prices = [];
            findPrices(session, function (err, content) {
                if (err) throw err;
                session.conversationData.prices = content;
            })
        }
    },
    function(session, results) {
        session.replaceDialog(results.response.entity);
    }
]).triggerAction({ matches: /(mobile phones|mobile phone|phone)$/i });

bot.dialog('Choose producer', [
    function (session) {
        var msg = new builder.Message(session)
        .text("Okay, let's choose the producer!")
            .suggestedActions(
                    builder.SuggestedActions.create(
                        session,[
                            builder.CardAction.imBack(session, "XIAOMI", "XIAOMI"),
                            builder.CardAction.imBack(session, "MEIZU", "MEIZU"),
                            builder.CardAction.imBack(session, "SAMSUNG", "SAMSUNG"),
                            builder.CardAction.imBack(session, "HTC", "HTC"),
                            builder.CardAction.imBack(session, "APPLE", "APPLE")
                        ]
                    )
                );
            builder.Prompts.choice(session, msg, ["Xiaomi", "Meizu", "Samsung", "HTC", "Apple"]);
    },
    function(session, results) {
        session.replaceDialog(results.response.entity);
    }
]).triggerAction({ matches: /(producer|choose producer)$/i });

bot.dialog('Choose price', [
    function (session) {
    console.log(session.conversationData.prices);
        var clusters = [];
        var index;
        for (var i = 0; i < session.conversationData.prices.length; i++) {
            var min = 500000;
            for (var j = 0; j < session.conversationData.prices.length; j++) {
                if (clusters.length === 0) {
                    if (session.conversationData.prices[j].min < min) {
                        index = session.conversationData.prices[j].cluster;
                        min = session.conversationData.prices[j].min;
                    }
                }
                else {
                    var number = parseInt(clusters[i - 1]);
                    for (var k = 0; k < session.conversationData.prices.length; k++) {
                        if (parseInt(session.conversationData.prices[k].cluster) === number)
                            break;
                    }
                    if (session.conversationData.prices[j].min < min &&
                        session.conversationData.prices[j].min > session.conversationData.prices[k].min) {
                        index = session.conversationData.prices[j].cluster;
                        min = session.conversationData.prices[j].min;
                    }
                }
            }
            clusters.push(index);
        }
        // session.conversationData.prices[j].min > session.conversationData.prices[parseInt(clusters[i - 1])].min
        session.conversationData.clusters = clusters;
        console.log(session.conversationData.clusters);
        var sortedClusters = [];
        for (i = 0; i < session.conversationData.clusters.length; i++) {
            for (j = 0; j < session.conversationData.prices.length; j++) {
                if (session.conversationData.prices[j].cluster === session.conversationData.clusters[i]) {
                    var str = session.conversationData.prices[j].min +
                        " - " + session.conversationData.prices[j].max +
                        " UAH";
                    sortedClusters.push(str);
                }
            }
        }
        console.log(sortedClusters);
        var msg = new builder.Message(session)
            .text("Okay, let's choose the price!")
            .suggestedActions(
                builder.SuggestedActions.create(
                    session,[
                        builder.CardAction.imBack(session, "cluster 1",
                            sortedClusters[0]),
                        builder.CardAction.imBack(session, "cluster 2",
                            sortedClusters[1]),
                        builder.CardAction.imBack(session, "cluster 3",
                            sortedClusters[2]),
                        builder.CardAction.imBack(session, "cluster 4",
                            sortedClusters[3]),
                        builder.CardAction.imBack(session, "cluster 5",
                            sortedClusters[4])
                    ]
                )
            );
        builder.Prompts.choice(session, msg, [
            "cluster 1: " + sortedClusters[0],
            "cluster 2: " + sortedClusters[1],
            "cluster 3: " + sortedClusters[2],
            "cluster 4: " + sortedClusters[3],
            "cluster 5: " + sortedClusters[4]]);
    },
    function(session, results) {
        session.conversationData.dialog = results.response.entity;
         session.send(results.response.entity);
        session.replaceDialog('cluster');
    }
]).triggerAction({ matches: /(choose price)$/i });

function findCluster(query, callback) {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbase = db.db("items");
        dbase.collection("clustering").find(query).toArray(function (err, myDoc) {
            if (err) {
                callback(err, null);
            } else {
                callback(null, myDoc);
            }
        });
    });
}

bot.dialog('cluster', [
    function (session) {
        session.send("Okay, that's what I found");
        console.log(session.conversationData.clusters);
        var split = session.conversationData.dialog.split(":")[0].split(" ")[1];

        var query = {cluster: String(session.conversationData.clusters[parseInt(split) - 1])};
        var myDoc;
        findCluster(query, function (err, content) {
            if (err) {
                console.log(err);
            } else {
                myDoc = content;
                // console.log(myDoc);
                var msg = new builder.Message(session);
                msg.attachmentLayout(builder.AttachmentLayout.carousel);
                var arr = [];
                for (var i = 0; i < myDoc.length; i++) {
                    // console.log(myDoc);
                    var title = myDoc[i].producer + " " + myDoc[i].model;
                    var subtitle = myDoc[i].display;
                    var price = myDoc[i].price + " UAH";
                    var link = myDoc[i].link;
                    arr[i] =
                        new builder.HeroCard(session)
                            .title(title)
                            .subtitle(subtitle)
                            .text(price)
                            .images([builder.CardImage.create(session, link)])
                            .buttons([
                                builder.CardAction.imBack(session, "buy " + myDoc[i].producer +
                                    " model: " + myDoc[i].model + " price: " + myDoc[i].price + " UAH", "Buy")
                            ])
                }
                msg.attachments(arr);
                session.send(msg);
            }
        });
    }
]).triggerAction({ matches: /^(cluster)$/i });

function find(query, callback) {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbase = db.db("items");
        dbase.collection("phones").find({"producer":query}).toArray(function (err, myDoc) {
            if (err) {
                callback(err, null);
            } else {
                callback(null, myDoc);
            }
        });
    });
}

bot.dialog('Xiaomi', [
    function (session) {
        session.send("Okay, that's what I found");
        var query = "Xiaomi";
        var myDoc;
        find(query, function (err, content) {
            if (err) {
                console.log(err);
            } else {
                myDoc = content;
                var msg = new builder.Message(session);
                msg.attachmentLayout(builder.AttachmentLayout.carousel);
                var arr = [];
                for (var i = 0; i < myDoc.length; i++) {
                    // console.log(myDoc);
                    var title = myDoc[i].model;
                    var subtitle = myDoc[i].display;
                    var price = myDoc[i].price + " UAH";
                    var link = myDoc[i].link;
                    arr[i] =
                        new builder.HeroCard(session)
                            .title(title)
                            .subtitle(subtitle)
                            .text(price)
                            .images([builder.CardImage.create(session, link)])
                            .buttons([
                                builder.CardAction.imBack(session, "buy xiaomi " +
                                    "model: " + myDoc[i].model + " price: " + myDoc[i].price + " UAH", "Buy")
                            ])
                }
                msg.attachments(arr);
                session.send(msg);
            }
        });
    }
]).triggerAction({ matches: /^(xiaomi|buy xiaomi)$/i });

bot.dialog('Meizu', [
    function (session) {
        session.send("Okay, that's what I found");
        var query = "Meizu";
        var myDoc;
        find(query, function (err, content) {
            if (err) {
                console.log(err);
            } else {
                myDoc = content;
                var msg = new builder.Message(session);
                msg.attachmentLayout(builder.AttachmentLayout.carousel);
                var arr = [];
                for (var i = 0; i < myDoc.length; i++) {
                    // console.log(myDoc);
                    var title = myDoc[i].model;
                    var subtitle = myDoc[i].display;
                    var price = myDoc[i].price + " UAH";
                    var link = myDoc[i].link;
                    arr[i] =
                        new builder.HeroCard(session)
                            .title(title)
                            .subtitle(subtitle)
                            .text(price)
                            .images([builder.CardImage.create(session, link)])
                            .buttons([
                                builder.CardAction.imBack(session, "buy meizu " +
                                    "model: " + myDoc[i].model + " price: " + myDoc[i].price + " UAH", "Buy")
                            ])
                }
                msg.attachments(arr);
                session.send(msg);
            }
        });
    }
]).triggerAction({ matches: /^(meizu|buy meizu)$/i });

bot.dialog('Samsung', [
    function (session) {
        session.send("Okay, that's what I found");
        var query = "Samsung";
        var myDoc;
        find(query, function (err, content) {
            if (err) {
                console.log(err);
            } else {
                myDoc = content;
                var msg = new builder.Message(session);
                msg.attachmentLayout(builder.AttachmentLayout.carousel);
                var arr = [];
                for (var i = 0; i < myDoc.length; i++) {
                    // console.log(myDoc);
                    var title = myDoc[i].model;
                    var subtitle = myDoc[i].display;
                    var price = myDoc[i].price + " UAH";
                    var link = myDoc[i].link;
                    arr[i] =
                        new builder.HeroCard(session)
                            .title(title)
                            .subtitle(subtitle)
                            .text(price)
                            .images([builder.CardImage.create(session, link)])
                            .buttons([
                                builder.CardAction.imBack(session, "buy samsung " +
                                    "model: " + myDoc[i].model + " price: " + myDoc[i].price + " UAH", "Buy")
                            ])
                }
                msg.attachments(arr);
                session.send(msg);
            }
        });
    }
]).triggerAction({ matches: /^(samsung|buy samsung)$/i });

bot.dialog('HTC', [
    function (session) {
        session.send("Okay, that's what I found");
        var query = "HTC";
        var myDoc;
        find(query, function (err, content) {
            if (err) {
                console.log(err);
            } else {
                myDoc = content;
                var msg = new builder.Message(session);
                msg.attachmentLayout(builder.AttachmentLayout.carousel);
                var arr = [];
                for (var i = 0; i < myDoc.length; i++) {
                    // console.log(myDoc);
                    var title = myDoc[i].model;
                    var subtitle = myDoc[i].display;
                    var price = myDoc[i].price + " UAH";
                    var link = myDoc[i].link;
                    arr[i] =
                        new builder.HeroCard(session)
                            .title(title)
                            .subtitle(subtitle)
                            .text(price)
                            .images([builder.CardImage.create(session, link)])
                            .buttons([
                                builder.CardAction.imBack(session, "buy HTC " +
                                    "model: " + myDoc[i].model + " price: " + myDoc[i].price + " UAH", "Buy")
                            ])
                }
                msg.attachments(arr);
                session.send(msg);
            }
        });
    }
]).triggerAction({ matches: /^(HTC|buy HTC)$/i });

bot.dialog('Apple', [
    function (session) {
        session.send("Okay, that's what I found");
        var query = "Apple";
        var myDoc;
        find(query, function (err, content) {
            if (err) {
                console.log(err);
            } else {
                myDoc = content;
                var msg = new builder.Message(session);
                msg.attachmentLayout(builder.AttachmentLayout.carousel);
                var arr = [];
                for (var i = 0; i < myDoc.length; i++) {
                    // console.log(myDoc);
                    var title = myDoc[i].model;
                    var subtitle = myDoc[i].display;
                    var price = myDoc[i].price + " UAH";
                    var link = myDoc[i].link;
                    arr[i] =
                        new builder.HeroCard(session)
                            .title(title)
                            .subtitle(subtitle)
                            .text(price)
                            .images([builder.CardImage.create(session, link)])
                            .buttons([
                                builder.CardAction.imBack(session, "buy apple " +
                                    "model: " + myDoc[i].model + " price: " + myDoc[i].price + " UAH", "Buy")
                            ])
                }
                msg.attachments(arr);
                session.send(msg);
            }
        });
    }
]).triggerAction({ matches: /^(apple|buy apple)$/i });

function findItem(i, collection, model, callback) {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbase = db.db("items");
        console.log("collection");
        console.log(collection);
        var query = { model: model };
        dbase.collection(collection).find(query).toArray(function (err, myDoc) {
            if (err) {
                callback(err, null, i);
            } else {
                callback(null, myDoc, i);
            }
        });
    });
}

bot.dialog('recommend', [
    function (session) {
    if (session.userData.cart[session.userData.cart.length - 1].producer !== "case" &&
        session.userData.cart[session.userData.cart.length - 1].producer !== "screen protector") {
        session.send("Look what I found for you!");
        var model = session.userData.cart[session.userData.cart.length - 1].model;
        var myDoc;
        findItem(0, "cases", model, function (err, content, j) {
            if (err) throw err;
            myDoc = content;
            var arr = [];
            for (var i = 0; i < myDoc.length; i++) {
                var subtitle = myDoc[i].model;
                var title = myDoc[i].type;
                var price = myDoc[i].price + " UAH";
                var link = myDoc[i].link;
                arr[i] =
                    new builder.HeroCard(session)
                        .title(title)
                        .subtitle(subtitle)
                        .text(price)
                        .images([builder.CardImage.create(session, link)])
                        .buttons([
                            builder.CardAction.imBack(session, "buy " + myDoc[i].type +
                                " model: " + myDoc[i].model + " price: " + myDoc[i].price + " UAH", "Buy")
                        ])
            }
            findItem(arr, "accessories", model, function (err, content, arr) {
                if (err) throw err;
                myDoc = content;
                var msg = new builder.Message(session);
                msg.attachmentLayout(builder.AttachmentLayout.carousel);
                for (var i = 0; i < myDoc.length; i++) {
                    var subtitle = myDoc[i].model;
                    var title = myDoc[i].type;
                    var price = myDoc[i].price + " UAH";
                    var link = myDoc[i].link;
                    arr[i + 1] =
                        new builder.HeroCard(session)
                            .title(title)
                            .subtitle(subtitle)
                            .text(price)
                            .images([builder.CardImage.create(session, link)])
                            .buttons([
                                builder.CardAction.imBack(session, "buy " + myDoc[i].type +
                                    " model: " + myDoc[i].model + " price: " + myDoc[i].price + " UAH", "Buy")
                            ])
                }
                msg.attachments(arr);
                session.send(msg);
            })
        })
    }
}]);

// Add dialog to handle 'Buy' button click
bot.dialog('buyButtonClick', [
    function (session, args) {
        // console.log(args);
        var collection = "phones";
        if (args.intent.matched.input.match(/(buy.*?model.*?price.*?UAH)/)) {
            var utterance = args.intent.matched.input;
            var model = utterance.slice((utterance.indexOf(":") + 2), (utterance.lastIndexOf("price") - 1));
            var price = utterance.slice((utterance.lastIndexOf(":") + 1), (utterance.length));
            var producer = utterance.split(" ")[1];
            if (model && price && producer) {
                // Initialize cart item
                if (producer === "case")
                    collection = "cases";
                else if (producer === "screen") {
                    producer = "screen protector";
                    collection = "accessories";
                }
                var item = session.dialogData.item = {
                    model: model,
                    price: price,
                    producer: producer,
                    link: ""
                };
                if (!session.userData.cart) {
                    session.userData.cart = [];
                }
                session.userData.cart.push(item);
                console.log(session.userData.cart[session.userData.cart.length - 1].producer);
                if (session.userData.cart[session.userData.cart.length - 1].producer === "case")
                    collection = "cases";
                else if (session.userData.cart[session.userData.cart.length - 1].producer === "screen protector")
                    collection = "accessories";
                else
                    collection = "phones";
                findItem(0, collection, session.userData.cart[session.userData.cart.length - 1].model, function (err, content, j) {
                    if (err)
                        console.log(err);
                    else {
                        session.userData.cart[session.userData.cart.length - 1].link = content[0].link;
                    }
                });
                // Send confirmation to users
                session.send(item.producer + " " + item.model + " has been added to your cart. You can say 'cart' to see" +
                    " all products in your cart or say 'buy' to continue shopping");
                session.replaceDialog('recommend').endDialog();
            } else {
                // Invalid product
                session.send("I'm sorry... That product wasn't found.").endDialog();
            }
        }
        else {
            session.send("I'm sorry... That product wasn't found. Say 'buy' to choose product").endDialog();
        }
    }
]).triggerAction({ matches: /(buy)/i });

bot.dialog('order', [
    function (session) {
        var today = new Date();
        if (session.userData.cart.length !== 0) {
            session.send("Please, follow the link to pay: www.example.com");
            session.send("You can view your previous orders! Say 'my orders' and I will show them to you");
            MongoClient.connect(url, function(err, db) {
                if (err) throw err;
                var myobj = { date: today, login: session.userData.userName, order: session.userData.cart };
                var dbase = db.db("users");
                dbase.collection("orders").insertOne(myobj, function(err, res) {
                    if (err) throw err;
                    console.log("1 document inserted");
                    db.close();
                });
            });
            builder.Prompts.confirm(session, "Back to shopping?");

        } else {
            session.send("Your cart is empty. Say 'buy' to choose something.").endDialog();
        }
    },
    function (session, results) {
        if (results.response === true) {
            session.userData.cart = [];
            session.replaceDialog('start');
        } else {
            session.replaceDialog('bye');
        }
    }
]).triggerAction({ matches: /(order)/i });

function findOrder(query, callback) {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbase = db.db("users");
        dbase.collection("orders").find({"login":query}).toArray(function (err, myDoc) {
            if (err) {
                callback(err, null);
            } else {
                callback(null, myDoc);
            }
        });
    });
}

bot.dialog('my orders', [
    function (session) {
    var myDoc;
    var query = session.userData.userName;
        findOrder(query, function (err, content) {
            if (err) {
                console.log(err);
            } else {
                myDoc = content;
                if (myDoc.length !== 0) {
                    var arr = "";
                    for (var i = 0; i < myDoc.length; i++) {
                        var total = 0;
                        arr = arr + "ORDER #" + (i + 1) + " date:" + myDoc[i].date + "/";
                        for (var j = 0; j < myDoc[i].order.length; j++) {
                            arr = arr + "producer: " + myDoc[i].order[j].producer + " model: " + myDoc[i].order[j].model + " price: "
                                + myDoc[i].order[j].price + "|";
                            total += parseInt(myDoc[i].order[j].price);
                        }
                        arr = arr + " TOTAL: " + total + "/||||";
                    }
                    session.send(arr).endDialog();
                } else {
                    session.send("You don't have previous orders! Say 'buy' to choose something.").endDialog();
                }
            }
        });
    },
    function (session, results) {
        if (results.response === true) {
            session.userData.cart = [];
            session.replaceDialog('start');
        } else {
            session.replaceDialog('bye');
        }
    }
]).triggerAction({ matches: /(my orders)/i });

bot.dialog('cart', [
    function (session) {
        if (session.userData.cart.length !== 0) {
            var msg = new builder.Message(session);
            msg.attachmentLayout(builder.AttachmentLayout.carousel);
            var arr = [];
            for (var i = 0; i < session.userData.cart.length; i++) {
                if (session.userData.cart[i].producer !== "case" && session.userData.cart[i].producer !== "screen protector") {
                    var title = session.userData.cart[i].model;
                    var subtitle = session.userData.cart[i].producer;
                } else {
                    subtitle = session.userData.cart[i].model;
                    title = session.userData.cart[i].producer;
                }
                var price = session.userData.cart[i].price;
                var link = session.userData.cart[i].link;
                arr[i] =
                    new builder.HeroCard(session)
                        .title(title)
                        .subtitle(subtitle)
                        .text(price)
                        .images([builder.CardImage.create(session, link)])
                        .buttons([
                            builder.CardAction.imBack(session, "delete " + session.userData.cart[i].producer +
                                " model: " + session.userData.cart[i].model, "Delete")
                        ])
            }
            msg.attachments(arr);
            session.send(msg);
            var total = 0;
            for (i = 0; i < session.userData.cart.length; i++) {
                total += parseInt(session.userData.cart[i].price);
            }
            session.send("Total: " + total + " UAH");
            session.send("You can make an order! Just say me 'order'").endDialog();
        } else {
            session.send("Your cart is empty. Say 'buy' to choose something.").endDialog();
        }
    }
]).triggerAction({ matches: /(cart|show cart)/i });

bot.dialog('deleteButtonClick', [
    function (session, args) {
        var flag = false;
        var utterance = args.intent.matched.input;
        var model = utterance.slice((utterance.indexOf(":") + 2), utterance.length);
        var producer = utterance.split(" ")[1];
        if (producer === "screen") {
            producer = "screen protector";
        }
        if (model && producer) {
            for (var i = 0; i < session.userData.cart.length; i++) {
                if (session.userData.cart[i].producer === producer &&
                session.userData.cart[i].model === model) {
                    session.userData.cart.splice(i, 1);
                    session.send(producer + " " + model + " has been removed from your cart.").endDialog();
                    flag = true;
                    break;
                }
            }
            if (flag === false)
                session.send("I'm sorry... That product wasn't found in your cart. Say 'cart' to see all products in your cart").endDialog();
        } else {
            // Invalid product
            session.send("I'm sorry... That product wasn't found in your cart. Say 'cart' to see all products in your cart").endDialog();
        }
    }
]).triggerAction({ matches: /(delete)/i });

bot.dialog('bye', function(session) {
    session.userData = {};
    session.privateConversationData = {};
    session.conversationData = {};
    session.dialogData = {};
    session.endDialog('Goodbye!');
}).triggerAction({matches: /goodbye|bye/i});

// var msg = new builder.Message(session);
// msg.attachmentLayout(builder.AttachmentLayout.carousel);
// var title = "Classic White T-Shirt";
// msg.attachments([
//     new builder.HeroCard(session)
//         .title(title)
//         .subtitle("100% Soft and Luxurious Cotton")
//         .text("Price is $25 and carried in sizes (S, M, L, and XL)")
//         .images([builder.CardImage.create(session, 'http://pngimg.com/uploads/simpsons/simpsons_PNG88.png')])
//         .buttons([
//             builder.CardAction.imBack(session, "buy classic white t-shirt", "Buy")
//         ]),
//     new builder.HeroCard(session)
//         .title("Classic Gray T-Shirt")
//         .subtitle("100% Soft and Luxurious Cotton")
//         .text("Price is $25 and carried in sizes (S, M, L, and XL)")
//         .images([builder.CardImage.create(session, 'http://pngimg.com/uploads/simpsons/simpsons_PNG88.png')])
//         .buttons([
//             builder.CardAction.imBack(session, "buy classic gray t-shirt", "Buy")
//         ])
// ]);
// session.send(msg).endDialog();
// var inMemoryStorage = new builder.MemoryBotStorage();
//
// var bot = new builder.UniversalBot(connector);
//
// bot.dialog('/', [
//     function (session) {
//         var msg = new builder.Message(session)
//             .text("Hi! What is your favorite color?")
//             .suggestedActions(
//                 builder.SuggestedActions.create(
//                     session,[
//                         builder.CardAction.imBack(session, "green", "green"),
//                         builder.CardAction.imBack(session, "blue", "blue"),
//                         builder.CardAction.imBack(session, "red", "red")
//                     ]
//                 )
//             );
//         builder.Prompts.choice(session, msg, ["green", "blue", "red"]);
//     },
//     function(session, results) {
//         session.send('I like ' +  results.response.entity + ' too!');
//     }
// ]);


// console.log(doc);
// MongoClient.connect(url, function (err, db) {
//     if (err) throw err;
//     var dbase = db.db("mobilePhones");
//     var msg = new builder.Message(session);
//     msg.attachmentLayout(builder.AttachmentLayout.carousel);
//     dbase.collection("xiaomi").find().forEach(function (myDoc) {
//         if (err) throw err;
//         var title = myDoc.model;
//         var subtitle = myDoc.display;
//         var price = myDoc.price;
//         var link = myDoc.link;
//         msg.attachments([
//             new builder.HeroCard(session)
//                 .title(title)
//                 .subtitle(subtitle)
//                 .text(price)
//                 .images([builder.CardImage.create(session, link)])
//                 .buttons([
//                     builder.CardAction.imBack(session, "buy", "Buy")
//                 ])
//         ]);
//         session.send(msg);
//     });
// });
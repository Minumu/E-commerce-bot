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
    var dbase = db.db("usersInfo");
    dbase.createCollection("users", function(err, res) {
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
            var dbase = db.db("usersInfo");
            dbase.collection("users").insertOne(myobj, function(err, res) {
                if (err) throw err;
                console.log("1 document inserted");
                db.close();
            });
        });
        builder.Prompts.text(session, "Please, enter your last name");
    },
    function (session, results) {
        MongoClient.connect(url, function(err, db) {
            if (err) throw err;
            var dbase = db.db("usersInfo");
            var myquery = { LastName: "." };
            var newvalues = { $set: { LastName: results.response } };
            dbase.collection("users").updateOne(myquery, newvalues, function(err, res) {
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
            builder.Prompts.text(session, "Another one");
        } else {
            session.send("Thanks! Almost done! I need username, it must be unique");
            builder.Prompts.text(session, "Please, enter a username");
        }
    },
    function (session, results) {
        session.userName = results.response;
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            var dbase = db.db("usersInfo");
            var query = { UserName: session.userName };
            dbase.collection("users").find(query).toArray(function (err, result) {
                if (err) throw err;
                console.log(result);
                if (result.length !== 0)
                    session.replaceDialog('addUserName', { reprompt: true });
                else {
                    var myquery = {UserName: "."};
                    var newvalues = {$set: {UserName: results.response}};
                    dbase.collection("users").updateOne(myquery, newvalues, function (err, res) {
                        if (err) throw err;
                        console.log("1 document updated");
                        db.close();
                    });
                    session.send(session.userName + ", welcome to our online-shop! I will help you to choose all what you need! :)");
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
            builder.Prompts.text(session, "I do not find this username :( try again or say 'sign up' to create new one");
        } else {
            builder.Prompts.text(session, "Please, enter your username");
        }
    },
    function (session, results) {
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            var dbase = db.db("usersInfo");
            session.userName = results.response;
            var query = { UserName: session.userName };
            dbase.collection("users").find(query).toArray(function (err, result) {
                if (err) throw err;
                console.log(result);
                if (result.length === 0)
                    session.replaceDialog('log in', { reprompt: true });
                else {
                    session.send(session.userName + ", welcome back to our online-shop! I will help you to choose all what you need! :)");
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
                        builder.CardAction.imBack(session, "Mobile phones parts", "Mobile phones parts"),
                        builder.CardAction.imBack(session, "Cases & covers", "Cases & covers"),
                        builder.CardAction.imBack(session, "Mobile phone accessories", "Mobile phone accessories")
                    ]
                )
            );
        builder.Prompts.choice(session, msg, ["Mobile phones", "Mobile phones parts", "Cases & covers", "Mobile phone accessories"]);
    },
    function(session, results) {
        session.replaceDialog(results.response.entity);
    }
]).triggerAction({ matches: /^(buy|buy something|categories|show categories)$/i });

bot.dialog('Cases & covers', [
    function (session) {
    session.send("cases");
    }
    //     var msg = new builder.Message(session)
    //         .text("Let's choose the producer!")
    //         .suggestedActions(
    //             builder.SuggestedActions.create(
    //                 session,[
    //                     builder.CardAction.imBack(session, "XIAOMI", "XIAOMI"),
    //                     builder.CardAction.imBack(session, "MEIZU", "MEIZU"),
    //                     builder.CardAction.imBack(session, "SAMSUNG", "SAMSUNG"),
    //                     builder.CardAction.imBack(session, "HTC", "HTC")
    //                 ]
    //             )
    //         );
    //     builder.Prompts.choice(session, msg, ["XIAOMI", "MEIZU", "SAMSUNG", "HTC"]);
    // },
    // function(session, results) {
    //     session.replaceDialog(results.response.entity);
    // }
]).triggerAction({ matches: /(cases|phone cases|phone case|covers|phone covers|mobile phone case)$/i });

bot.dialog('Mobile phones', [
    function (session) {
        var msg = new builder.Message(session)
            .text("Let's choose the producer!")
            .suggestedActions(
                builder.SuggestedActions.create(
                    session,[
                        builder.CardAction.imBack(session, "XIAOMI", "XIAOMI"),
                        builder.CardAction.imBack(session, "MEIZU", "MEIZU"),
                        builder.CardAction.imBack(session, "SAMSUNG", "SAMSUNG"),
                        builder.CardAction.imBack(session, "HTC", "HTC")
                    ]
                 )
            );
        builder.Prompts.choice(session, msg, ["XIAOMI", "MEIZU", "SAMSUNG", "HTC"]);
    },
    function(session, results) {
        session.replaceDialog(results.response.entity);
    }
]).triggerAction({ matches: /(mobile phones|mobile phone|phone)$/i });

function find(collection, callback) {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbase = db.db("mobilePhones");
        dbase.collection("xiaomi").find().toArray(function (err, myDoc) {
            if (err) {
                callback(err, null);
            } else {
                callback(null, myDoc);
            }
        });
    });
}

bot.dialog('XIAOMI', [
    function (session) {
        session.send("xiaomi");
        var collection = "xiaomi";
        var myDoc;
        find(collection, function (err, content) {
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
                    var price = myDoc[i].price;
                    var link = myDoc[i].link;
                    arr[i] =
                        new builder.HeroCard(session)
                            .title(title)
                            .subtitle(subtitle)
                            .text(price)
                            .images([builder.CardImage.create(session, link)])
                            .buttons([
                                builder.CardAction.imBack(session, "buy xiaomi " +
                                    "model: " + myDoc[i].model + " price: " + myDoc[i].price, "Buy")
                            ])
                }
                msg.attachments(arr);
                session.send(msg);
            }
        });
    }
]).triggerAction({ matches: /^(xiaomi|buy xiaomi)$/i });

function findItem(i, collection, model, callback) {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbase = db.db("mobilePhones");
        console.log("MODEL");
        console.log(model);
        var query = { model: model };
        dbase.collection(collection).find(query).toArray(function (err, myDoc) {
            if (err) {
                callback(err, null, i);
            } else {
                console.log("HERE");
                console.log(myDoc);
                callback(null, myDoc, i);
            }
        });
    });
}

// Add dialog to handle 'Buy' button click
bot.dialog('buyButtonClick', [
    function (session, args) {
        // console.log(args);
        if (args.intent.matched.input.match(/(buy.*?model.*?price.*?UAH)/)) {
            console.log(args);
            var utterance = args.intent.matched.input;
            var model = utterance.slice((utterance.indexOf(":") + 2), (utterance.lastIndexOf("price") - 1));
            var price = utterance.slice((utterance.lastIndexOf(":") + 1), (utterance.length));
            var producer = utterance.split(" ")[1];
            if (model && price && producer) {
                // Initialize cart item
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
                for (var i = 0; i < session.userData.cart.length; i++) {
                    findItem(i, session.userData.cart[i].producer, session.userData.cart[i].model, function (err, content, j) {
                        if (err)
                            console.log(err);
                        else {
                            session.userData.cart[j].link = content[0].link;
                        }
                    })
                }
                // Send confirmation to users
                session.send(item.producer + " " + item.model + " has been added to your cart. You can say 'cart' to see" +
                    "all products in your cart").endDialog();
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

bot.dialog('cart', [
    function (session) {
        if (session.userData.cart.length !== 0) {
            var msg = new builder.Message(session);
            msg.attachmentLayout(builder.AttachmentLayout.carousel);
            var arr = [];
            for (var i = 0; i < session.userData.cart.length; i++) {
                var title = session.userData.cart[i].model;
                var subtitle = session.userData.cart[i].producer;
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
            session.send("Total: " + total + " UAH").endDialog();
        } else {
            session.send("Your cart is empty. Say 'show categories' to choose something.").endDialog();
        }
    }
]).triggerAction({ matches: /(cart|show cart)/i });

bot.dialog('deleteButtonClick', [
    function (session, args) {
        var flag = false;
        var utterance = args.intent.matched.input;
        var model = utterance.slice((utterance.indexOf(":") + 2), utterance.length);
        var producer = utterance.split(" ")[1];
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
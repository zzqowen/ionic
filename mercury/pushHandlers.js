'use strict';

var querystring = require("querystring");
var ObjectId = require('mongodb').ObjectID;
var globals = require("./globals");
var utils = require("./utils");
var io = null;
var logger = utils.logger;
var PushNotifications = require('node-push');

const settings = {
    gcm: {
        id: "AAAA39hB6Xw:APA91bFXsqFk_Mei4rWevNMA_LTyFC6h5820sUJJUie0WcaCpGp9rZ1WFCeUloWO2tl6teVxVntEXSmhuwGq76izdYVufEkWl9RMSaXYzCe1F7jTjdLF4c7A4yH3UT7xbSzwUIKKOALe",
    },
    apn: {
        token: {
            key: "_cert/APNsAuthKey_SU2B9P8P4J.p8",
            keyId: "SU2B9P8P4J",
            teamId: "SWF5PF9HYK",
        },
        production: false
    },
    adm: {
        client_id: null,
        client_secret: null,
    },
    wns: {
        client_id: null,
        client_secret: null,
        notificationMethod: 'sendTileSquareBlock',
    },
    huawei: {
        appId: "10875559",
        appSecret: "fea577da91bf5fae743a2ca0944cd29d",
    },
    xiaomi: {
        production: true,
        restrictedPackageName: "com.aihuawen.darwin",
        appSecret: "Nfm7/2r94Na4LDXDNCPteg==",
    }
};

const push = new PushNotifications(settings);

function sendNotification(userIdOrObject, message){
    logger.debug("==>sendNotification", userIdOrObject, message);
    if (!userIdOrObject || !message) return;
    var userObjectId;
    if (typeof userIdOrObject == "string") userObjectId = new ObjectId(userIdOrObject);
    else userObjectId = userIdOrObject;
    sendSocket(userObjectId, message);
    findTokenForUser(userObjectId)
    .then(function(token){
        var data = createNotification(message);
        push.send(token, data, (err, result) => {
            logger.debug("<==sendNotification ", result);
        });
    });
}

function sendNotifications(userObjectIds, message){
    logger.debug("==>sendNotifications", userObjectIds, message);
    if (!userObjectIds || !message) return;
    sendSockets(userObjectIds, message);
    return utils.getDb()
    .then(function(db){
        var filter = { _id: { $in: userObjectIds } };
        return db.collection(globals.databaseCollection.Tokens).find(filter, {_id:0, registrationId:1, source:1}).toArray();
    })
    .then(function(tokens){
        if (tokens.length < 1) return logger.debug("<==broadcastNotifications: no target found");
        var data = createNotification(message);
        push.send(tokens, data, (err, result) => {
            logger.debug("<==broadcastNotifications ", result);
        });
    })
}

function findTokenForUser(userIdOrObject, successCallback){
    var userObjectId;
    if (typeof userIdOrObject == "string") userObjectId = new ObjectId(userIdOrObject);
    else userObjectId = userIdOrObject;
    return utils.getDb()
    .then(function(db){
        return db.collection(globals.databaseCollection.Tokens).findOne({_id: userObjectId});
    })
    .then(function(token){
        if (!token) return null;
        return token;
    })
}

function broadcastNotification(message, userIdOrObjectExcluded){
    logger.debug("==>broadcastNotification", message, userIdOrObjectExcluded);
    var userObjectIdExcluded;
    if (userIdOrObjectExcluded){
        if (typeof userIdOrObjectExcluded == "string") userObjectIdExcluded = new ObjectId(userIdOrObjectExcluded);
        else userObjectIdExcluded = userIdOrObjectExcluded;
    }
    broadcastSockets(message, userIdOrObjectExcluded);
    return utils.getDb()
    .then(function(db){
        var filter = {};
        if (userObjectIdExcluded) filter._id = {$ne: userObjectIdExcluded};
        return db.collection(globals.databaseCollection.Tokens).find(filter, {_id:0, registrationId:1, source:1}).toArray();
    })
    .then(function(tokens){
        if (tokens.length < 1) return logger.debug("<==broadcastNotification: no target found");
        var data = createNotification(message);
        push.send(tokens, data, (err, result) => {
            logger.debug("<==broadcastNotification ", result);
        });
    })
}

function multicastNotification(message,category, userIdOrObjectExcluded){
    logger.debug("==>multicastNotification", message, userIdOrObjectExcluded);
    var userObjectIdExcluded;
    if (userIdOrObjectExcluded){
        if (typeof userIdOrObjectExcluded == "string") userObjectIdExcluded = new ObjectId(userIdOrObjectExcluded);
        else userObjectIdExcluded = userIdOrObjectExcluded;
    }
    return utils.getDb()
    .then(function(db){
        // var query = {
        //       interestedCategories: {
        //          $elemMatch: {
        //              "subValue" : category
        //          }
        //       }
        //     };
        var filter = {};
        if (userObjectIdExcluded) filter._id = {$ne: userObjectIdExcluded};
        return db.collection(globals.databaseCollection.Tokens).find(filter, {_id:0, registrationId:1, source:1}).toArray();
    })    
    .then(function(tokens){
        if (tokens.length < 1) return logger.debug("<==multicastNotification: no target found");
        var data = createNotification(message);
        push.send(tokens, data, (err, result) => {
            logger.debug("<==multicastNotification ", result);
        });
    })
}

function notifyUsersWithNoInterestedCatagories(message,category, userIdOrObjectExcluded){
    logger.debug("==>notifyUsersWithNoInterestedCatagories", message, userIdOrObjectExcluded);
    var userObjectIdExcluded;
    if (userIdOrObjectExcluded){
        if (typeof userIdOrObjectExcluded == "string") userObjectIdExcluded = new ObjectId(userIdOrObjectExcluded);
        else userObjectIdExcluded = userIdOrObjectExcluded;
    }
    
    return utils.getDb()
    .then(function(db){
        var tokenCollection = db.collection(globals.databaseCollection.Tokens);
        var query = {
              interestedCategories: { $exists: false }
            };

        return tokenCollection.find(query, {registrationId:1}).toArray();
    })    
    .then(function(tokens){
        var registrationIds = [];
        for (var i = 0; i < tokens.length; i++)
            if (tokens[i].registrationId) registrationIds.push(tokens[i].registrationId);
        if (registrationIds.length > 0){
            var data = createNotification(message);
            push.send(registrationIds, data, (err, result) => {
                logger.debug("<==notifyUsersWithNoInterestedCatagories ", result);
            });
        }
    })
}

function registerDevice(request, response){
    var source = request.query.source;
    var registrationId = request.query.registration_id;
    logger.debug("==>registerDevice", source, registrationId);
    utils.findUserFromId(request.token._id)
    .then(function(user){
        if (!user) return utils.respondWithError(null, globals.knownErrors.userNotFound, request, response);
        return utils.getDb()
        .then(function(db){
            return db.collection(globals.databaseCollection.Tokens).findOneAndUpdate(
                {_id: user._id},
                {_id: user._id, registrationId: registrationId, source: source, interests: user.interests},
                {upsert: true, returnOriginal: false}
            );
        })
        .then(function(result){
            var token = result.value;
            if (!token) return utils.respondWithError(err, globals.knownErrors.userUpdateFailed, request, response);
            utils.respondWithOk(null, request, response);
        })
    })
    .catch(function(err){
        utils.respondWithError(err, globals.knownErrors.userNotFound, request, response);
    });
}

function unregisterDevice(request, response){
    var cookie = request.query.cookie;
    logger.debug("==>unregisterDevice", cookie);
    utils.findUserFromId(request.token._id)
    .then(function(user){
        if (!user) return utils.respondWithError(null, globals.knownErrors.userNotFound, request, response);
        return utils.getDb()
        .then(function(db){
            return db.collection(globals.databaseCollection.Tokens).findOneAndUpdate(
                {_id: user._id},
                {registrationId: null, source: null},
                {upsert: false, returnOriginal: false}
            );
        })
        .then(function(result){
            var token = result.value;
            if (!token) return utils.respondWithError(null, globals.knownErrors.userUpdateFailed, request, response);
            utils.respondWithOk(null, request, response);
        })
    })
    .catch(function(err){
        utils.respondWithError(err, globals.knownErrors.userNotFound, request, response);
    });
}

var sockets = [];

function registerSocket(cookie, socket){
    logger.debug("==>registerSocket", cookie, socket.id);
    return utils.validateToken(cookie)
    .then(function(user){
        if (!user) return null;
        var userId = user._id.toString();
        sockets[userId] = socket;
        return userId;
    })
    .catch(function (err) {
      logger.debug(err);
    });
}

function unregisterSocket(userId){
    logger.debug("==>unregisterSocket", userId);
    if (userId) delete sockets[userId];
}

function sendSocket(userObjectId, message){
    logger.debug("==>sendSocket", userObjectId, message);
    if (!userObjectId || !message) return;
    var socket = sockets[userObjectId.toString()];
    if (!socket) return;
    socket.emit('push', message);
}

function sendSockets(userObjectIds, message){
    logger.debug("==>sendSockets", userObjectIds, message);
    if (!userObjectIds || !message) return;
    userObjectIds.forEach((userObjectId) => sendSocket(userObjectId, message));
}

function broadcastSockets(message, userIdOrObjectExcluded){
    logger.debug("==>broadcastSockets", message, userIdOrObjectExcluded);
    var userIdExcluded = "";
    if (userIdOrObjectExcluded){
        if (typeof userIdOrObjectExcluded != "string") userIdExcluded = userIdOrObjectExcluded.toString();
        else userIdExcluded = userIdOrObjectExcluded;
    }
    Object.keys(sockets).forEach((userId) => {
        if (userId != userIdExcluded)
            sockets[userId].emit("push", message);
    });
}

function createNotification(message){
    return {
        title: globals.appName, // REQUIRED
        body: message.alert, // REQUIRED
        _id: message._id ? message._id.toString() : message._id,
        message: message.message,
        custom: {
            sender: globals.appName,
            id: message._id ? message._id.toString() : message._id,
            message: message.message,
        },
        priority: 10, // gcm, apn
        collapseKey: null, // gcm for android, used as collapseId in apn
        contentAvailable: true, // gcm for android
        delayWhileIdle: true, // gcm for android
        restrictedPackageName: null, // gcm for android
        dryRun: false, // gcm for android
        icon: '', // gcm for android
        tag: '', // gcm for android
        color: '', // gcm for android
        clickAction: null, // gcm for android. In ios, category will be used if not supplied
        locKey: null, // gcm, apn
        bodyLocArgs: null, // gcm, apn
        titleLocKey: null, // gcm, apn
        titleLocArgs: null, // gcm, apn
        retries: 1, // gcm, apn
        encoding: null, // apn
        badge: 1, // gcm for ios, apn
        sound: 'ping.aiff', // gcm, apn
        alert: message.alert, // apn, will take precedence over title and body
        // alert: '', // It is also accepted a text message in alert
        titleLocKey: null, // apn and gcm for ios
        titleLocArgs: null, // apn and gcm for ios
        launchImage: null, // apn and gcm for ios
        action: null, // apn and gcm for ios
        topic: globals.appId, // apn and gcm for ios
        category: message.category, // apn and gcm for ios
        contentAvailable: null, // apn and gcm for ios
        mdm: null, // apn and gcm for ios
        urlArgs: null, // apn and gcm for ios
        truncateAtWordEnd: true, // apn and gcm for ios
        mutableContent: 0, // apn
        expiry: Math.floor(Date.now() / 1000) + 3600, // Expires 1 hour from now
        timeToLive: 28 * 86400, // if both expiry and timeToLive are given, expiry will take precedency
        headers: [], // wns
        launch: null, // wns
        duration: null, // wns
        consolidationKey: 'my notification', // ADM
    };
}

exports.sendNotification = sendNotification;
exports.broadcastNotification = broadcastNotification;
exports.registerDevice = registerDevice;
exports.unregisterDevice = unregisterDevice;
exports.registerSocket = registerSocket;
exports.unregisterSocket = unregisterSocket;
exports.multicastNotification = multicastNotification;
exports.notifyUsersWithNoInterestedCatagories = notifyUsersWithNoInterestedCatagories;

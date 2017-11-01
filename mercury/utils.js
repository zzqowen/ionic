'use strict';

var mongo = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;
var globals = require("./globals");
var rp = require('request-promise');
const winston = require('winston');
const jwt = require('jsonwebtoken');
const fs = require('fs');

var io = null;
var _db = null;
var debugMode = process.env.DEBUG || false;
var loggerLevel = debugMode ? 'debug' : 'info';

const logFolder = process.env.LOG_FOLDER || './logs/';
const currentLog = logFolder + 'current.log';
if (fs.existsSync(currentLog)) {
    var fileName = logFolder + new Date().toJSON() + ".log";
    fs.rename(currentLog, fileName);
}

var logger = new (winston.Logger)({
    transports: [
        new winston.transports.Console({'timestamp': true, level: loggerLevel}),
        new winston.transports.File({
            'timestamp': true,
            level: loggerLevel,
            filename: currentLog
        })
    ]
});

logger.stream = {
    write: function (message, encoding) {
        logger.info(message);
    }
};

if (debugMode) logger.info('DEBUG mode');

var getDb = function () {
    if (_db) {
        logger.debug('return existing connection');
        return new Promise(function (resolve, reject) {
            resolve(_db);
        });
    } else {
        logger.debug('new db conn');
        return mongo.connect(globals.databaseUrl)
            .then(function (db) {
                logger.debug('set _db');
                _db = db;
                db.on('close', function () {
                    logger.debug('on close reset');
                    _db = null;
                });
                return db;
            })
    }
};

function shortenString(str) {
    if (str.length > globals.maxDebugString) return str.substr(0, globals.maxDebugString) + "...";
    return str;
}

function respondWithJson(jsonObject, request, response) {
    if (!response) return;
    response.writeHead(200, {"Content-Type": "application/json"});
    var str = JSON.stringify(jsonObject);
    logger.debug("<==[", str, "]");
    if (request && request.query.callback) str = request.query.callback + "(" + str + ")";
    response.end(str);
}

function respondWithError(err, message, request, response) {
    logger.error(message, err);
    if (response) return respondWithJson({status: message}, request, response);
}

function respondWithOk(jsonObject, request, response) {
    if (jsonObject) jsonObject.status = globals.ok;
    else jsonObject = {status: globals.ok};
    respondWithJson(jsonObject, request, response);
}

function isExpired(post) {
    if (post && post.expireDate < new Date().toJSON()) return true;
    return false;
}

function isRegistered(userName) {
    return getDb()
        .then(function (db) {
            return db.collection(globals.databaseCollection.Users).findOne({userName: userName});
        })
        .then(function (user) {
            return (user != null);
        })
}

function isPostedBy(post, user) {
    if (!post || !user || !post.author || post.author._id != user._id) return false;
    return true;
};

function isAnsweredBy(post, user) {
    if (!post || !user || !post.expert || post.expert._id != user._id) return false;
    return true;
}

function canDelete(post, user) {
    if (!post) return false;
    if (post.status == globals.postState.answering || post.status == globals.postState.answered) return false;
    if (isPostedBy(post) && isAnsweredBy(post)) return false;
    if (!isExpired(post) && post.status == globals.postState.active) {
        var postDate = new Date(post.date);
        postDate.setMinutes(postDate.getMinutes() + globals.gracePeriodInMinutes);
        if (postDate < new Date()) return false;
    }
    return true;
}

function validateToken(token) {
    return new Promise(function (resolve, reject) {
        jwt.verify(token, process.env.AUTH_TOKEN_SECRET, function (err, token) {
            if (!err) return resolve(token);
            logger.error("validateToken failed", err);
            reject(err);
        });
    });
}

function findUserFromId(userId) {
    return getDb()
        .then(function (db) {
            return db.collection(globals.databaseCollection.Users).findOne({_id: new ObjectId(userId)});
        })
        .then(function (user) {
            if (user) {
                return user;
            }
            throw globals.knownErrors.userNotFound;
        });
}

function findUserFromDarwinId(darwinId) {
    return getDb()
        .then(function (db) {
            return db.collection(globals.databaseCollection.Users).findOne({id: darwinId});
        })
        .then(function (user) {
            if (user) {
                return user;
            }
            throw globals.knownErrors.userNotFound;
        });
}

function findPostFromId(postId) {
    return getDb()
        .then(function (db) {
            return db.collection(globals.databaseCollection.Posts).findOne({_id: new ObjectId(postId)});
        })
        .then(function (post) {
            return post;
        });
}

function updateUserJson(userIdOrObject, jsonObject) {
    var userObjectId;
    if (typeof userIdOrObject == "string") userObjectId = new ObjectId(userIdOrObject);
    else userObjectId = userIdOrObject;
    logger.debug("==updateUserJson", userObjectId, jsonObject);
    return getDb()
        .then(function (db) {
            return db.collection(globals.databaseCollection.Users).findOneAndUpdate(
                {_id: userObjectId},
                jsonObject,
                {returnOriginal: false}
            );
        })
        .then(function (data) {
            if (!data || !data.value) return null;
            return data.value;
        });
}

function updatePostJson(postIdOrObject, jsonObject) {
    var postObjectId;
    if (typeof postIdOrObject == "string") postObjectId = new ObjectId(postIdOrObject);
    else postObjectId = postIdOrObject;
    logger.debug("==updatePostJson", postObjectId, jsonObject);
    return getDb()
        .then(function (db) {
            return db.collection(globals.databaseCollection.Posts).findOneAndUpdate(
                {_id: postObjectId},
                jsonObject,
                {returnOriginal: false}
            );
        })
        .then(function (data) {
            if (!data || !data.value) return null;
            return data.value;
        });
}

function getPostSummary(postIdOrObject) {
    logger.debug("==getPostSummary", postIdOrObject);
    var postObjectId;
    if (typeof postIdOrObject == "string") postObjectId = new ObjectId(postIdOrObject);
    else postObjectId = postIdOrObject;
    var db = null, post = null;
    return getDb()
        .then(function (result) {
            db = result;
            return db.collection(globals.databaseCollection.Posts).findOne({_id: postObjectId});
        })
        .then(function (result) {
            return result;
        });
}

function getPostContent(postIdOrObject) {
    logger.debug("==getPostContent", postIdOrObject);
    var postObjectId;
    if (typeof postIdOrObject == "string") postObjectId = new ObjectId(postIdOrObject);
    else postObjectId = postIdOrObject;
    var db = null, post = null;
    return getDb()
        .then(function (result) {
            db = result;
            return db.collection(globals.databaseCollection.Posts).findOne({_id: postObjectId});
        })
        .then(function (result) {
            post = result;
            if (!post) throw globals.knownErrors.postNotFound;
            if (post.status == 4) throw globals.knownErrors.postDelete;
            if (post.comments.length == 0) return [];
            // get all comments for this post
            var commentIds = [];
            for (var id in post.comments) commentIds.push(new ObjectId(post.comments[id]));
            return db.collection(globals.databaseCollection.Posts).find({_id: {$in: commentIds}}).sort({date: 1}).toArray();
        })
        .then(function (comments) {
            post.comments = comments;
            return post;
        });
}

function authWithPassword(userName, password, referral) {
    return getDb()
        .then(function (db) {
            return db.collection(globals.databaseCollection.Users).findOneAndUpdate(
                {
                    from: {$in:['phone','yy']},
                    userName: userName.toString(),
                    password: password
                }, {
                    $set: {
                        loginDate: new Date().toJSON()
                    }
                }, {
                    upsert: false,
                    returnOriginal: false,
                });
        })
        .then(function (result) {
            if (result) return {isExist: true, user: result.value};
            logger.error(`authWithPassword: not found ${userName}/${password}`);
            throw globals.knownErrors.usernameOrPassword;
        });
}

function authWithWx(code, referral, channel) {
    //@fix: can we get conn in find return to avoid this?
    var wxUser;
    let _db;
    return rp({
        uri: process.env.WX_EP_ACCESS_TOKEN,
        qs: {
            appid: process.env.WX_APP_ID,
            secret: process.env.WX_APP_KEY,
            grant_type: 'authorization_code',
            code: code
        },
        json: true // Automatically parses the JSON string in the response
    })
        .then(function (result) {
            logger.debug(result);
            // get user info
            return rp({
                uri: process.env.WX_EP_USER_INFO,
                qs: {
                    access_token: result.access_token,
                    openid: result.openid
                },
                json: true // Automatically parses the JSON string in the response
            });
        })
        .then(function (result) {
            logger.debug(result);
            wxUser = result;
            return getDb();
        })
        .then(function (connection) {
            _db = connection
            return _db.collection(globals.databaseCollection.Users).findOneAndUpdate(
                {from: 'wx', userName: wxUser.unionid},
                {$set: {
                    loginDate: new Date().toJSON(),
                    gender: (wxUser.sex == '1') ? globals.gender.male : globals.gender.female,
                    language: wxUser.language,
                    country: wxUser.country,
                    province: wxUser.province,
                    city: wxUser.city,
                    openId: wxUser.openid,
                    accountType: globals.accountType.client
                }})
        })
        .then(function (result) {
            if (result.value) return result.value;
            let item = {
                id: getNextId(),
                from: 'wx',
                userName: wxUser.unionid,
                avatar: wxUser.headimgurl,
                displayName: wxUser.nickname,
                channel: channel,
                loginDate: new Date().toJSON(),
                gender: (wxUser.sex == '1') ? globals.gender.male : globals.gender.female,
                language: wxUser.language,
                country: wxUser.country,
                province: wxUser.province,
                city: wxUser.city,
                openId: wxUser.openid,
                registered: new Date().toJSON(),
                accountType: globals.accountType.client,
                credit: globals.bonus,
                score: globals.score.initial,
                reviews: [],
                totalReviews: 0,
                rating: 0,
                summary: {asked: 0, answered: 0, spent: 0, earned: 0},
                interests: globals.categories.defaults
            }
            return _db.collection(globals.databaseCollection.Users).insert(item);
        })
        .then(function (result) {
            if (result.ops) return {isExist: false, user: result.ops[0]};
            return {isExist:true, user: result}
        });
}

function authWithQQ(token, userId, referral, channel) {
    var openId, qqUser;
    let _db;
    return rp({
        // get user openID
        uri: process.env.QQ_URI_OPEN_ID,
        qs: {access_token: token},
        json: true // Automatically parses the JSON string in the response
    })
        .then(function (result) {
            var info = JSON.parse(result.slice(result.indexOf('(') + 1, result.lastIndexOf(')') - 1));
            logger.debug(info);
            openId = info.openid;
            // get user info
            return rp({
                uri: process.env.QQ_URI_USER_INFO,
                qs: {
                    access_token: token,
                    oauth_consumer_key: info.client_id, //process.env.QQ_APP_ID,
                    openid: info.openid,
                },
                json: true // Automatically parses the JSON string in the response
            });
        })
        .then(function (result) {
            logger.debug(result);
            qqUser = result;
            return getDb();
        })
        .then(function (connection) {
            _db = connection;
            return connection.collection(globals.databaseCollection.Users).findOneAndUpdate(
                {
                    from: 'qq',
                    userName: openId,
                },{$set :{
                    loginDate: new Date().toJSON(),
                    gender: (qqUser.gender == '男') ? globals.gender.male : globals.gender.female,
                    province: qqUser.province,
                    city: qqUser.city,
                    accountType: globals.accountType.client,
                }});
        })
        .then(function (result) {
            if (result.value) return result.value;
            let item = {
                id: getNextId(),
                from: 'qq',
                userName: openId,
                avatar: qqUser.figureurl_qq_1 || qqUser.figureurl_1 || qqUser.figureurl || qqUser.figureurl_qq_2 || qqUser.figureurl_2,
                displayName: qqUser.nickname,
                loginDate: new Date().toJSON(),
                gender: (qqUser.gender == '男') ? globals.gender.male : globals.gender.female,
                province: qqUser.province,
                channel: channel,
                city: qqUser.city,
                registered: new Date().toJSON(),
                accountType: globals.accountType.client,
                credit: globals.bonus,
                score: globals.score.initial,
                friends: [],
                reviews: [],
                totalReviews: 0,
                rating: 0,
                summary: {asked: 0, answered: 0, spent: 0, earned: 0},
                interests: globals.categories.defaults,
            }
            return _db.collection(globals.databaseCollection.Users).insert(item);
        })
        .then(function (result) {
            if (result.ops) return {isExist: false, user: result.ops[0]};
            return {isExist:true, user: result}
        });
};

function addComment(postIdOrObject, comment) {
    var postObjectId;
    if (typeof postIdOrObject == "string") postObjectId = new ObjectId(postIdOrObject);
    else postObjectId = postIdOrObject;
    comment.parentId = postObjectId;
    logger.debug("==addComment", postObjectId.toString(), comment);
    return getDb()
        .then(function (db) {
            return db.collection(globals.databaseCollection.Posts).insert(comment)
                .then(function (data) {
                    var commentId = data.ops[0]._id.toString();
                    return db.collection(globals.databaseCollection.Posts).findOneAndUpdate(
                        {'_id': postObjectId},
                        {
                            $addToSet: {comments: commentId},
                            $inc: {comment_count: 1},
                            $set: {lastUpdated: new Date().toJSON()}
                        },
                        {returnOriginal: false}
                    )
                        .then(function (data) {
                            return {post: data.value, commentId: commentId};
                        })
                })
        })
}

function addSystemMessage(postIdOrObject, message) {
    var comment = {
        isQuestion: false,
        content: message,
        author: globals.systemUser,
        date: new Date(),
        comments: [],
        comment_count: 0,
        audioFiles: [],
        photoFiles: []
    };
    return addComment(postIdOrObject, comment);
}

function getFileName(url) {
    return url.split('/').pop().split('#')[0].split('?')[0];
}

function getFileExt(url) {
    return url.split('.').pop();
};

const validNumbers = "1234567890";
const validCharacters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890abcdefghijklmnopqrstuvwxyz";

function getRandomString(len, numberOnly) {
    var result = "";
    var maxCharacters = validCharacters.length;
    if(numberOnly) {
        maxCharacters = validNumbers.length;
    }

    for (var i = 0; i < len; i++) {
        if (numberOnly) {
            result += validNumbers[Math.floor((Math.random() * maxCharacters))];
        }
        else {
            result += validCharacters[Math.floor((Math.random() * maxCharacters))];
        }
    }

    return result;
};

function getRandomFileName(fileName) {
    return new Date().getTime().toString() + getRandomString(4) + '.' + getFileExt(fileName);
};

const nextIdFile = "nextId.txt";
var nextId = parseInt(fs.readFileSync(nextIdFile)) || 1001;
logger.info('nextId starting from', nextId);

function isSpecialNumber(value) {
    var count = 0;
    for (var i = 1; i < value.length; i++) {
        if (value[i] == value[i - 1]) count++;
        else count = 0;
        if (count > 2) return true;
    }
    return false;
};

function getNextId() {
    var value = nextId.toString();
    nextId++;
    while (isSpecialNumber(value)) {
        logger.info("skip special number", value);
        value = nextId.toString();
        nextId++;
    }
    fs.writeFile(nextIdFile, nextId, (err) => {
        if (err) logger.error(err, nextId);
    });
    return value;
};

function satinizeUser(user){
    var resUser = {};
    resUser['_id'] = user._id.toString();
    resUser['id'] = user.id;
    resUser['avatar'] = user.avatar;
    resUser['rating'] = user.rating;
    resUser['userName'] = user.userName;
    resUser['displayName'] = user.displayName || user.userName;
    resUser['summary'] = user.summary;
    resUser['credit'] = user.credit;
    resUser['score'] = user.score;
    resUser['interests'] = user.interests;
  return resUser;
}

function extractUserSummary(user){
    if (!user) return {};
    return {
        _id: user._id.toString(),
        displayName: user.displayName || user.userName,
        avatar: user.avatar, 
        id: user.id, 
        source: user.source, 
        score: user.score, 
        summary: user.summary,
        registered: user.registered,
        myProfile: user.myProfile,
        gender: user.gender ? user.gender : 'M'
    }
}

function registerUser(user){
  var db;
  logger.debug("==>registerUser", user);
  return isRegistered(user.userName)
  .then(function(registered){
    if (registered) throw globals.knownErrors.taken;
    db = getDb();
    return db;
  })
  .then(function(db){
    var id = getNextId();
    var user2 = {
      id: id,
      from: 'phone',
      userName: user.userName,
      mobile: user.userName,
      channel: user.channel,
      displayName: id,
      password: user.password,
      loginDate: new Date().toJSON(),
      avatar: user.avatar,
      reviews: [],
      award: false,
      totalReviews: 0,
      rating: 0,
      summary: {asked: 0, answered: 0, spent: 0, earned: 0},
      registered: new Date().toJSON(),
      accountType: globals.accountType.client,
      credit: globals.bonus,
      score: globals.score.initial,
      interests: globals.categories.defaults,
    };
    logger.debug(user2);
    return db.collection(globals.databaseCollection.Users).insert(user2);
  })
}

var pay = {
    delete: function(post, userid) {
        if(post.author._id == userid) return "您已删除该提问， 退回" + 10*post.price + "赏金";
        else return (post.anonymous ? globals.anonymousUser.displayName : user.displayName) + "已删除该提问， 退回" + 10*post.price + "赏金"
    },
    receive: function(post, userid) {
        if(post.expert._id == userid) return "您已收到" + 10*post.price + "赏金";
        else return post.expert.displayName + "已收到" + 10*post.price + "赏金";
    },
    pay: function(post, userid) {
        if(post.author._id == userid) return "您已支付" + 10*post.price + "赏金";
        else return (post.anonymous ? globals.anonymousUser.displayName : post.author.displayName) + "已支付" + 10*post.price + "赏金";
    }
}

function payMessage(type, post, userid) {
    var message = "";
    switch(type) {
        case globals.payStatus.delete:message = pay.delete(post,userid);break;
        case globals.payStatus.receive:message = pay.receive(post,userid);break;
        case globals.payStatus.satisfy:message = pay.pay(post,userid);break;
    }
    return message;
}

function errorResponse(err, response, other) {
    logger.error("errmsg: " + err);   
    if (typeof err == "string") return respondWithError(null, err, null , response);
    if (other) return respondWithError(null, other, null, response);
    return respondWithError(null, globals.knownErrors.unknown, null, response);
}

function getPortForTourist(port, id){
    let canUsePorts = ['/get_recent_posts/','/get_recent_posts_new/','/getPosts/sports','/getPosts_new/sports','/getPosts/edu','/getPosts_new/edu',
    '/getPosts/life','/getPosts_new/life','/getPosts/entertainment','/getPosts_new/entertainment','/getPosts/emotion','/getPosts_new/emotion','/getPosts/other','/getPosts_new/other']
    if (canUsePorts.indexOf(port) != -1 && id == '010101010101010101010101')
        return true;
    else
        return false;
}

exports.getPortForTourist = getPortForTourist;
exports.errorResponse = errorResponse;
exports.payMessage = payMessage;
exports.shortenString = shortenString;
exports.respondWithJson = respondWithJson;
exports.respondWithError = respondWithError;
exports.respondWithOk = respondWithOk;
exports.isExpired = isExpired;
exports.isRegistered = isRegistered;
exports.isPostedBy = isPostedBy;
exports.isAnsweredBy = isAnsweredBy;
exports.canDelete = canDelete;
exports.findUserFromId = findUserFromId;
exports.findUserFromDarwinId = findUserFromDarwinId;
exports.findPostFromId = findPostFromId;
exports.updateUserJson = updateUserJson;
exports.updatePostJson = updatePostJson;
exports.getPostSummary = getPostSummary;
exports.getPostContent = getPostContent;
exports.authWithWx = authWithWx;
exports.authWithQQ = authWithQQ;
exports.authWithPassword = authWithPassword;
exports.logger = logger;
exports.getDb = getDb;
exports.validateToken = validateToken;
exports.addComment = addComment;
exports.addSystemMessage = addSystemMessage;
exports.getFileName = getFileName;
exports.getFileExt = getFileExt;
exports.getRandomString = getRandomString;
exports.getRandomFileName = getRandomFileName;
exports.getNextId = getNextId;
exports.satinizeUser = satinizeUser;
exports.extractUserSummary = extractUserSummary;
exports.registerUser = registerUser;

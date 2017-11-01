'use strict';

// -- keep them sorted
const express     = require('express');
const fs          = require("fs");
const path        = require('path');
const jwt         = require('jsonwebtoken');
const md5         = require('md5');
const mime        = require('mime-types');
const multer      = require('multer');
const ObjectId    = require('mongodb').ObjectID;
const querystring = require("querystring");
const rp          = require('request-promise');
const sharp       = require('sharp');
const url         = require("url");
const uuid        = require('node-uuid');
const xml2js      = require('xml2js');
const mongoUtils  = require("./common/dbUtils").mongo;

// --- local modules
const globals              = require("./globals");
const utils                = require("./utils");
const pushHandlers         = require("./pushHandlers");
const objectStorage        = require("./objectStorage");
const question             = require("./post/questionList");
const answer               = require("./post/answerList");
const follow               = require('./post/followList');
const postList             = require('./post/postList');
const friendActivityHelper = require("./game/friendActivity");
const grab                 = require('./post/grab');
const discuss              = require('./post/discuss');
const stranger             = require('./moments/stranger');
const complaints           = require('./post/complaints');
const momentsFriend        = require('./moments/friends');
const personPosts          = require('./moments/personPosts');
const luckyMoney           = require('./setting/luckyMoney');

// --- shared vars
const logger = utils.logger;
var startTime = (new Date()).toISOString();
const parseString = xml2js.parseString;
let sendPersonStatus = {};

var dir = path.resolve(__dirname, 'media');
if (!fs.existsSync(dir)){
  fs.mkdirSync(dir);
}

var serve = express.static(dir);
logger.info('media will be saved to', dir);

var upload = multer({
  storage : multer.diskStorage({
    destination: function (req, file, callback) {
      logger.debug(req, file, callback, dir);
      callback(null, dir);
    },
    filename: (req, file, cb) => cb(null, `s_${Date.now()}_${uuid.v1()}.${file.originalname.split('.').pop()}`),
  })
}).single('file');

// --- helper
function getRand32() {
  return uuid.v1().replace(/-/g, '');
};

function getBjTime() {
  return Math.floor(Date.now() / 1000) + 8 * 24 * 3600;
};

function getRecentPosts(request, response){
  var _id = request.token._id;
  postList.getPosts(_id, request.body)
  .then( msg =>{
    let data ={
        banner: msg.banner || [],
        posts: msg.posts,
        pages: 1,
        count: msg.posts.length, 
        count_total: msg.posts.length,
        status: globals.ok
    }
    utils.respondWithJson(data, request, response)
  })
  .catch(err => {
    utils.respondWithError(err, globals.knownErrors.unknown, request, response);    
  })
}

function getRecentPostsNew(request, response){
  var _id = request.token._id;
  postList.getPosts2(_id, request.body)
  .then( msg =>{
    let data ={
        banner: msg.banner || [],
        posts: msg.posts,
        //posts: [{content: '请到应用商店下载最新版本2.0.0使用', author: {displayName: ""}}],
        pages: 1,
        count: msg.posts.length, 
        count_total: msg.posts.length,
        status: globals.ok
    }
    utils.respondWithJson(data, request, response)
  })
  .catch(err => {
    utils.respondWithError(err, globals.knownErrors.unknown, request, response);    
  })
}

function getMyPosts(request, response) {
  var page = request.body.page;
  var type = request.body.type;
  var active = request.body.active;
  var userId;
  logger.debug("==>getMyPosts", request.token._id, type, active, page);
  utils.findUserFromId(request.token._id)
  .then(function (user) {
    if (!user) throw globals.knownErrors.userNotFound;
    userId = user._id.toString();
    return utils.getDb();
  })
  .then(function(db) {
    var filter = { isQuestion: true };
    if (type == globals.myPosts.questions) filter['author._id'] = userId;
    else if (type == globals.myPosts.replies) filter['expert._id'] = userId;
    else filter.$or = [{ 'author._id': userId }, { 'expert._id': userId }];
    if (active) filter.status = { $in: [globals.postState.active, globals.postState.answering] };
    else {
      filter.status = {$in: [globals.postState.answering,globals.postState.closed]};
      filter.expireDate = {$lte: new Date().toJSON()}
    }
    return db.collection(globals.databaseCollection.Posts).find(filter).sort({ lastUpdated: -1 }).toArray();
  })
  .then(function (posts) {
    posts.forEach((post) => objectStorage.processUrls(post));
    var data = {
      posts: posts,
      pages: 1,
      count: posts.length,
      count_total: posts.length,
      status: globals.ok
    };
    utils.respondWithJson(data, request, response);
  })
  .catch(function (err) {
    if (typeof err == "string") utils.respondWithError(null, err,request,response);
    else utils.respondWithError(err, globals.knownErrors.unknown, request, response);
  });
}

function getPost(request, response){
  var postId = request.query.post_id;
  if (!postId) return utils.respondWithError(null, globals.knownErrors.invalidRequest, request, response);
  // TODO: DO NOT return post comments if user is not involved (i.e. asked or answered)
  // TODO: request.token._id is the user Id
  if (!postId || postId == "undefined") return utils.respondWithOk(null, request, response);
  utils.getPostContent(postId)
  .then(function(post){
    objectStorage.processUrls(post);
    var comments = [];
    post.comments.forEach(comment => {
      var content = comment.content;
      if(typeof content == 'number') comment.content = utils.payMessage(content, post, request.token._id);
      comments.push(comment);
    })
    post.comments = comments;
    if (post) utils.respondWithOk({post: post}, request, response);
    else utils.respondWithError(null, globals.knownErrors.unknown, request, response);
  })
  .catch(function(err){
    utils.respondWithError(err, err, request, response);
  });
}

function postComment(request, response){
  var sendPerson = request.token._id;
  var comment = {};
  for(let key in request.body){
    comment[key] = request.body[key];
  }
  comment['date'] = new Date().toJSON();
  logger.debug("==>postComment", comment);
  var postId = comment.parentId;
  utils.findPostFromId(postId)
  .then( post => {
    if (post.status == globals.postState.deleted) throw globals.knownErrors.postDelete;
    if (post.status == globals.postState.answering && sendPerson == post.expert._id) sendPersonStatus[postId] = true;
  })
  .catch( err => {
    return utils.respondWithError(err,err,req,res);
  })
  ;


  var commentId ;
  if (!comment || !comment.author || !postId)
    return utils.respondWithError(null, globals.knownErrors.invalidRequest, request, response);
  utils.addComment(postId, comment)
  .then(function(data){
    commentId = data.commentId;
    return utils.getPostContent(postId);
  }).then(function(post) {
    var comments = [];
    post.comments.forEach(comment => {
      var content = comment.content;
      if(typeof content == 'number') comment.content = utils.payMessage(content, post, request.token._id);
      comments.push(comment);
    })
    post.comments = comments;
    objectStorage.processUrls(post);
    utils.respondWithOk({
      post: post
    }, request, response);
    var userToUpdate = (post.author._id.toString() == comment.author._id) ? post.expert : post.author;
    if (userToUpdate && userToUpdate._id){
      pushHandlers.sendNotification(
        userToUpdate._id,
        {
          alert: (post.anonymous ? globals.anonymousUser.displayName : comment.author.displayName) +
          (comment.content.length > 0 ? "回复: " + utils.shortenString(comment.content) : "给您发送了一条消息"),
          _id: post._id,
          message: globals.message.comment,
        }
      );
    }
  })
  .catch(function(err){
    utils.respondWithError(err, globals.knownErrors.unknown, request, response);
  });
}

function postReview(request, response){
  var review = request.body;
  logger.debug("==>postReview", request.token._id, review);
  if (!review || !review.reviewee || review.reviewer == review.reviewee)
    return utils.respondWithError(null, globals.knownErrors.invalidRequest, request, response);
  utils.findUserFromId(request.token._id)
  .then(function(reviewer){
    if (!reviewer || reviewer._id.toString() != review.reviewer)
    return utils.respondWithError(null, globals.knownErrors.userNotFound, request, response);
    return utils.findPostFromId(review.post);
  })
  .then(function(post){
    post.lastUpdated = new Date().toJSON();
    var content;
    if (post.author._id == review.reviewer && post.expert._id == review.reviewee){
      post.author.rating = review.rating;
      post.author.comment = review.comment;
      content = {$set: {"author.rating": post.author.rating, "author.comment": post.author.comment}};
    }
    else if (post.expert._id == review.reviewer && post.author._id == review.reviewee){
      post.expert.rating = review.rating;
      post.expert.comment = review.comment;
      content = {$set: {"expert.rating": post.expert.rating, "author.expert": post.expert.comment}};
    }
    else return utils.respondWithError(null, globals.knownErrors.postNotFound, request, response);
    return utils.updatePostJson(post._id, content);
  })
  .then(function(post){
    return utils.findUserFromId(review.reviewee);
  })
  .then(function(reviewee){
    if (!reviewee) return utils.respondWithError(null, globals.knownErrors.userNotFound, request, response);
    var total = 0;
    delete review.reviewee;
    reviewee.reviews.unshift(review);
    reviewee.reviews.forEach(function(r){ total += r.rating; });
    reviewee.totalReviews++;
    reviewee.rating = (1.0 * total / reviewee.totalReviews).toPrecision(2);
    return utils.updateUserJson(reviewee._id, {$set: {reviews: reviewee.reviews, totalReviews: reviewee.totalReviews, rating: reviewee.rating}});
  })
  .then(function(user){
    utils.respondWithOk(null, request, response);
  })
  .catch(function(err){
    utils.respondWithError(err, globals.knownErrors.userNotFound, request, response);
  });
}

function login(request, response){
  return false;
  let version = request.body.version;
  if (version !== '1.5') utils.respondWithError(null, '该版本已过期、请下载新版本再使用', request, response);
  var info = request.body, task;
  logger.debug("==>login", info);
  if (info.source == 'wx') task = utils.authWithWx(info.code, info.referral, info.channel);
  else if (info.source == 'qq') task = utils.authWithQQ(info.token, info.userId, info.referral, info.channel);
  else task = utils.authWithPassword(info.userName, info.password, info.referral);

  //TODO: use return token directly
  task.then(function (result) {
    var user = result.user;
    result.user.cookie = jwt.sign({
      _id: user._id,
      id: user.id,
      from: user.from,
      userName: user.userName
    }, process.env.AUTH_TOKEN_SECRET, {
      expiresIn: 60 * 60 * 24 * 365
    });
    utils.respondWithOk(result, request, response, null);
  }).catch(function (err) {
    if (err == globals.knownErrors.usernameOrPassword)
      utils.respondWithError(err,globals.knownErrors.usernameOrPassword,request,response);
    else
      utils.respondWithError(err, globals.knownErrors.userNotFound, request, response)
  });
}

function validateAuthToken(request, response, next) {
  let port = request._parsedUrl.pathname;
  let id = request.body._id || '';
  if (utils.getPortForTourist(port,id)){
    request.token = {_id:id}
    next();
  }else{
    if (id == '010101010101010101010101') return utils.respondWithError(null,globals.knownErrors.noPermission,request,response);
    if (request.query.cookie == undefined || request.query.cookie == 'undefined') return response.status(401).json({msg: globals.knownErrors.cookie});
    utils.validateToken(request.query.cookie)
    .then(function (token) {
      logger.debug('user authenticated');
      request.token = token;
      next();
    })
    .catch(function (err) {
      logger.debug(`auth failed: ${JSON.stringify(err)}`);
      return response.status(401).json({
        msg: globals.knownErrors.cookie
      });
    });
  }
}

function checkUserNameAvailability(request, response){
  var userName = request.query.userName;
  logger.debug("==>checkUserNameAvailability", userName);
  utils.isRegistered(userName)
  .then(function(registered){
    if (registered) return utils.respondWithError(null, globals.knownErrors.taken, request, response);
    return utils.respondWithOk(null, request, response);
  })
  .catch(function(err){
    return utils.respondWithOk(null, request, response);
  })
}

function register(request, response){
  return false;
  var user = request.body;
  let version = request.body.version;
  if (version !== '1.5') utils.respondWithError(null, '该版本已过期，请下载新版本再使用', request, response);
  return registerUser(user)
  .then(function(data){
    return utils.respondWithOk(null, request, response); 
  })
  .catch(function(err){
    return utils.respondWithError(null, err, request, response);
  })
}

function addNewPost(request, response){
  var post = request.body;
  var userHandler;
  post.isQuestion = post.isQuestion == 1 ? true : false;
  post.date = new Date().toJSON();
  post.anonymous = post.anonymous == 1 ? true : false;
  if (!post.price) post.price = 0;
  else if (typeof post.price == "string") post.price = parseFloat(post.price);
  logger.debug("==>addNewPost", request.token._id, post);
  if (!post || post.price < 0 || !post.author || post.content == '' && post.photoFiles.length == 0 && post.audioFiles.length == 0)
    return utils.respondWithError(null, globals.knownErrors.invalidRequest, request, response);
  if (post.category == globals.bugReport) post.author = globals.buggerUser;
  utils.findUserFromId(request.token._id)
  .then(function(user){
    if (!user || !user.credit || user.credit < post.price) throw globals.knownErrors.lowFund;
    userHandler = user;
    post.comments = [];
    post.author = utils.extractUserSummary(user);
    post.expert = {};
    post.funded = true;
    post.lastUpdated = new Date().toJSON();
    return utils.getDb()
    .then(function(db){
      // return db.collection(globals.databaseCollection.Posts).insert(post);
      return post;
    })
    .then(function(data){
      // if (!data || !data.ops) return utils.respondWithError(null, globals.knownErrors.unknown, request, response);
      if (!data || !data.ops) return utils.respondWithError(null, "请升级到最新版本", request, response);
      var post = data.ops[0];
      utils.updateUserJson(user._id, {$inc: {credit: -1*post.price, "summary.asked": 1, "summary.spent": post.price}})
      .then(function(user){
        return friendActivityHelper.insertActivity(userHandler._id.toString(), userHandler.displayName, globals.friendActivityType.question, {
          postid: data.ops[0]._id,
          author: data.ops[0].author,
          expert: data.ops[0].expert,
          content: data.ops[0].content
        });
      })
      .then(function(user) {
        utils.respondWithOk({_id: post._id.toString(), post: post}, request, response);
        question.add(request.token._id, post);
        pushHandlers.multicastNotification(
            {
                alert: (post.anonymous ? globals.anonymousUser.displayName : userHandler.displayName) + "发布了一个" + globals.categories.getName(post.category) + "类的提问",
                _id: post._id,
                message: globals.message.question,
            },
            post.category,
            post.author._id);
        pushHandlers.notifyUsersWithNoInterestedCatagories(
            {
                alert: (post.anonymous ? globals.anonymousUser.displayName : userHandler.displayName) + "发布了一个" + globals.categories.getName(post.category) + "类的提问",
                _id: post._id,
                message: globals.message.question,
            },
            post.category,
            post.author._id);
      });
    })
  })
  .catch(function(err){
      if (typeof err == "string") utils.respondWithError(err, err, request, response);
      else utils.respondWithError(err, globals.knownErrors.userNotFound, request, response);
  });
}

function updatePostStatus(request, response){
  return false;
  var postId = request.query.post_id;
  var status = request.query.status;
  logger.debug("==>updatePostStatus", postId, status);
  utils.updatePostJson(postId, {status: status, lastUpdated: new Date().toJSON()})
  .then(function(post){
    utils.respondWithOk(null, request, response);
  })
  .catch(function(err){
    utils.respondWithError(err, globals.knownErrors.invalidRequest, request, response);
  })
}

function startAnswer(request, response){
  return false;
  var author_id;
  var postId = request.query.post_id;
  var now = new Date();
  logger.debug("==>startAnswer", postId, request.token._id, now);
  var user;
  utils.findUserFromId(request.token._id)
  .then(function (result) {
    user = result;
    return utils.getDb();
  })
  .then(function (db) {
    return db.collection(globals.databaseCollection.Posts).find({
      status: globals.postState.answering,
      "expert._id": user._id.toString()
    }).toArray();
  })
  .then(function (result) {
    logger.debug(result);
    if (result && result.length >= globals.maxAnswer) throw globals.knownErrors.answerCanNotMoreThanThree;
    return utils.findPostFromId(postId);
  })
  .then(function (post) {
    if (post.status != globals.postState.active || !post.isQuestion) throw globals.knownErrors.invalidRequest;
    author_id = post.author._id;
    return utils.updatePostJson(post._id, {
      $set: {
        status: globals.postState.answering,
        lastUpdated: now.toJSON(),
        startDate: now.toJSON(),
        expireDate: new Date(now.getTime() + globals.expire).toJSON(),
        expert: utils.extractUserSummary(user)
      }
    })
  })
  .then(function(post){
    objectStorage.processUrls(post);
    question.update(author_id, postId);
    answer.add(request.token._id, postId);
    friendActivityHelper.insertActivity(user._id.toString(), user.displayName, globals.friendActivityType.answer, {
      postid: post._id,
      author: post.author,
      expert: post.expert,
      content: post.content
    });
    utils.respondWithOk({post: post}, request, response);
    // utils.addSystemMessage(postId, user.displayName + "正在回答");
    pushHandlers.sendNotification(post.author._id,
      {
        alert: (post.anonymous ? globals.anonymousUser.displayName : user.displayName) + "正在回答您的提问",
        _id: post._id,
        message: globals.message.answer
      }
    );
  })
  .catch(function(err){
    if (typeof err == "string") utils.respondWithError(null, err,request,response);
    else utils.respondWithError(err, globals.knownErrors.unknown, request, response);
  });
}

function acceptAnswer(request, response){
  return false;
  var postId = request.query.post_id;
  logger.debug("==>acceptAnswer", postId, request.token._id);
  utils.findUserFromId(request.token._id)
  .then(function(user){
    utils.findPostFromId(postId)
    .then(function(post){
      if (post.status === globals.postState.closed)
        return utils.respondWithError(null, globals.knownErrors.questionClosed, request, response);
        if (post.status === globals.postState.deleted){
          answer.remove(post.expert._id,post._id.toString());
          question.remove(post.author._id, post._id.toString());
          return utils.respondWithError(null, globals.knownErrors.postDelete, request, response);
        }
      var isAuthor = (post.author._id == user._id);
      var isExpert = post.expert._id == user._id;
      var isExpired = post.expireDate < (new Date()).toJSON();
      var authorized =  isAuthor || (isExpert && isExpired);
      if (post.status != globals.postState.answering && post.status != globals.postState.answered || !post.isQuestion || !authorized)
        return utils.respondWithError(null, globals.knownErrors.invalidRequest, request, response);
      objectStorage.processUrls(post);
      if (isAuthor){
        question.complete(request.token._id, postId);
        var now = new Date();
        utils.updatePostJson(post._id,{$set: {expireDate: now.toJSON(), lastUpdated: now.toJSON(), status: globals.postState.answered, peeks:[]}})
        .then(function(post){
          answer.update(post.expert._id, postId);
          utils.updateUserJson(post.author._id,{$inc: {score: globals.score.askPerPost}});
          utils.respondWithOk({post: post}, request, response);
          pushHandlers.sendNotification(post.expert._id,
            {
              alert: utils.payMessage(globals.payStatus.satisfy, post, post.expert._id),
              _id: post._id,
              message: globals.message.reward,
            }
          );
          utils.addSystemMessage(postId,globals.payStatus.satisfy);
        });
      }
      else{
        question.complete(post.author._id, postId);
        answer.complete(request.token._id, postId);
        let jsonObj = {};
        if (post.status == 1){
          jsonObj = {$set: {status: globals.postState.closed, lastUpdated: new Date().toJSON(), peeks: []}}
        }else{
          jsonObj = {$set: {status: globals.postState.closed, lastUpdated: new Date().toJSON()}};
        }
        utils.updatePostJson(post._id, jsonObj)
        .then(function(post){
          utils.updateUserJson(post.expert._id,
            {$inc: {credit: post.price, "summary.answered": 1, "summary.earned": post.price, score: globals.score.ansPerPost}})
          .then(function(expert){
            utils.respondWithOk({post: post,
              score:{earned: globals.score.ansPerPost, total: expert.score},
              credit:{earned: post.price, total: expert.credit}},
              request, response);
              pushHandlers.sendNotification(post.expert._id, {
                alert: utils.payMessage(globals.payStatus.receive,post, post.expert._id),
                _id: post._id,
                message: globals.message.reward
              });
            pushHandlers.sendNotification(post.author._id,
              {
                alert: post.expert.displayName + "已收到您的赏金",
                _id: post._id,
                message: globals.message.reward,
              }
            );
            utils.addSystemMessage(postId, globals.payStatus.receive);
          });
        });
      }
    });
  })
  .catch(function(err){
    utils.respondWithError(err, globals.knownErrors.userNotFound, request, response);
  });
}

function updateUser(request, response){
  return false;
  var cookie = request.query.cookie
  //var cookie = request.query.cookie && "";
  logger.debug("==>updateUser");
  return utils.findUserFromId(request.token._id)
  .then(function(user){
    if (!user) return utils.respondWithError(err, globals.knownErrors.userNotFound, request, response);
    delete user.password;
    user.cookie = cookie;
    utils.respondWithOk({user: user}, request, response);
  })
  .catch(function(err){
    utils.respondWithError(err, globals.knownErrors.userNotFound, request, response);
  });
}

function deletePost(request, response){
  var postId = request.query.post_id;
  var isModify = request.query.is_modify;

  logger.debug(`==>deletePost: post=${postId}, modify=${isModify}, uid=${request.token._id}`);
  utils.findUserFromId(request.token._id)
  .then(function(user){
    utils.findPostFromId(postId)
    .then(function(post){
      if (!post.isQuestion || !utils.canDelete(post, user)) return utils.respondWithError(null, globals.knownErrors.canDelete, request, response);
      // refund if the post is funded and posted by this user
      var refund = 0;
      if (post.funded && utils.isPostedBy(post, user)) {
        refund = Math.round(globals.userSettings.refundRatio * post.price * 100) / 100;
        logger.info(`refund: user=${user}, refund=${refund}`);
        utils.updateUserJson(post.author._id, {$inc: {credit: refund, "summary.spent": -1*refund}}); // ignore error
      }

      // mark the post as deleted and un-funded
      utils.updatePostJson(post._id, {$set: {status: globals.postState.deleted, funded: false}})
      .then(function(post){
        utils.respondWithOk(null, request, response);
        if (!isModify) {
          utils.addSystemMessage(postId, globals.payStatus.delete);
        }
      })
    })
  })
  .catch(function(err){
    utils.respondWithError(err, globals.knownErrors.userNotFound, request, response);
  });
}

function requestFileHandler(req, res, next) {
  var fileName = utils.getFileName(req.url);

  fs.stat(dir + '/' + fileName, function(err, stat) {
    if(err == null) {
      logger.info('serve static file: ' + fileName);
      res.setHeader("Cache-Control", "public, max-age=2000000000");
      serve(req, res, next);
    } else {
      logger.error('fs.stat error: ', err);
      res.status(503).send(err);
    }
  });
};

function uploadHandler(req, res){
  return false;
  logger.debug("upload", req);
  var isPhoto = req.body&&req.body.isPhoto;
  upload(req,res,function(err) {
    logger.debug(err);
    if(err) {
      logger.info(err);
      return res.end("Error uploading file.");
    }
    if (!req.file) return res.end("Invalid file");
    var fileKey = req.file.filename;
    var localFile = dir + '/' + fileKey;
    var fileUri = req.protocol + '://' + req.get('host') + '/file/' + fileKey;
    logger.info('upload:', fileKey, fileUri);

    // generate thumbnail
    if (isPhoto || fileKey.toLowerCase().endsWith('.jpg') || fileKey.toLowerCase().endsWith('.png')) {
      var localThumbFile = `${dir}/thumb_${fileKey}`;
      sharp(localFile).resize(globals.sharpQuality, null).toFile(localThumbFile, function(err) {
        logger.info('sharp done', err);
        res.end(fileUri);
      });
    } else {
      res.end(fileUri);
    }
  });
};

function getHeartbeat(req,res){
  var status = {
    ver: process.env.SERVER_VER,
    start: startTime,
    time: (new Date()).toISOString(),
  };

  utils.getDb()
  .then(function (db) {
    return db.admin().serverStatus();
  })
  .then(function (result) {
    status.conn = result.connections;
    res.json(status);
  })
  .catch(function (err) {
    status.err = err;
    res.status(500).json(status);
  });
};

// req: {credit: <amount>, from: <'ios'|'wx'>, receipt:<original receipt from ios or wx>}
function addCredit(req, res, next) {
  return false;
  var db;
  var payment = req.body;
  var uid = req.token._id;

  logger.debug(`credit=${payment.credit}, receipt=${payment.receipt}`);

  new Promise(function (resolve, reject) {
    if (!payment.credit || !payment.receipt) {
      logger.warn('invalid request');
      reject('Bad request');
    } else {
      logger.info('request valid');
      resolve(true);
    }
  })
  .then(function (result) {
    return utils.getDb()
  })
  .then(function (result) {
    db = result;
    // TBD: validate receipt; check redeemed receipt
    logger.info('insert payment');
    payment.date = new Date();
    payment.uid = uid;
    return db.collection('payments').insert(payment);
  })
  .then(function (result) {
    logger.info('update credit');
    return db.collection('users').findOneAndUpdate(
        {_id: new ObjectId(uid)},
        {$inc: {credit: Number(payment.credit), score: Number(payment.credit)}},
        {returnOriginal: false}
    );
  })
  .then(function (result) {
    logger.info('return updated user', result);

    if (!result.value) {
      throw '用户不存在';
    }
    res.json(result.value);
  })
  .catch(function (err) {
    var message = err.message || err;
    logger.warn(message);
    res.status(400).json({status: globals.knownErrors.invalidRequest, err: message});
  });
}

// req: opt
function getPrepayId(req, res) {
  return false;
  var opt = req.query.opt;
  // send prepay request to wechat
  const prepay = {
    appid: process.env.WX_APP_ID,
    attach: 'my attach',
    body: `答尔文 充值${opt}元`,
    mch_id: process.env.WX_MCH_ID,
    nonce_str: getRand32(),
    notify_url: 'http://sig.aihuawen.com/wx',
    out_trade_no: getRand32(),
    spbill_create_ip: '0.0.0.0',
    total_fee: opt*100, // in cents
    trade_type: 'APP',
  };

  var signReq = function (x) {
    var stringSignTemp = Object.keys(x)
    .filter(k => k != 'sign' && x[k])
    .sort()
    .map(k => `${k}=${x[k]}`)
    .concat(`key=${process.env.WX_MCH_KEY}`)
    .join('&');

    return md5(stringSignTemp).toUpperCase();
  };

  const prepaySigned = Object.assign({}, prepay, {sign: signReq(prepay)});

  var list = Object.keys(prepaySigned)
  .map(k => ` <${k}>${prepaySigned[k]}</${k}>`)
  .join('\n');

  var payload = `<xml>\n${list}\n</xml>\n`;
  logger.debug(payload);

  var options = {
      method: 'POST',
      uri: 'https://api.mch.weixin.qq.com/pay/unifiedorder',
      body: payload,
      headers: {
          'content-type': 'text/xml'
      }
  };

  logger.debug('send to wx');
  rp(options)
  .then(function (result) {
    logger.debug('wx res:', result);
    return new Promise(function (resolve, reject) {
      parseString(result, function (err, result) {
        err ? reject(err) : resolve(result);
      });
    });
  })
  .then(function (result) {
    // send back to client
    logger.debug('parsed:', result);
    const prepayId = result.xml.prepay_id[0];
    const appReq = {
      appid: process.env.WX_APP_ID,
      partnerid: process.env.WX_MCH_ID,
      prepayid: prepayId,
      package: 'Sign=WXPay',
      noncestr: getRand32(),
      timestamp: getBjTime(),
    };

    const appReqSigned = Object.assign({}, appReq, {sign: signReq(appReq)});
    res.json(appReqSigned);
  })
  .catch(function (err) {
    const message = err.message || err;
    logger.warn(message);
    res.status(500).json(message);
  });
};

function wxPayNotify(req, res) {

};

function changeUserInfo(request, response){
  return false;
  var info = request.body;
  logger.debug("==>changeUserInfo", request.token._id, info);
  if (!info) return utils.respondWithError(null, globals.knownErrors.invalidRequest, request, response);
  var userInfo = {};
  if (info.password){
    if (typeof info.password != "string") return utils.respondWithError(null, globals.knownErrors.invalidRequest, request, response);
    userInfo.password = info.password;
  }
  if (info.avatar) userInfo.avatar = info.avatar;
  if (info.interests) userInfo.interests = info.interests
  if (info.displayName) userInfo.displayName = info.displayName;
  if (info.country) userInfo.country = info.country;
  if (info.province) userInfo.province = info.province;
  if (info.city) userInfo.city = info.city;
  if (info.packetRemind) userInfo.packetRemind = info.packetRemind;
  if (info.gender) userInfo.gender = info.gender;
  if (info.myProfile) userInfo.myProfile = info.myProfile;
  if (info.score) userInfo.score = info.score;
  return utils.getDb()
  .then(function(db){
    return db.collection(globals.databaseCollection.Users).findOneAndUpdate(
      {_id: new ObjectId(request.token._id)},
      {$set: userInfo},
      {upsert: false, returnOriginal: false}
    );
  })
  .then(function(user){
    if (!user) return utils.respondWithError(err, globals.knownErrors.userNotFound, request, response);
    utils.respondWithOk(null, request, response);
  });
};

function requestFileUpload(request, response){
  var files = request.body.files;
  var loopback = request.body.loopback;
  var _id = request.token._id;
  logger.debug("==>requestFileUpload", _id, files, loopback);
  if (!files || files.length == 0) return respondWithError(null, globals.knownErrors.invalidRequest, request, response);
  var result = [];
  files.forEach((fileRequest) => {
    result.push(objectStorage.requestFileUploadUrl(_id, fileRequest, loopback));
  });
  logger.debug("<==requestFileUpload", result);
  utils.respondWithOk(result, request, response);
};

function getUserSummary(request, response){
  logger.debug(request.params);
  var reg = new RegExp(/[0-9a-z]{24}/i);
  if (!request.params || !reg.test(request.params.id)) return utils.respondWithError(null, globals.knownErrors.invalidRequest, request, response);
  var userId = request.params.id;
  if (!userId) return utils.respondWithError(null, globals.knownErrors.invalidRequest, request, response);
  utils.findUserFromId(userId)
  .then(function(user){
    if (!user) throw globals.knownErrors.userNotFound;
    utils.respondWithOk(
      { user: utils.extractUserSummary(user) },
      request, response);
  })
  .catch(function(err){
    utils.respondWithError(err, globals.knownErrors.userNotFound, request, response);
  });
}

function getUserSummaryForInvitation(request, response){
  logger.debug(request.params);
  var reg = new RegExp(/[0-9]{4,6}/i);
  if (!request.params || !reg.test(request.params.id)) return utils.respondWithError(null, globals.knownErrors.invalidRequest, request, response);
  var id = request.params.id;
  if (!id) return utils.respondWithError(null, globals.knownErrors.invalidRequest, request, response);
  utils.findUserFromDarwinId(id)
  .then(function(user){
    if (!user) throw globals.knownErrors.userNotFound;
    utils.respondWithOk(
      {
        user: { displayName: user.displayName, id: user.id, avatar: user.avatar }
      },
      request, response);
  })
  .catch(function(err){
    utils.respondWithError(err, globals.knownErrors.userNotFound, request, response);
  });
}

function getPostSummary(request, response){
  logger.debug(request.params);
  var reg = new RegExp(/[0-9a-z]{24}/i);
  if (!request.params || !reg.test(request.params.id)) return utils.respondWithError(null, globals.knownErrors.invalidRequest, request, response);
  var postId = request.params.id;
  if (!postId) return utils.respondWithError(null, globals.knownErrors.invalidRequest, request, response);
  utils.getPostSummary(postId)
  .then(function(post){
    if (!post) throw globals.knownErrors.unknown;
    objectStorage.processUrls(post);
    utils.respondWithOk(
      { post: 
        {
          _id: post._id.toString(),
          title: post.title,
          content: post.content,
          author: post.author,
          status: post.status,
          date: post.date,
          category: globals.categories.categoryMap[post.category],
          price: post.price,
          photoFiles: post.photoFiles
        }
      },
      request, response);
  })
  .catch(function(err){
    utils.respondWithError(err, globals.knownErrors.unknown, request, response);
  });
}

function getRewardForRegistration(_id, friend_id){
  var _db;
  return utils.getDb()
  .then(function(db){
    _db = db;
    return _db.collection(globals.databaseCollection.Users).findOne({_id: new ObjectId(_id)})
  })
  .then(function(user){
    if (user.award) throw globals.knownErrors.haveAward;
    return _db.collection(globals.databaseCollection.Users).update({_id: new ObjectId(_id)}, {$set: {award: true}});
  })
  .then(function(up){
    if (!up) throw globals.knownErrors.unknown;
    return _db.collection(globals.databaseCollection.Users).update({_id: new ObjectId(friend_id)}, {$inc: {credit: globals.award}})
  })
  .then(function(result){
    if (!result) throw globals.knownErrors.unknown;
    return true;
  })
}

function getUserInfo(req ,res){
  var _id = req.token._id;
  return utils.findUserFromId(_id)
  .then(function(user){
    return utils.satinizeUser(user);
  })
}

function getFriendList(req, res){
  var _id = req.token._id;
  return utils.getDb()
  .then(function(db){
    return db.collection(globals.databaseCollection.Friends).findOne({_id: new ObjectId(_id)});
  })
  .then(function(friends){
    if (!friends) return utils.respondWithOk({}, req, res);
    utils.respondWithOk(friends.friendlist, req, res);
  })
}

function searchUser(req ,res){
  var friendId = req.body.userId;
  return utils.getDb()
  .then(function(db){
    return db.collection(globals.databaseCollection.Users).findOne({id: friendId});
  })
  .then(function(user){
    if (!user) return utils.respondWithError(null, globals.knownErrors.userNotFound, req, res);
    var resUser = utils.satinizeUser(user);
    utils.respondWithOk(resUser, req, res);
  })
}

function addFriend(req, res){
  var _id = req.token._id;
  var id = req.token.id;
  var isInvitation = req.body.isInvitation || false;
  var idCode = req.body.id.toString();
  var _db, friend_id, friend;
  logger.debug(_id, id, idCode);

  return utils.getDb()
  .then(function(db){
    _db = db;
    return _db.collection(globals.databaseCollection.Users).findOne({_id: new ObjectId(_id)})
  })
  .then(function(user){
    if (user.award && isInvitation) throw globals.knownErrors.haveAward;
    return _db.collection(globals.databaseCollection.Users).findOne({id: idCode});
  })
  .then(function(user){
    if (!user) throw globals.knownErrors.userNotFound;
    friend_id = user._id.toString();
    friend = {
        _id : friend_id,
        id : user.id,
        avatar : user.avatar,
        userName : user.userName,
        displayName : user.displayName,
        rating : user.rating,
        score : user.score,
        summary : user.summary
    }
    return _db.collection(globals.databaseCollection.Friends).findOne({_id: new ObjectId(_id)});
  })
  .then(function(user){
    if (user){
      for (var _friend in user.friendlist)
        if (friend_id == user.friendlist[_friend]._id) throw globals.knownErrors.alreadyFriend;
      return true;
    }
    var friendRecord = {
      _id: new ObjectId(_id),
      id: id,
      friendlist: []
    }
    return _db.collection(globals.databaseCollection.Friends).insert(friendRecord);
  })
  .then(function(result){
    if (!result) throw globals.knownErrors.alreadyFriend;
    return _db.collection(globals.databaseCollection.Friends).updateOne(
      {_id: new ObjectId(_id)},
      {$push: {friendlist: friend}}
    )
  })
  .then(function(added){
    if (!added) throw globals.knownErrors.unknown;
    if (isInvitation) return getRewardForRegistration(_id, friend_id);
    return true;
  })
  .then(function(success){
    utils.respondWithOk(null, req, res);
    pushHandlers.sendNotification(new ObjectId(friend_id), `${id}使用邀请码添加了你`);
  })
  .catch(function(err){
    return utils.respondWithError(null, err, req, res);
  })
}


function deleteFriend(req ,res){
  var _id = req.token._id;
  var friend_Id = req.body._id;
  return utils.getDb()
  .then(function(db){
    return db.collection(globals.databaseCollection.Friends).update(
      {_id: new ObjectId(_id)},
      {$pull: {'friendlist': {_id: friend_Id}}}
    )
  })
  .then(function(friend){
    if(!friend) return utils.respondWithError(null ,globals.knownErrors.unknown ,req ,res);
    utils.respondWithOk(null ,req ,res);
  })
}

function getHistory(req, res) {
  let _id = req.token._id;
  let timestamp = req.body.timestamp || 0;
  let refresh = req.body.refresh || false;
  let type = req.body.type;
  let all = req.body.all;
  let count = 10;
  let from = req.body.from || '';
  logger.debug(req.body, typeof type)

  try{
    return new Promise(function (resolve, reject) {
      if (type == globals.listType.question)
        return resolve(question.get(_id, timestamp, refresh, count, from));
      if (type == globals.listType.answer) 
        return resolve(answer.get(_id, timestamp, refresh));
        resolve(follow.get(_id, timestamp, refresh, all));
    }).then( result =>{
      utils.respondWithOk(result, req, res);
    })
  } catch (e){
    utils.respondWithError(e, globals.knownErrors.unknown, req, res);
  }
}

function getActivityByUser(request, response) {
  const body = request.body;
  logger.debug(body);
  const userId = request.token._id;
  let task;
  try {
  //  判断
    if (body.timestamp) {
      body.timestamp = new Date(body.timestamp);
    }
    switch(body.type) {
      case "new": task = friendActivityHelper.getNewActivity(userId, body.timestamp, body.limit);break;
      case "after": task = friendActivityHelper.getOlderActivity(userId, body.timestamp, body.limit);break;
      //case "page": task = friendActivityHelper.getActivityByUser(userId, body.page, body.pageSize); break;
    }
    task.then(data => utils.respondWithOk(data, null, response)).catch(err => utils.errorResponse(err, response));
  }
  catch (e) {
    utils.errorResponse(e, response); 
  }
}

function updateDisplayName(request, response) {
  return false;
  var _id = request.token._id;
  var displayName = request.body.displayName;
  mongoUtils.update(globals.databaseCollection.Users, {_id: new ObjectId(_id.toString())}, {displayName: displayName.toString()})
  .then(db => utils.respondWithOk(null, null, response))
  .catch(err => utils.errorResponse(err,response));
}

function initUser(req, res){
  console.log(req.body);
  let _id = req.token._id;
  console.log(_id);
  let {displayName, password} = req.body;
  let _db;
  if (displayName.replace(/[\u0391-\uFFE5]/g,"aa").length > 11) return utils.respondWithError(null,'名称过长',req,res);
  return utils.getDb()
  .then(function(db){
    _db = db;
    return _db.collection(globals.databaseCollection.Users).findOne({_id: new ObjectId(_id)})
  })
  .then( userRes => {
    console.log(userRes);
    if (userRes.password != '123456') throw '设置失败！';
    return _db.collection(globals.databaseCollection.Users).update({_id: new ObjectId(_id.toString())},
    {$set : {password: password, displayName: displayName}})
  })
  .then( upRes => {
    if (!upRes) return utils.respondWithError(null,'更新失败!', req, res);
    utils.respondWithOk(null, req, res);
  })
  .catch( err => {
    utils.respondWithError(err,err,req,res);
  })
}

function getPostsGrab(req, res){
  let user_id = req.token._id;
  let post_id = req.body.post_id;
  grab.get(post_id, user_id)
  .then( users => {
    let data = {
      grabs: users,
      status: 'ok'
    }
    utils.respondWithOk(data, req, res);
  })
  .catch( e => {
    utils.respondWithError(null, e, req, res);
  })
}

function grabPost(req ,res){
  let user_id = req.token._id;
  grab.add(user_id, req.body)
  .then( status => {
    utils.respondWithOk(null, req, res);
  })
  .catch( e => {
    utils.respondWithError(null, e, req, res);
  })
}

function toggleFollowPosts(req, res){
  let user_id = req.token._id;
  let post_id = req.body.post_id;
  follow.toggle(user_id, post_id)
  .then( result => {
    if (result) return utils.respondWithOk(null, req, res);
    return utils.respondWithError(null, globals.knownErrors.unknown, req, res);
  })
  .catch( e => {
    utils.respondWithError(e, e, req, res);
  })
}

function getFollowPostIds(req, res){
  let user_id = req.token._id;
  follow.getList(user_id)
  .then( ids => {
    utils.respondWithOk({list: ids}, req, res)
  })
  .catch( e => {
    utils.respondWithError(null, e, req, res);
  })
}

function chooseAnswer(req, res){
  let _db;
  let user;
  let post_id = req.body.post_id;
  let answer_id = req.body.answer_id;
  let now = new Date();

  return utils.getDb()
  .then( db => {
    _db = db;
    return _db.collection(globals.databaseCollection.Users).findOne({_id: new ObjectId(answer_id)})
  })
  .then( user2 => {
    if (!user2) throw globals.knownErrors.userNotFound;
    user = user2;
    return _db.collection(globals.databaseCollection.Posts).findOne({_id: new ObjectId(post_id)});
  })
  .then( post => {
    if (post.status != globals.postState.active || !post.isQuestion) throw globals.knownErrors.invalidRequest;
    return utils.updatePostJson(post_id, {
      $set: {
        status: globals.postState.answering,
        lastUpdated: now.toJSON(),
        startDate: now.toJSON(),
        expireDate: new Date(now.getTime() + globals.expire).toJSON(),
        expert: utils.extractUserSummary(user)
      }
    })
  })
  .then( post => {
    // objectStorage.processUrls(post);
    utils.respondWithOk(null, req, res)
    question.update(req.token._id, post_id);
    answer.add(answer_id, post_id);
    pushHandlers.sendNotification(answer_id, {
      alert: '你抢到单了，快去回答啊！',
      _id: post_id,
      message: globals.message.answer
    })
  })
  .catch( err => {
    if (typeof err == 'string') utils.respondWithError(null, err, req, res);
    else utils.respondWithError(err, globals.knownErrors.unknown, req, res);
  })
}

let nowTime = {status: false};

function autoGrabPost(req, res){
  return false;
  let _db;
  let user;
  let post_id = req.body.post_id;
  let grabId = req.token._id;
  let authorId = req.body.author_id;
  let now = new Date();
  if (!nowTime[grabId]) {
    nowTime[grabId] = now;
    nowTime.status = true;
  } else {
    if (nowTime[grabId].getFullYear() == now.getFullYear()) {
      if (nowTime[grabId].getMonth() == now.getMonth()) {
        if(nowTime[grabId].getDate() != now.getDate()) {
          nowTime[grabId] = now;
          nowTime.status = true;
        } else {
          nowTime.status = false;
        }
      } else {
        nowTime[grabId] = now;
        nowTime.status = true;
      }
    } else {
      nowTime[grabId] = now;
      nowTime.status = true;
    }
  }

  sendPersonStatus[post_id] = false;
  setTimeout(function(){
    if (!sendPersonStatus[post_id]) {
      utils.updatePostJson(post_id, {
        $set: {
          status: globals.postState.active,
          lastUpdated: now.toJSON(),
          startDate: now.toJSON(),
          expireDate: now.toJSON(),
          expert: {},
          comments: []
        }
      });
      question.update(authorId, post_id, true);
      answer.remove(grabId, post_id);
      pushHandlers.sendNotification(grabId, {
        _id: post_id,
        message: globals.message.overtime
      });
      pushHandlers.sendNotification(authorId, {
        _id: post_id,
        message: globals.message.overtime
      });
    } 
  }, (globals.expire/(24*60))*1/2);
  return utils.getDb()
  .then( db => {
    _db = db;
    return _db.collection(globals.databaseCollection.Users).findOne({_id: new ObjectId(grabId)})
  })
  .then( user2 => {
    if (!user2) throw globals.knownErrors.userNotFound;
    if (!user2.grabNum || nowTime.status) user2.grabNum = 0;
    if (user2.grabNum < 4) user2.grabNum ++;
    _db.collection(globals.databaseCollection.Users).update({_id: new ObjectId(grabId)},{$set:  {grabNum: user2.grabNum}});
    if (user2.grabNum > 3 && user2.score < 2500) return utils.respondWithJson({status: 'error', message: globals.knownErrors.canNotGrab}, req, res);
    if (user2.grabNum > 5 ) return utils.respondWithJson({status: 'error', message: globals.knownErrors.canNotGrabMore}, req, res);
    user = user2;
    return _db.collection(globals.databaseCollection.Posts).findOne({_id: new ObjectId(post_id)});
  })
  .then( post => {
    if (post.status != globals.postState.active || !post.isQuestion) throw globals.knownErrors.invalidRequest;
    return utils.updatePostJson(post_id, {
      $set: {
        status: globals.postState.answering,
        lastUpdated: now.toJSON(),
        startDate: now.toJSON(),
        expireDate: new Date(now.getTime() + globals.expire).toJSON(),
        expert: utils.extractUserSummary(user)
      }
    })
  })
  .then( post => {
    utils.respondWithJson({status: 'ok', post: post}, req, res);
    question.update(post.author._id, post_id);
    answer.add(grabId, post_id);
    pushHandlers.sendNotification(post.author._id, {
      alert: `${user.displayName}抢答了你的问题`,
      _id: post_id,
      user: user,
      message: globals.message.grab
    })
  })
  .catch( err => {
    if (typeof err == 'string') utils.respondWithError(null, err, req, res);
    else utils.respondWithError(err, globals.knownErrors.unknown, req, res);
  })
};

function getPostsByCategory(req, res){
  let category = '/'+req.params.category;
  logger.debug(category);
  let user_id = req.token._id;
  postList.get(category, user_id, req.body)
  .then( posts => {
     let data ={
        posts: posts,
        pages: 1,
        count: posts.length,
        count_total: posts.length,
        status: globals.ok
    }
    utils.respondWithOk(data, req, res);
  })
  .catch( err => {
    utils.respondWithError(err, globals.knownErrors.unknown, req, res);
  })
}

function getPostsByCategoryNew(req, res){
  let category = '/'+req.params.category;
  logger.debug(category);
  let user_id = req.token._id;
  postList.get2(category, user_id, req.body)
  .then( posts => {
     let data ={
        posts: posts,
        pages: 1,
        count: posts.length,
        count_total: posts.length,
        status: globals.ok
    }
    utils.respondWithOk(data, req, res);
  })
  .catch( err => {
    utils.respondWithError(err, globals.knownErrors.unknown, req, res);
  })
}

function cancelGrabPost(req, res){
  let user_id = req.token._id;
  let post_id = req.body.post_id;
  grab.cancel(post_id, user_id)
  .then( result => {
    if (!result) return utils.respondWithError(result, globals.knownErrors.cancelFail, req, res);
    utils.respondWithOk(null, req, res);
  })
  .catch( err => {
    utils.respondWithError(err, globals.knownErrors.unknown, req, res);
  })
}

function getDiscuss(req, res){
  let user_id = req.token._id;
  let post_id = req.body.post_id;
  discuss.get(user_id, post_id)
  .then( questions => {
    utils.respondWithOk(questions, req, res);
  })
  .catch( err => {
    utils.respondWithError(err, err, req, res);
  })
}

function addDiscuss(req, res){
  let user_id = req.token._id;
  discuss.add(user_id, req.body)
  .then( upRes =>{
    utils.respondWithOk(null, req, res);
  })
  .catch( err => {
    utils.respondWithError(err, err, req, res);
  })
}

function answerDiscuss(req, res){
  let user_id = req.token._id;
  discuss.answer(user_id, req.body)
  .then( upRes => {
    if (!upRes) throw globals.knownErrors.answerFail;
    utils.respondWithOk(null, req, res);
  })
  .catch( err => {
    utils.respondWithError(err, err, req, res);
  })
}

function acceptPeek(req, res){
  let user_id = req.token._id;
  let post_id = req.body.post_id;
  let _db;
  return utils.getDb()
  .then( db => {
    _db = db;
    return _db.collection(globals.databaseCollection.Posts).findOne({_id: new ObjectId(post_id), status: {$nin: [globals.postState.active]}});
  })
  .then( post => {
    if (!post) throw globals.knownErrors.peekFail;
    return _db.collection(globals.databaseCollection.Posts).update({_id: new ObjectId(post_id)},
    {$set: {peek: true, peeks:[]}})
  })
  .then( upRes => {
    if (!upRes) throw globals.knownErrors.peekFail;
    utils.respondWithOk(null, req, res);
  })
  .catch( err => {
    utils.respondWithError(null, err, req, res);
  })
}

function peekPost(req, res){
  return false;
  let user_id = req.token._id;
  let post_id = req.body.post_id;
  let cost;
  let _db;
  let author_id;
  
  return utils.getDb()
  .then( db => {
    _db = db;
    return _db.collection(globals.databaseCollection.Posts).findOne({_id: new ObjectId(post_id)})
  })
  .then( post => {
    if (post.peeks.indexOf(user_id) != -1) throw '您已经可以直接查看该单';
    cost = Number((globals.peekCost.cost * post.price).toFixed(2));
    author_id = post.author._id;
    return _db.collection(globals.databaseCollection.Users).findOne({_id: new ObjectId(user_id)})    
  })
  .then( user => {
    if (user.credit < cost) throw globals.knownErrors.lowFund;
    return _db.collection(globals.databaseCollection.Posts).update({_id: new ObjectId(post_id)},
      {$push: {peeks: user_id}});
  })
  .then( upRes => {
    if (!upRes) throw globals.knownErrors.peekThisFail;
    return _db.collection(globals.databaseCollection.Users).update({_id: new ObjectId(user_id)},
    {$inc: {credit: -cost}});
  })
  .then( upRes => {
    if (!upRes) throw globals.knownErrors.payFail;
    let earn = Number((globals.peekCost.earn*cost).toFixed(2));
    return _db.collection(globals.databaseCollection.Users).update({_id: new ObjectId(author_id)},
    {$inc: {credit: earn}});
  })
  .then( upRes => {
    utils.respondWithOk({status: 'ok'}, req, res);
  })
  .catch( err => {
    utils.respondWithError(err, err, req, res);
  })
}

function getPersonPosts(req, res){
  let user_id = req.token._id;
  personPosts.get(user_id, req.body)
  .then( posts => {
    utils.respondWithOk(posts, req, res);
  })
  .catch( err => {
    utils.respondWithError(err, err, req, res);
  })
}

function strangerMoments(req, res){
  let user_id = req.token._id;
  let date = req.body.date || new Date().toJSON();
  let _db;
  let friendList = [];
  
  stranger.get(user_id, req.body)
  .then( posts => {
    utils.respondWithOk(posts, req, res);
  })
  .catch( err => {
    utils.respondWithError(err, err, req, res);
  })
}

function friendsMoments(req, res){
  let user_id = req.token._id;
  momentsFriend.get(user_id, req.body)
  .then( posts => {
    utils.respondWithOk(posts, req, res);
  })
  .catch( err => {
    utils.respondWithError(err, err, req, res);
  })
}

function addComplaints(req, res){
  let user_id = req.token._id;
  complaints.add(user_id, req.body)
  .then( inRes => {
    utils.respondWithOk(null, req, res);
  })
  .catch( err => {
    utils.respondWithError(err, err, req, res);
  })
}

function getLuckyMoney(req, res){
  return false;
  let user_id = req.token._id;
  luckyMoney.get(user_id)
  .then( detail => {
    utils.respondWithOk(detail, req, res);
  })
  .catch( err => {
    utils.respondWithError(err, err, req, res);
  })
}

function receiveLuckyMoney(req, res){
  return false;
  let user_id = req.token._id;
  let detail = req.body;
  if (detail.amount == 0 || detail.received == true) return utils.respondWithError(null, globals.knownErrors.invalidRequest, req, res);
  luckyMoney.receive(user_id, detail)
  .then( result => {
    utils.respondWithOk(null, req, res); 
  })
  .catch( err => {
    utils.respondWithError(err, err, req, res);
  })
}

function luckyMoneyHistory(req, res){
  let user_id = req.token._id;
  luckyMoney.history(user_id)
  .then( details => {
    utils.respondWithOk(details, req, res);
  })
  .catch( err => {
    utils.respondWithError(err, err, req, res);
  })
}

function getVersion(req, res){
  let version = globals.version;
  utils.respondWithOk(version, req, res);
}

function getBanner(req, res){
  let banner = [
    {img:'banner1.png', url: 'banner.html'}
  ]
  utils.respondWithOk({banner}, req, res);
}

exports.openApi = new express.Router()
.use('/file', requestFileHandler)
.get('/summary/post/:id', getPostSummary)
.get('/summary/user/:id', getUserSummary)
.get('/summary/invite/:id', getUserSummaryForInvitation)
.get('/summary/pkInvite/:id', getUserSummary)
.get('/check_availability/', checkUserNameAvailability)
.get('/heartbeat', getHeartbeat)
.post('/user/login/', login)
.post('/user/register/', register)
.post('/version/get', getVersion)
.post('/banner/get', getBanner)
;

exports.webApi = new express.Router()
.use(validateAuthToken)
.get('/user', getUserSummary)
.get('/get_post/', getPost)
.get('/user/get_prepay/', getPrepayId)
.post('/get_my_posts/', getMyPosts)
.get('/update_post_status/', updatePostStatus)
.post('/user/add_credit/', addCredit)
.get('/user/accept_answer/', acceptAnswer)
.get('/user/delete_post/', deletePost)
.post('/get_recent_posts/', getRecentPosts)
.post('/get_recent_posts_new/', getRecentPostsNew)
.post('/user/request_upload/', requestFileUpload)
.post('/upload', uploadHandler)
.post('/user/new_post/', addNewPost)
.post('/user/post_comment/', postComment)
.post('/user/post_review/', postReview)
.get('/user/register_device/', pushHandlers.registerDevice)
.get('/user/start_answer/', startAnswer)
.get('/user/update/', updateUser)
.get('/user/unregister_device/', pushHandlers.unregisterDevice)
.patch('/user/change', changeUserInfo)
.get('/user/info', getUserInfo)
.post('/user/getFriendList', getFriendList)
.post('/user/searchUser', searchUser)
.post('/user/addFriend', addFriend)
.post('/user/deleteFriend', deleteFriend)
.post('/getHistory', getHistory)
.post('/user/init', initUser)
.post('/user/updateDisplayName', updateDisplayName)
.post('/friend/activity', getActivityByUser)
.post('/getPostsGrab', getPostsGrab)
.post('/grabPost', grabPost)
.post('/autoGrabPost', autoGrabPost)
.post('/toggleFollowPosts', toggleFollowPosts)
.post('/chooseAnswer', chooseAnswer)
.post('/getFollowPostIds', getFollowPostIds)
.post('/getPosts/:category', getPostsByCategory)
.post('/getPosts_new/:category', getPostsByCategoryNew)
.post('/grab/cancel', cancelGrabPost)
.post('/discuss/get', getDiscuss)
.post('/discuss/add', addDiscuss)
.post('/discuss/answer', answerDiscuss)
.post('/moments/stranger', strangerMoments)
.post('/moments/friends', friendsMoments)
.post('/moments/personPosts', getPersonPosts)
.post('/complaints/add', addComplaints)
.post('/peek/accept', acceptPeek)
.post('/peek/post', peekPost)
.post('/luckyMoney/get', getLuckyMoney)
.post('/luckyMoney/receive', receiveLuckyMoney)
.post('/luckyMoney/history', luckyMoneyHistory)
;
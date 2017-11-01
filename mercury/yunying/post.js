'use strict'

const ObjectID = require('mongodb').ObjectID;
const globals = require('../globals');
const utils = require('../utils');

// --- local modules
const friendActivityHelper = require("../game/friendActivity");
const question = require('../post/questionList');

function get(info){
    let date = info.date || new Date().toJSON();
    let count = info.count || 20;
    return utils.getDb()
    .then( db => {
        return db.collection(globals.databaseCollection.Posts).find({peek: true, anonymous: false, top:{$ne: true}, date:{$lt:date}})
            .limit(count).sort({data:-1}).toArray();
    })
}

function getTop(info){
    let time = info.time || new Date().toJSON();
    let count = info.count || 20;
    return utils.getDb()
    .then( db => {
        return db.collection(globals.databaseCollection.Posts).find({top: true})
            .limit(count).sort({lastUpdated: -1}).toArray();
    })
}

function setTop(post_id){
    let time = new Date().toJSON();
    return utils.getDb()
    .then( db => {
        return db.collection(globals.databaseCollection.Posts).update({_id: new ObjectID(post_id)},
            {$set: {top:true, lastUpdated: time}})
    })
    .then( upRes => {
        if (!upRes) throw globals.knownErrors.unknown;
        return `${post_id}设置置顶成功`;
    })
}

function setTops(info){
    let post_ids = info.post_ids;
    let promises = post_ids.map( id =>{
        return new Promise( (resolve, reject) => {
            resolve(setTop(id))
        })
    })
    return Promise.all(promises);
}

function cancleTop(info){
    let time = new Date().toJSON();
    let post_id = info.post_id;
    return utils.getDb()
    .then( db => {
        return db.collection(globals.databaseCollection.Posts).update({_id: new ObjectID(post_id)},
            {$set: {top: false}, lastUpdated: time})
    })
    .then( upRes => {
        if (!upRes) throw globals.knownErrors.unknown;
        return true;
    })
}

function create(info){
    let _db;
    let user;
    let post;
    let userName = info.userName;
    let content = info.content;
    let price = info.price;
    let anonymous = info.anonymous;
    let audioFiles = info.audioFiles || [];
    let photoFiles = info.photoFiles;
    let category = info.category;
    let time = new Date().toJSON();

    return utils.getDb()
    .then( db => {
        _db = db;
        return db.collection(globals.databaseCollection.Users).findOne({userName:userName})
    })
    .then( user2 => {
        if (!user2) throw '请输入正确的用户名';
        if (user2.credit < price) throw '该账户余额不足';
        if (user2.from != 'yy') throw '不是运营账号,不可使用该渠道';
        user = user2;
        let author = {
            _id: user._id.toString(),
            displayName: user.displayName,
            avatar: user.avatar,
            id: user.id,
            source: null,
            score: user.score,
            summary: user.summary
        }
        let item = {
            title:'',
            content: content,
            price: price,
            expire: 129600,
            comment_count: 0,
            comments: [],
            isQuestion: true,
            anonymous: anonymous,
            status: globals.postState.active,
            expert: {},
            audioFiles: audioFiles,
            photoFiles: photoFiles,
            category: category,
            author: author,
            date: time,
            funded: true,
            lastUpdated: time
        }
        return _db.collection(globals.databaseCollection.Posts).insert(item);
    })
    .then( data => {
        post = data.ops[0];
        question.add(user._id.toString(), post);
        return utils.updateUserJson(user._id, {$inc: {credit: -1*post.price, "summary.asked": 1, "summary.spent": post.price, score: globals.score.askPerPost}})
    })
    .then(function(user){
        return friendActivityHelper.insertActivity(user._id.toString(), user.displayName, globals.friendActivityType.question, {
            postid: post._id,
            author: post.author,
            expert: post.expert,
            content: post.content
        });
    })
    .then( user => {
        return {_id: post._id.toString(), post: post}
    })
}


exports.get = get;
exports.getTop = getTop;
exports.setTop = setTop;
exports.cancleTop = cancleTop;
exports.create = create;
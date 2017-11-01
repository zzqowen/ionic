'use strict';
const ObjectID = require('mongodb').ObjectID;
const globals =  require('../globals');
const utils = require('../utils');

function by(name){
    return function(o, p){
        var a, b;
        if (typeof o === "object" && typeof p === "object" && o && p) {
            a = o[name];
            b = p[name];
            if (a === b) {
                return 0;
            }
            if (typeof a === typeof b) {
                return a < b ? 1 : -1;
            }
            return typeof a < typeof b ? 1 : -1;
        }
        else {
            throw ("error");
        }
    }
}

var postCache = {};

function get(user_id, timestamp, refresh, count, from){
    if (timestamp == 'undefined') timestamp = 0;
    count = count || 10;
    let key = user_id.toString();
    if (typeof user_id == 'string') user_id = new ObjectID(user_id);
    return utils.getDb()
    .then( db => {
        return db.collection(globals.databaseCollection.Questions).findOne({_id: user_id})
    })
    .then( question => {
        if (!question) return {list:[]};
        postCache[key] = {
            timestamp : question.timestamp,
            posts : question.posts.sort(by('timestamp'))
        }
        if(refresh){
            if(postCache[key].timestamp > timestamp){
                return {list: postCache[key].posts.slice(0, count)}
            }else{
                return {list: []}
            }
        }else{
            let list = [];
            for(let index in postCache[key].posts){
                if (postCache[key].posts[index].timestamp < timestamp) {list.push(postCache[key].posts[index])}
            }
            if (list.length == 0) return {list: []}
            return {list: list.slice(0, count)}
        }
    })
}

function add(user_id, post){
    let _db;
    let key = user_id.toString();
    let timestamp = new Date(post.date).getTime();
    let question = {
        _id: post._id.toString(),
        content: post.content,
        audioFiles: post.audioFiles,
        photoFiles: post.photoFiles,
        date: post.date,
        timestamp: timestamp,
        price: post.price,
        category: post.category,
        status: globals.listStatus.add
    }
    if (typeof user_id == 'string') user_id = new ObjectID(user_id);
    return utils.getDb()
    .then( db => {
        _db = db;
        return db.collection(globals.databaseCollection.Questions).findOne({_id :user_id});
    })
    .then( result => {
        if (result) return true;
        let item = {
            _id : user_id,
            timestamp: timestamp,
            posts: []
        }
        return _db.collection(globals.databaseCollection.Questions).insert(item);
    })
    .then( result => {
        if(!result) throw globals.knownErrors.unknown;
        return _db.collection(globals.databaseCollection.Questions).findOne({_id: user_id, 'posts._id': question._id});
    })
    .then( result => {
        if (result) throw '该问题已经存在'
        return _db.collection(globals.databaseCollection.Questions).findOneAndUpdate({_id: user_id},
            {$set: {timestamp: timestamp}, $push: {posts: question}});
    })
    .then( upRes => {
        if (!upRes) throw globals.knownErrors.unknown;
        if (!postCache[key]){
            let posts = [];
            if (upRes.value.posts){
                upRes.value.posts.sort(by('timestamp'));
                posts = upRes.value.posts;   
                posts.unshift(question)
            }
            postCache[key] = {
                timestamp : timestamp,
                posts : posts
            }
        }else{
            postCache[key].posts.unshift(question);
            postCache[key].timestamp = timestamp;
        }
    })
}

function update(user_id, post_id, con) {
    let _db;
    let key = user_id.toString();
    let timestamp = new Date().getTime();
    let listStatus = con ? globals.listStatus.add : globals.listStatus.update;
    if (typeof user_id == 'string') user_id = new ObjectID(user_id);
    return utils.getDb()
    .then( db => {
        _db = db;
        return _db.collection(globals.databaseCollection.Questions).findOne({_id: user_id, 'posts._id': post_id});
    })
    .then( question => {
        if (!question) return true;
        return _db.collection(globals.databaseCollection.Questions).update(
            {_id: user_id, 'posts._id': post_id},
            {$set :{'posts.$.status': listStatus, 'posts.$.timestamp': timestamp, timestamp: timestamp}}
        )
    })
    .then( result => {
        if (!result) throw 'update err';
        if (postCache[key]){
            postCache[key].timestamp = timestamp;
            for (let index in postCache[key].posts){
                if (postCache[key].posts[index]._id == post_id){
                    let temp = postCache[key].posts[index];
                    postCache[key].posts.splice(index, 1);
                    temp.timestamp = timestamp;
                    temp.status = globals.listStatus.update;
                    postCache[key].posts.unshift(temp);
                }
            }
        }
    })
}

function complete(user_id, post_id) {
    let _db;
    let key = user_id.toString();
    let timestamp = new Date().getTime();
    if (typeof user_id == 'string') user_id = new ObjectID(user_id);
    return utils.getDb()
    .then( db => {
        _db = db;
        return _db.collection(globals.databaseCollection.Questions).findOne({_id: user_id,'posts._id': post_id});
    })
    .then( question => {
        if (!question) return true;
        return _db.collection(globals.databaseCollection.Questions).update(
            {_id: user_id, 'posts._id':post_id},
            {$set:{'posts.$.status': globals.listStatus.complete, 'posts.$.timestamp': timestamp, timestamp: timestamp}}
        )
    })
    .then( result => {
        if (!result) throw '更新我的问题历史失败';
        if (postCache[key]){
            postCache[key].timestamp = timestamp;
            for (let index in postCache[key].posts){
                if (postCache[key].posts[index]._id == post_id){
                    let temp = postCache[key].posts[index]
                    postCache[key].posts.splice(index, 1);
                    temp.timestamp = timestamp;
                    temp.status = globals.listStatus.complete;
                    postCache[key].posts.unshift(temp);
                }
            }
        }
    })
}

function remove(user_id, post_id){
    let _db;
    if (typeof user_id == 'string') user_id = new ObjectID(user_id);
    return utils.getDb()
    .then( db => {
        _db = db;
        return _db.collection(globals.databaseCollection.Question).findOne({_id: user_id});
    })
    .then( data => {
        let arr = data.posts;
        for(var i in arr){
            if (arr[i]._id == post_id) arr.splice(i, 1);
        }
        return _db.collection(globals.databaseCollection.Question).update({_id: user_id}, {$set: {posts: arr}});
    })
}

exports.get = get;
exports.add = add;
exports.update = update;
exports.complete = complete;
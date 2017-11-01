'use strict';
const ObjectID = require('mongodb').ObjectID;
const globals = require('../globals');
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

let postCache = {};

function get(user_id, timestamp, refresh, count){
    count = count | 10;
    let key = user_id.toString();
    if (timestamp == 'undefined' || timestamp == '') timestamp = 0;
    if (typeof user_id == 'string') user_id = new ObjectID(user_id);
    return utils.getDb()
    .then( db => {
        return db.collection(globals.databaseCollection.Answers).findOne({_id: user_id})
    })
    .then( answer => {
        if (!answer) return {list: []}
        postCache[key] = {
            timestamp : answer.timestamp,
            posts :  answer.posts.sort(by('timestamp'))
        }
        if (refresh){
            if (postCache[key].timestamp > timestamp) return {list: postCache[key].posts.slice(0, count)};
            return {list:[]};
        }
        let list = [];
        for (let index in postCache[key].posts){
            if (postCache[key].posts[index].timestamp < timestamp ){
                list.push(postCache[key].posts[index]);
            }
        }
        return {list: list.slice(0, count)};
    })
}

function add(user_id, post_id){
    let _db;
    let key = user_id.toString();
    let timestamp;
    let answer = {};
    if (typeof user_id == 'string') user_id = new ObjectID(user_id);
    return utils.getDb()
    .then( db =>{
        _db = db;
        return _db.collection(globals.databaseCollection.Posts).findOne({_id: new ObjectID(post_id)});
    })
    .then( post => {
        timestamp = new Date(post.startDate).getTime();
        let displayName = post.author.displayName;
        let avatar = post.author.avatar;
        if (post.anonymous){
            displayName = '匿名用户';
            avatar = 'data/anonymous.png';
        }
        let author = {
            _id : post.author._id,
            displayName: displayName,
            avatar: avatar,
            score: post.author.score
        }
        answer = {
            _id : post_id,
            author: author,
            audioFiles: post.audioFiles,
            photoFiles: post.photoFiles,
            content : post.content,
            date : post.date,
            timestamp : timestamp,
            price : post.price,
            category : post.category,
            status : globals.listStatus.add
        }
        return _db.collection(globals.databaseCollection.Answers).findOne({_id: user_id});
    })
    .then( result => {
        if (result) return true;
        let item = {
            _id: user_id,
            timestamp: timestamp,
            posts: []
        }
        return _db.collection(globals.databaseCollection.Answers).insert(item);
    })
    .then( result => {
        if (!result) throw globals.knownErrors.unknown;
        return _db.collection(globals.databaseCollection.Answers).findOne({_id: user_id, 'posts._id': answer._id});
    })
    .then( result => {
        if (result) throw '该问题已存在';
        return _db.collection(globals.databaseCollection.Answers).findOneAndUpdate(
            {_id : user_id},
            {$set: {timestamp: timestamp}, $push: {posts: answer}})
    })
    .then( upAns => {
        if (!upAns) throw globals.knownErrors.unknown;
        if (!postCache[key]) {
            let posts = [];
            if (upAns.value.posts) {
                upAns.value.posts.sort(by('timestamp'))
                posts = upAns.value.posts;
                posts.unshift(answer);
            }
            postCache[key] = {
                timestamp : timestamp,
                posts : posts
            }
        }else{
            postCache[key].posts.unshift(answer);
            postCache[key].timestamp = timestamp;
        }
    })
}

function remove(user_id, post_id){
    let _db;
    if (typeof user_id == 'string') user_id = new ObjectID(user_id);
    return utils.getDb()
    .then( db => {
        _db = db;
        return _db.collection(globals.databaseCollection.Answers).findOne({_id: user_id});
    })
    .then( data => {
        let arr = data.posts;
        for (var i in arr){
            if (arr[i]._id == post_id) arr.splice(i, 1);
        }
        return _db.collection(globals.databaseCollection.Answers).update({_id: user_id}, {$set: {posts: arr}});
    })
}

function update(user_id, post_id){
    let _db;
    let key = user_id.toString();
    let timestamp = new Date().getTime();
    if (typeof user_id == 'string') user_id = new ObjectID(user_id);
    return utils.getDb()
    .then( db => {
        _db = db;
        return _db.collection(globals.databaseCollection.Answers).findOne({_id: user_id, 'posts._id': post_id});
    })
    .then( answer => {
        if (!answer) return true;
        return _db.collection(globals.databaseCollection.Answers).update(
            {_id : user_id, 'posts._id' : post_id},
            {$set :{'posts.$.status': globals.listStatus.update, 'posts.$.timestamp': timestamp, timestamp: timestamp}}
        )
    })
    .then( result => {
        if (!result) return globals.knownErrors.unknown;
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


function complete(user_id, post_id){
    let _db;
    let key = user_id.toString();
    let timestamp = new Date().getTime();
    if (typeof user_id == 'string') user_id = new ObjectID(user_id);
    return utils.getDb()
    .then( db => {
        _db = db;
        return _db.collection(globals.databaseCollection.Answers).findOne({_id: user_id,'posts._id': post_id});
    })
    .then( answer => {
        if (!answer) return true;
        return _db.collection(globals.databaseCollection.Answers).update(
            {_id: user_id, 'posts._id' :post_id},
            {$set: {'posts.$.status': globals.listStatus.complete, 'posts.$.timestamp' : timestamp, timestamp: timestamp}}
        )
    })
    .then( result => {
        if (!result) throw globals.knownErrors.unknown;
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

exports.get = get;
exports.add = add;
exports.update = update;
exports.complete = complete;
exports.remove = remove;
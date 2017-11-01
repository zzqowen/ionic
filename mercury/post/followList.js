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


let postList = {};

function get(_id, timestamp, refresh, num){
    num = num || 10;
    let key = _id.toString();
    if (typeof _id == 'string') _id = new ObjectID(_id);
    if (timestamp == 'undefined' || timestamp == '') timestamp = 0;
    if (!postList[key]){
        return utils.getDb()
        .then( db => {
            return db.collection(globals.databaseCollection.Follows).findOne({_id: _id})
        })
        .then( follow => {
            if (!follow) return {list: []}
            postList[key] = {
                timestamp : follow.timestamp,
                posts: follow.posts.sort(by('timestamp'))
            }
            return {list: postList[key].posts.slice(0, num)}
        })
    }else{
        if(refresh){
            if(postList[key].timestamp > timestamp){
                return {list: postList[key].posts.slice(0, num)}
            }else{
                return {list:[]}
            }
        }else{
            let list = [];
            for (let index in postList[key].posts){
                if (postList[key].posts[index].timestamp < timestamp){
                    list.push(postList[key].posts[index]);
                }
            }
            return {list: list.slice(0, num)}
        }
    }
}

function add(user_id, post_id){
    let _db;
    let follow;
    let timestamp;
    let key = user_id.toString();
    if (typeof user_id == 'string') user_id = new ObjectID(_id);
    return utils.getDb()
    .then( db => {
        _db = db;
        return _db.collection(globals.databaseCollection.Posts).findOne({_id: new ObjectID(post_id)});
    })
    .then( post => {
        if (!post) throw globals.knownErrors.postNotFound;
        timestamp = new Date().getTime();
        let author = {
            _id: post.author._id,
            displayName: post.author.displayName,
            avatar: post.author.avatar,
            score: post.author.score
        }
        follow = {
            _id: post._id.toString(),
            author: author,
            content: post.content,
            audioFiles: post.audioFiles,
            photoFiles: post.photoFiles,
            date: post.date,
            timestamp: timestamp,
            price: post.price,
            category: post.category
        }
        return _db.collection(globals.databaseCollection.Follows).findOne({_id: user_id})
    })
    .then( result => {
        if (result) return true;
        let item = {
            _id: user_id,
            timestamp: timestamp,
            posts: []
        }
        return _db.collection(globals.databaseCollection.Follows).insert(item);
    })
    .then( result => {
        if (!result) throw globals.knownErrors.unknown;
        return _db.collection(globals.databaseCollection.Follows).findOne({_id: user_id, 'posts._id': post_id});
    })
    .then( result => {
        if (result) return true;
        return _db.collection(globals.databaseCollection.Follows).findOneAndUpdate({_id: _id},
        {$set: {timestamp: timestamp}, $push: {posts: follow}});
    })
    .then( upRes => {
        if (!upRes) throw globals.knownErrors.unknown;
        if (!postList[key]){
            let posts = [];
            if (upRes.value.posts){
                upRes.value.posts.sort(by('timestamp'));
                posts = upRes.value.posts;
                posts.unshift(follow)
            }
            postList[key] = {
                timestamp : timestamp,
                posts : posts
            }
        }else{
            postList[key].posts.unshift(follow);
            postList[key].timestamp = timestamp;
        }
    })
}

function toggle(user_id, post_id){
    let _db;
    let item;
    let follow;
    let timestamp;
    let key = user_id.toString();
    if (typeof user_id == 'string') user_id = new ObjectID(user_id);

    return utils.getDb()
    .then( db => {
        _db = db;
        return _db.collection(globals.databaseCollection.Posts).findOne({_id: new ObjectID(post_id)});
    })
    .then( post => {
        if (!post) throw globals.knownErrors.postNotFound;
        timestamp = new Date().getTime();
        let author = {
            _id: post.author._id,
            displayName: post.author.displayName,
            avatar: post.author.avatar,
            score: post.author.score
        }
        follow = {
            _id: post._id.toString(),
            author: author,
            content: post.content,
            audioFiles: post.audioFiles,
            photoFiles: post.photoFiles,
            date: post.date,
            timestamp: timestamp,
            price: post.price,
            category: post.category
        }
        return _db.collection(globals.databaseCollection.Follows).findOne({_id: user_id});
    })
    .then( result => {
        if (result) return true;
        let item = {
            _id : user_id,
            timestamp : timestamp,
            posts : []
        }
        return _db.collection(globals.databaseCollection.Follows).insert(item);
    })
    .then( upRes => {
        if (!upRes) throw globals.knownErrors.unknown;
        return _db.collection(globals.databaseCollection.Follows).findOne({_id: user_id, 'posts._id': post_id})
    })
    .then( result => {
        if (result){
            if (postList[key]){
                postList[key].timestamp = timestamp;
                for (let index in postList[key].posts){
                    if (postList[key].posts[index]._id == post_id){postList[key].posts.splice(index, 1)}
                }
            }
            return _db.collection(globals.databaseCollection.Follows).update(
            {_id: user_id},{$set: {timestamp: timestamp}, $pull: {posts:{_id: post_id}}})
        }else{
            if (postList[key]){
                postList[key].timestamp = timestamp;
                postList[key].posts.unshift(follow);
            }
            return _db.collection(globals.databaseCollection.Follows).update({_id: user_id},
            {$set: {timestamp: timestamp}, $push: {posts: follow}})
        }
    })
}

function getList(user_id){
    let post_ids = [];
    let key = user_id.toString();
    if (typeof user_id == 'string') user_id = new ObjectID(user_id);
    return new Promise( (resolve, reject) => {
        if (!postList[key]){
            resolve(utils.getDb()
            .then( db => {
                return db.collection(globals.databaseCollection.Follows).findOne({_id: user_id});
            })
            .then( follows => {
                if (!follows) return [];
                postList[key] ={
                    timestamp: follows.timestamp,
                    posts: follows.posts.sort(by('timestamp'))
                }
                for (let index in postList[key].posts){
                    post_ids.push(postList[key].posts[index]._id)
                }
                return post_ids;
            }))
        }else{
            for (let index in postList[key].posts){
                post_ids.push(postList[key].posts[index]._id)
            }
            resolve(post_ids);
        }
    })
}

exports.get = get;
exports.add = add;
exports.toggle = toggle;
exports.getList = getList;

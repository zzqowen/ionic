'use strict'

const ObjectID  = require('mongodb').ObjectID;
const utils = require('../utils');
const globals = require('../globals');

function get2(user_id, body){
    const author_id = body.author_id;
    const size = body.size || globals.posts.count;
    const date = body.date || new Date().toJSON();
    let _db;
    return utils.getDb()
    .then( db => {
        return db.collection(globals.databaseCollection.Posts).find(
            {isQuestion: true, 'author._id': author_id, date: {$lt: date}, anonymous: false, status: {$ne: globals.postState.deleted}}
        ).limit(size).sort({date: -1}).toArray();
    })
    .then( posts => {
        return posts;
    })
}

function get(user_id, body){
    const author_id = body.author_id;
    const size = body.size || globals.posts.count;
    const date = body.date || new Date().toJSON();
    let _db;
    let postList = [];
    return utils.getDb()
    .then( db => {
        _db = db;
        return db.collection(globals.databaseCollection.Posts).find(
            { isQuestion: true, 'author._id': author_id, date: {$lte: date}, status:{$ne:globals.postState.deleted}}
        ).limit(size).toArray();
    })
    .then( posts => {
        if (!posts) throw globals.knownErrors.noMorePosts;
        let promises = posts.map( post => {
            return new Promise( (resolve, reject) => {
                resolve(getDetail(post, post._id, post.comments));
            })
        });
        return Promise.all(promises)
    })
}

// 一问一答 && 聊天记录
function getDetail(post){
    let post_id = post._id;
    let comments = [];
    let qalist = [];
    let comlist = [];
    let _db;
    if (post.comments){
        for (let index in post.comments){
            comments[index] = new ObjectID(post.comments[index]);
        }
    }
    return utils.getDb()
    .then( db => {
        _db = db;
        return _db.collection(globals.databaseCollection.Posts).find({_id: {$in :comments}}).sort({date:1}).toArray();
    })
    .then( chats => {
        comlist = chats;
        return _db.collection(globals.databaseCollection.Discuss).findOne({_id: post_id});
    })
    .then( discuss => {
        if (!discuss) return {post:post, comlist: comlist, qalist: []};
        for (let index in discuss.comments){
            if (discuss.comments[index].answered){ qalist.push(discuss.comments[index]) };
        }
        return {post: post, comlist: comlist, qalist: qalist};
    })
}

exports.get = get2;

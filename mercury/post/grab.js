'use strict'

const globals = require('../globals');
const ObjectID = require('mongodb').ObjectID;
const utils = require('../utils');
const push = require('../pushHandlers');


function get(post_id, user_id){
    let _db;
    let author_id;
    return utils.getDb()
    .then( db => {
        _db = db;
        return _db.collection(globals.databaseCollection.Posts).findOne({_id: new ObjectID(post_id), status: globals.postState.active})
    })
    .then( post => {
        if (!post) throw globals.knownErrors.posthavaGrab;
        author_id = post.author._id;
        return _db.collection(globals.databaseCollection.Grabs).findOne({_id: new ObjectID(post_id)});
    })
    .then( grab => {
        if (!grab) return [];
        let date = new Date().getTime();
        let users = [];
        if (author_id == user_id){
            for (let index in grab.users){
                if (grab.users[index].deadLine > date){ users.push(grab.users[index])}
            }
        }else{
            for (let index in grab.users){
                if (grab.users[index]._id == user_id){users.push(grab.users[index])}
            }
        }
        return users;
    })
}

function add(user_id, body){
    let timestamp = new Date().getTime();
    let _db;
    let grabInfo;
    let displayName;
    let post_id = body.post_id;
    let deadLine = new Date(body.deadLine).getTime();
    let author_id = body.author_id;
    return utils.getDb()
    .then( db => {
        _db = db;
        return _db.collection(globals.databaseCollection.Posts).findOne({_id: new ObjectID(post_id), status: globals.postState.active});
    })
    .then( post => {
        if (!post) throw globals.knownErrors.posthavaGrab;
        return _db.collection(globals.databaseCollection.Users).findOne({_id: new ObjectID(user_id)});
    })
    .then( user => {
        displayName = user.displayName;
        grabInfo = {
            _id: user_id,
            id: user.id,
            avatar: user.avatar,
            deadLine: deadLine,
            displayName: displayName
        }
        return _db.collection(globals.databaseCollection.Grabs).findOne({_id: new ObjectID(post_id)});
    })
    .then( result => {
        if (result) return true;
        let item = {
            _id: new ObjectID(post_id),
            users: []
        }
        return _db.collection(globals.databaseCollection.Grabs).insert(item);
    })
    .then( upRes => {
        if (!upRes) throw globals.knownErrors.unknown;
        return _db.collection(globals.databaseCollection.Grabs).findOne({_id: new ObjectID(post_id),'users._id': user_id});
    })
    .then( user => {
        if (user){
            for (let index in user.users){
                if (user.users[index]._id == user_id){
                    if (user.users[index].deadLine > timestamp) throw globals.knownErrors.haveGrabPosts;
                    return _db.collection(globals.databaseCollection.Grabs).update({_id: new ObjectID(post_id), 'users._id':user_id},
                    {$set: {'users.$.deadLine': deadLine}})
                }
            }
        }
        return _db.collection(globals.databaseCollection.Grabs).update({_id: new ObjectID(post_id)},{$push: {users: grabInfo}});
    })
    .then( upRes => {
        if (!upRes) throw globals.knownErrors.grabPostsFail;
        let message = {
            alert : `${displayName}参与你的提问的抢答`,
            _id : post_id,
            message : globals.message.grabs
        }
        push.sendNotification(author_id, message);
        return true;
    })
}

function cancel(post_id, user_id){
    let _db;
    return utils.getDb()
    .then( db => {
        _db = db;
        return _db.collection(globals.databaseCollection.Grabs).update({_id: new ObjectID(post_id)},
        {$pull: {'users': {_id: user_id}}});
    })
    .then( upRes => {
        return _db.collection(globals.databaseCollection.Users).update({_id: new ObjectID(user_id)},
        {$inc:{score: -1*globals.score.cancelPost}});
    })
    .then( upRes => {
        if (!upRes) throw globals.knownErrors.cancelFail;
        return true;
    })
}

function getList(user_id){
    return utils.getDb()
    .then( db => {
        return db.collection(globals.databaseCollection.Grabs).find({'users._id' : user_id}).toArray();
    })
    .then( posts => {
        if (!posts) return [];
        let lists = [];
        for (let index in posts) {
            lists.push(posts._id.toString());
        }
        return lists;
    })
}

exports.get = get;
exports.add = add;
exports.cancel = cancel;
exports.getSimpleList = getList;

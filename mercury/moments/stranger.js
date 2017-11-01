'use strict'

const ObjectID = require('mongodb').ObjectID;
const utils = require('../utils');
const globals = require('../globals');

function get(user_id, body){
    let date = body.date || new Date().toJSON();
    let _db ;
    let friendList = [];

    return utils.getDb()
    .then( db => {
        _db = db;
        return _db.collection(globals.databaseCollection.Friends).findOne({_id: new ObjectID(user_id)});
    }) 
    .then( myFriend => {
        if (myFriend && myFriend.friendlist){
            for(let index in myFriend.friendlist){
                if (myFriend.friendlist[index])
                    friendList.push(myFriend.friendlist[index]._id);
            }
        }
        friendList.push(user_id);
        return _db.collection(globals.databaseCollection.Posts).find(
            {'author._id': {$nin: friendList}, date: {$lt: date}, 'expert._id': {$ne: user_id}, status:{$in:[globals.postState.answered, globals.postState.closed]}}).limit(globals.posts.count).sort({date: -1}).toArray();
    })
    .then( posts => {
        if (!posts) throw globals.knownErrors.notFoundPosts;
        return posts;
    })
}

exports.get = get;
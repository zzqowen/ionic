'use strict'

const ObjectID = require('mongodb').ObjectID;
const globals = require('../globals');
const utils = require('../utils');

function get(user_id, body){
    let _db;
    let friendlist = [];
    let date = body.date || new Date().toJSON();

    return utils.getDb()
    .then( db => {
        _db = db;
        return _db.collection(globals.databaseCollection.Friends).findOne({_id: new ObjectID(user_id)})
    })
    .then( Friends => {
        if (!Friends || !Friends.friendlist) return [];
        for (let index in Friends.friendlist){
            friendlist.push(Friends.friendlist[index]._id)
        }
        return _db.collection(globals.databaseCollection.Posts).find(
            {isQuestion: true, 'author._id': {$in: friendlist}, peek: true, anonymous:false, date: {$lt: date}}).limit(10).sort({date:-1}).toArray();
    })
}


function getActivity(ids){
    let _db;
    if (!ids) return '已无更多';
    return utils.getDb()
    .then( db => {
        _db = db;
        let promises = ids.map( id => {
            return new Promise( (resolve, reject) => {
                 resolve( _db.collection(globals.databaseCollection.Posts).find(
                     {isQuestion: true, 'author._id': id, peek: true}
                 ).limit(1).sort({date: -1}))
            })
        })
        return Promise.all(promises);
    })
}

function getList(user_id){
    return utils.getDb()
    .then( db => {
        return db.collection(globals.databaseCollection.Friends).findOne({_id: new ObjectID(user_id)})
    })
    .then( Friends => {
        return Friends.friendlist;
    })
}

exports.get = get;
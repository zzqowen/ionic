'use strict'

const ObjectID = require('mongodb').ObjectID;
const globals = require('../globals');
const utils = require('../utils');

function add(user_id, body){
    let _db;
    let type = body.type;
    let reason = body.reason;
    let content = body.content;
    let post_id = body.post_id || '';
    let u_id = body.u_id||'';
    let date = new Date().toJSON();
    return utils.getDb()
    .then( db => {
        _db = db;
        return _db.collection(globals.databaseCollection.Complaints).findOne({user_id: user_id, post_id: post_id});
    })
    .then( postRes => {
        if (postRes && postRes.post_id !== '') throw globals.knownErrors.haveComplaints;
        let item = {
            user_id: user_id,
            type: type,
            reason: reason,
            content: content,
            post_id: post_id,
            u_id: u_id,
            date: date,
            resolves:[],
            resolve: false
        }
        return _db.collection(globals.databaseCollection.Complaints).insert(item);
    })
}

function update(body){
    let resolveItem = {
        content: body.content,
        date: new Date().toJSON()
    }
    let resolve = body.resolve;
    let complaints_id = body.complaints_id;

    return utils.getDb()
    .then( db => {
        return db.collection(globals.databaseCollection.Complaints).update(
            {_id: new ObjectID(complaints_id)},
            {$set:{resolve: resolve}, $push:{resolves: resolveItem}})
    })
}

function get(user_id){
    if (user_id != 'aaa') return '管理员才可查看'
    return utils.getDb()
    .then( db => {
        return db.collection(globals.databaseCollection.Complaints).find({resolve: false})
            .limit(100).sort({date: 1});
    })
}

exports.add = add;
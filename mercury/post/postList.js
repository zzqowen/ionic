'use strict';

const ObjectID = require('mongodb').ObjectID;
const utils = require('../utils');
const globals = require('../globals');

function getPosts(_id, body) {
    let banner = [
        {img:'banner1.png', url: 'banner.html'}
    ]
    let refresh = body.refresh || false;
    let _date = body.date || new Date().toJSON();
    if (body.date == 'undefined') _date = new Date().toJSON();
    _id = _id.toString();
    let _db;
    return utils.getDb()
    .then( db => {
        _db = db;
        return _db.collection(globals.databaseCollection.Posts).find(
            {'author._id': {$ne: _id}, status: globals.postState.active, isQuestion: true, date: {$lt: _date}}
        ).limit(globals.questions.count).sort({date: -1}).toArray();
    })
    .then( posts => {
        if (refresh) return {posts, banner};
        return {posts};
    })
}

function getPosts2(_id, body){
    let banner = [
        {img:'banner1.png', url:'banner.html'}
    ]
    let from = body.from;
    let posts = [];
    let refresh = body.refresh || false;
    let _date = body.date || new Date().toJSON();
    if (body.date == 'undefined') _date = new Date().toJSON();
    _id = _id.toString();
    let _db;
    if (from != 'yy'){
        return utils.getDb()
        .then( db => {
            _db = db;
            return _db.collection(globals.databaseCollection.Posts).find(
                {'author.source':{$ne:'yy'}, status: globals.postState.active, isQuestion: true, date: {$lt: _date}})
                .limit(globals.questions.count).sort({date:-1}).toArray();
        })
        .then( userposts =>{
            for (let index = 0 ; index < userposts.length ; index++){
                posts.push(userposts[index]);
            }
            if (posts.length<10)
                return _db.collection(globals.databaseCollection.Posts).find(
                    {'author.source':'yy', status: globals.postState.active, isQuestion: true})
                    .limit(globals.questions.count - posts.length).sort({date:-1}).toArray();
             else
                return [];
        })
        .then( yyposts => {
            for (let index = 0 ; index < yyposts.length ; index++){
                posts.push(yyposts[index]);
            }
            if (refresh) return {posts, banner};
            return {posts};
        })
    }else{
        return utils.getDb()
        .then( db => {
            _db = db;
            return _db.collection(globals.databaseCollection.Posts).find(
                {'author.source':'yy', status: globals.postState.active, isQuestion: true, date: {$lt: _date}})
                .limit(globals.questions.count - posts.length).sort({date: -1}).toArray();
        })
        .then( yyposts => {
            if (refresh) return {posts:yyposts, banner:banner};
            return {posts: yyposts};
        })
    }
}

function get(category, user_id, body){
    let _date = body.date || new Date().toJSON();
    if (body.date == 'undefined') _date = new Date().toJSON();
    user_id = user_id.toString();
    let _db;
    return utils.getDb()
    .then( db => {
        _db = db;
        return _db.collection(globals.databaseCollection.Posts).find(
            {'author._id': {$ne: user_id}, status: globals.postState.active, isQuestion: true, category: category, date: {$lt: _date}}
        ).limit(globals.questions.count).sort({date: -1}).toArray();
    })
    .then( posts => {
        return posts;
    })
}

function get2(category, user_id, body){
    let _date = body.date || new Date().toJSON();
    if (body.date == 'undefined') _date = new Date().toJSON();
    user_id = user_id.toString();
    let from = body.from;
    let posts = [];
    let _db;
    if (from != 'yy'){
        return utils.getDb()
        .then( db => {
            _db = db;
            return _db.collection(globals.databaseCollection.Posts).find(
                {'author.source': {$ne: 'yy'}, status:globals.postState.active, isQuestion: true, category: category, date: {$lt: _date}})
                .limit(globals.questions.count).sort({date: -1}).toArray();
        })
        .then( userposts => {
            for (let index = 0; index < userposts.length; index++){
                posts.push(userposts[index]);
            }
            if (posts.length < 10)
                return _db.collection(globals.databaseCollection.Posts).find(
                    {'author.source': 'yy', status: globals.postState.active, isQuestion: true, category: category})
                    .limit(globals.questions.count - posts.length).sort({date :-1}).toArray();
            else
                return [];
        })
        .then( yyposts => {
            for (let index = 0 ; index < yyposts.length ; index++ ){
                posts.push(yyposts[index]);
            }
            return posts;
        })
    }else{
        return utils.getDb()
        .then( dn => {
            _db = db;
            return _db.collection(globals.databaseCollection.Posts).find(
                {'author.source': 'yy', status: globals.postState.active, isQuestion: true, category: category, date: {$lt: _date}})
                .limit(globals.questions.count).sort({date: -1}).toArray();
        })
        .then( yyposts => {
            posts = yyposts;
            return posts;
        })
    }
}   

exports.getPosts = getPosts;
exports.get = get;
exports.getPosts2 = getPosts2;
exports.get2 = get2;
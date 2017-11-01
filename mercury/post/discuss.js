'use strict';

const utils = require('../utils');
const globals = require('../globals');
const ObjectID = require('mongodb').ObjectID;
const sendNotification = require('../pushHandlers').sendNotification;


function add(user_id, body){
    let _db;
    if (body.content == '') throw globals.knownErrors.needMoreContent;
    let content = body.content;
    let photoFiles = body.photoFiles;
    let audioFiles = body.audioFiles;
    let post_id = body.post_id;
    let postUser_id = body.postUser_id;
    let questionId = new Date().getTime();
    let questionItem = {
        qid: questionId,
        user_id: user_id,
        qcontent: content,
        qphotos: photoFiles,
        qaudios: audioFiles,
        answered: false
    }
    return utils.getDb()
    .then( db => {
        _db = db;
        return _db.collection(globals.databaseCollection.Discuss).findOne({_id: ObjectID(post_id)});
    })
    .then( discuss => {
        if(discuss) return true;
        let item = {
            _id: new ObjectID(post_id),
            user_id: postUser_id,
            comments: []
        }
        return _db.collection(globals.databaseCollection.Discuss).insert(item);
    })
    .then( flag => {
        if (!flag) throw globals.knownErrors.unknown;
        return _db.collection(globals.databaseCollection.Discuss).update(
            {_id: new ObjectID(post_id)},
            {$push: {comments: questionItem}}
        )
    })
    .then( upRes =>{
        if (!upRes) throw globals.knownErrors.addQuestionError;
        sendNotification(postUser_id, {message:`问:${content}`, type: globals.message.discuss});
        return true;
    })
}

function get(user_id, post_id){
  return utils.getDb()
  .then( db => {
    return db.collection(globals.databaseCollection.Discuss).findOne({_id: new ObjectID(post_id)});
  })
  .then( discuss => {
    if (!discuss) return [];
    if (discuss.user_id == user_id) return discuss.comments;
    let questions = []; 
    for (let index in discuss.comments){
        if (discuss.comments[index].answered || discuss.comments[index].user_id == user_id) { questions.push(discuss.comments[index]) }
    }
    return questions;
  })
}

function answer(user_id, body){
    let _db;
    let post_id = body.post_id;
    let qid = body.qid;
    let ask_id = body.user_id;
    let content = body.content;
    return utils.getDb()
    .then( db => {
        _db = db;
        return db.collection(globals.databaseCollection.Discuss).findOne({_id: new ObjectID(post_id)});
    })
    .then( post =>{
        if (post.user_id != user_id) throw '抱歉，只有提问者可以评论！';
        sendNotification(ask_id, {message:`答:${content}`, type: globals.message.discuss});
        return _db.collection(globals.databaseCollection.Discuss).update(
            {_id: new ObjectID(post_id), 'comments.qid': qid},
            {$set:{'comments.$.answered': true, 'comments.$.acontent': content}});
    })
}

exports.add = add;
exports.get = get;
exports.answer = answer;

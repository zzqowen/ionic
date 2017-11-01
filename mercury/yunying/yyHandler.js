'use strict';

const express = require('express');

const account = require('./account');
const utils = require('../utils')
const Post = require('./post');
const yyfile = require('./file')

function addAccount(req, res){
    let body = req.body;
    account.add(body)
    .then( result => {
        utils.respondWithOk(result, req, res);
    })
    .catch( err => {
        utils.respondWithError(err, err, req, res);
    })
}

function settingPost(req, res){
  let type = req.params.type;
  let body = req.body;
  try{
    return new Promise(function (resolve, reject) {
      if (type == 'get')
        return resolve(Post.get(body));
      if (type == 'getTop') 
        return resolve(Post.getTop(body));
      if (type == 'setTop')
        return resolve(Post.setTop(body));
      if (type == 'cancleTop')
        return resolve(Post.cancleTop(body));
    }).then( result =>{
      utils.respondWithOk(result, req, res);
    })
  } catch (e){
    utils.respondWithError(e, globals.knownErrors.unknown, req, res);
  }
}

function createPost(req, res){
  let body = req.body;
  if(body.content == '' && body.audioFiles == [] && body.photoFiles == [] || body.category == '')
    utils.respondWithError(null,'信息不完善，不合法发单');
  Post.create(body)
  .then( result => {
    utils.respondWithOk(result, req, res);
  })
  .catch( e =>{
    utils.respondWithError(e, e, req, res);
  })
}

exports.api = new express.Router()
.post('/account/add', addAccount)
.post('/posts/:type', settingPost)
.post('/upload', yyfile.upload2)
.post('/post/create', createPost)
;

'use strict';

const globals = require('../globals');
const utils = require('../utils');

function randomString(x){
    this.x = x;
    let base = '@aAbBcCdDeEfFgGhHiIjJkKlLmMnNoOpPqQrRsStTuUvVwWxXyYzZ ';
    let str = '';
    for(let i = 0 ; i < x ; i++){
        let index = parseInt(Math.random()*base.length)
        str += base.slice(index, index+1);
    }
    return str;
}

function add(body){
    let displayName = body.displayName || randomString(8);
    let password = body.password || 'yy.darwin.test';
    let summary = {"asked" : 0,"answered" : 0,"spent" : 0,"earned" : 0};
    let loginDate = new Date().toJSON();
    let registered = new Date().toJSON();
    let accountType = globals.accountType.yunying;
    let credit = body.credit == 'undefined' ? '100': body.credit;
    let interests = ["/edu", "/entertainment", "/emotion", "/life", "/sports", "/other"]
    let gender = body.gender == 'M'?'M':'F';
    let userName;

    return utils.getDb()
    .then( db => {
        let id = utils.getNextId();
        userName = id + '@darwin.com';
        let userItem = {
            id: id,
            form: 'yy',
            mobile: '',
            userName: userName,
            displayName: displayName,
            password: 'yy.darwin.test',
            loginDate: loginDate,
            avatar: 'data/darwin.png',
            reviews: [],
            totalReviews: 0,
            rating: 0,
            registered: registered,
            accountType: accountType,
            credit: credit,
            score: 2000,
            interests: interests,
            gender: gender
        }
        return db.collection(globals.databaseCollection.Users).insert(userItem);
    })
    .then( upRes => {
        if (!upRes.ops) throw globals.knownErrors.unknown;
        return `创建账号成功, 用户名: ${userName}`;
    })
}

exports.add = add;
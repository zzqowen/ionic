'use strict'

const ObjectID = require('mongodb').ObjectID;
const globals = require('../globals');
const utils = require('../utils');

const moment = require('moment');

function get(user_id){
    let amount = (0.01 + 0.01 * parseInt(Math.random()*19)).toFixed(2);
    let today = moment().format('YYYY-MM-DD');
    let time = new Date().toJSON();
    let todayCount = 0;  
    let sumCount;  
    let _db;
    let detail_item;

    return utils.getDb()
    .then( db =>{
        _db = db;
        return db.collection(globals.databaseCollection.LuckyMoney).findOne({_id: new ObjectID(user_id)});
    })
    .then( lucky => {
        if (lucky) return {ops:[lucky]};
        let item = {
            _id : new ObjectID(user_id),
            sumCount: 0,
            sumMoney: 0,
            details: []
        }
        return _db.collection(globals.databaseCollection.LuckyMoney).insert(item);
    })
    .then( lucky => {
        if (!lucky.ops) throw globals.knownErrors.unknown;
        sumCount = ++lucky.ops[0].sumCount;
        for(let index in lucky.ops[0].details){
            if (lucky.ops[0].details[index].date == today){todayCount++}
        }
        if (todayCount >= 7) amount = 0;
        detail_item = {date: today, amount: amount, time: time, received: false};
        return _db.collection(globals.databaseCollection.LuckyMoney).update({_id: new ObjectID(user_id)},
        {$set: {sumCount: sumCount}, $push: {'details': detail_item}},{allowExtendedOperators: true})
    })
    .then( upRes => {
        if (!upRes) throw globals.knownErrors.unknown;
        return detail_item;
    })
}

function receive(user_id, detail){
    let amount = Number(detail.amount);
    let _db;
    return utils.getDb()
    .then( db => {
        _db = db;
        return _db.collection(globals.databaseCollection.LuckyMoney).findOneAndUpdate(
            {_id: new ObjectID(user_id), 'details.date': detail.date, 'details.time': detail.time, 'details.received': false},
            {$set: {'details.$.received': true}, $inc: {sumMoney: amount}});
    })
    .then( upRes => {
        if(!upRes) throw globals.knownErrors.unknown;
        return _db.collection(globals.databaseCollection.Users).update({_id: new ObjectID(user_id)},
        {$inc: {credit: amount}})
    })
    .then( upRes => {
        if (!upRes) throw globals.knownErrors.unknown;
        return true;
    })
}

function history(user_id){
    return utils.getDb()
    .then( db => {
        return db.collection(globals.databaseCollection.LuckyMoney).findOne({_id: new ObjectID(user_id)})
    })
}

exports.get = get;
exports.receive = receive;
exports.history = history;
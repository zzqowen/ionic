const utils = require("../utils");
const logger = utils.logger;

function insert(collection, insert) {
    return utils.getDb().then(db => {
        return new Promise((resolve,reject) => {
            db.collection(collection).insert(insert, (err, result) => {
                if(err) reject(err);
                else resolve(result);
                db.close();
            });
        });
    });
}

function update(collection, find, update) {
    return utils.getDb().then(db => {
        return db.collection(collection).update(find, {$set: update}, {safe: true});
    });
}

function pushUpdate(collection, find, pushdata) {
    return utils.getDb().then(db => {
        return db.collection(collection).update(find, {$push: pushdata}, {safe: true});
    })
}

function upinsert(collection, find, update, insert) {
    return utils.getDb().then(db => {
        return db.collection(collection).findOneAndUpdate(find,
            {$set: update,$setOnInsert: insert},
            {upsert: true,returnOriginal: false}
        );
    });
}

function remove(colName, query) {
    return utils.getDb().then(db => {
        return db.collection(colName).remove(query);
    });
}

function aggregate(colName, query) {
    return new Promise((resolve, reject) => {
        utils.getDb().then(db => {
            db.collection(colName).aggregate(query).toArray(function (err, data) {
                if (err) 
                    reject(err);
                else
                    resolve(data);
            });
        });
    });
}

function find(collection, query) {
    return new Promise((resolve, reject) => {
        utils.getDb().then(function (db) {
            db.collection(collection).find(query).toArray(function (err, result) {
                if (err) {
                    reject(err);
                    return;
                }
                if (!result || result.length == 0)
                    return resolve([]);
                resolve(result);
            });
        });

    });
}

function findOne(collection, query) {
    return new Promise((resolve, reject) => {
        utils.getDb().then(function (db) {
            db.collection(collection).find(query).toArray(function (err, result) {
                if (err) {
                    reject(err);
                    return;
                }
                if (!result || result.length == 0)
                    return resolve({});
                if (result && result.length <= 1) {
                    resolve(result[0]);
                }
                db.close();
                reject("The result more than 1 result");
            });
        });

    });
}

exports.mongo = {
    update: update,
    upinsert: upinsert,
    insert: insert,
    aggregate: aggregate,
    findOne: findOne,
    find: find,
    pushUpdate: pushUpdate,
    remove: remove
}
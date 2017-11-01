const mongoUtils = require('../common/dbUtils').mongo;
const utils = require("../utils");
const globals = require("../globals")
const logger = utils.logger;

// Get friend dynamic by userid before the 'timestamp'
function getNewActivity(user_id, timestamp, limit) {
    return getFriendByUser_id(user_id).then(friendlist => {
        let query = [{$match: {user_id: {$in: friendlist}}}];
        if (timestamp) query.push({$match: {date: {$gt: timestamp}}});
        query.push({$sort: {"date": -1}});
        query.push({$limit: limit});
        return mongoUtils.aggregate(globals.databaseCollection.FriendActivity, query);
    });
}

function getOlderActivity(user_id, timestamp, limit) {
    return getFriendByUser_id(user_id).then(friendlist => {
        let query = [
            {$match: {user_id: {$in: friendlist}}},
            {$match: {date: {$lt: timestamp}}},
            {$sort: {"date": -1}},
            {$limit: limit}
        ];
        return mongoUtils.aggregate(globals.databaseCollection.FriendActivity, query);
    })
}

// Get friend dynamic by userid, page and pageSize not required
function getActivityByUser(user_id, page, pageSize) {
    return getFriendByUser_id(user_id).then(friendlist => {
        let skip = page && pageSize && (page - 1) * pageSize;
        let limit = skip && (skip + pageSize);
        let query = [
            { $match: {user_id: {$in: friendlist} } },
            { $sort: { date: -1 } },
        ];
        if (limit && skip) {
            query.push({$limit: limit});
            query.push({$skip: skip});
        }
        return mongoUtils.aggregate(globals.databaseCollection.FriendActivity, query);
    });
}

function updateFriend(arr, indata) {
    return utils.getDb().then(db => {
        return db.collection(globals.databaseCollection.FriendActivity).update(
                {useid: {$in: arr}},
                {$push: {"activity": indata}},
                {upsert: false, multi: true, safe: false}
        );
    });
}

function insertActivity(user_id, displayName, type, post) {
    var nowDate = new Date();
    
    return utils.findUserFromId(user_id).then(user => {
        return mongoUtils.insert(globals.databaseCollection.FriendActivity, {
            user_id: user._id.toString(),
            userid: user.id,
            displayName: user.displayName, 
            avatar: user.avatar,
            post: post,
            type: type,
        });
    });
}

function getFriendByUser_id(user_id) {
    return utils.findUserFromId(user_id).then(user => {
        if (!user.id) throw globals.knownErrors.userNotFound;
        return user.id
    }).then(getFriendByUserid);
}

function getFriendByUserid(userid) {
    return mongoUtils.findOne(globals.databaseCollection.Friends,{id: userid}).then(datas => {
        let friendList= [];
        logger.debug("friendlist:" + JSON.stringify(datas));
        if (datas && datas.friendlist && datas.friendlist.length > 0 ){
            datas.friendlist.forEach(data => friendList.push(data._id.toString()));
        }
        return friendList;
    });
}

exports.getActivityByUser = getActivityByUser;
exports.getNewActivity = getNewActivity;
exports.getOlderActivity = getOlderActivity;
exports.insertActivity = insertActivity;
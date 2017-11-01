const mongoUtils = require("../common/dbUtils").mongo;
const globals = require("../globals");
const utils = require("../utils");
const objectId = require("mongodb").ObjectID;
const pk = require("../game/pk");
const logger = utils.logger;
const pushHandler = require("../pushHandlers")

const pkAlert = {
    mapSuccess: "匹配成功",
    pkInvited: "该好友已被别人邀请"
}

const pkErrorCode = {
    raceIsEnd: "stop",
    answered: "answered"
};

const pkCode = {
    mapSuccess: "matchsuccess",
    pkManager: "pkmanager",
    pkError: "pkerror",
    pkPushQuestion: "pushquestion",
    pkBack: "backtopk",
    pkDisconnect: "disconnect",
    pkReconnect: "reconnect",
    pkJudge: "pkjudge",
    pkInvited: "pkinvited",
    pkCancelInvited: "cancelinvited"
};

let pkroom = {
    invite: {},
    beinvite: {},
    inviteTimeManager: null
}

function insertPkManager(datas) {
    return mongoUtils.insert(globals.databaseCollection.Pks, datas);
}

function updateQuestionById (queid, datas) {
    return utils.getDb().then(db => {
        return db.collection(globals.databaseCollection.Question).update({
            _id: objectId(queid)
        }, {
            $set: datas
        }, {
            upsert: false,
            multi: true
        });
    });
}

function insertQuestion(questions) {
    var insert = { 
        "type" : questions.type, 
        "content" : questions.content, 
        "correct" : questions.correct, 
        "ans" : questions.ans, 
        "multi" : questions.multi + "" == "true", 
        "picture" : [], 
        "feedback" : parseInt(questions.feedback),
        "created_date": new Date()
    };
    return mongoUtils.insert(globals.databaseCollection.Question, insert);
}

function getQuestionByIds (questions, type) {
    let queRedone = [];
    questions.forEach(question =>queRedone.push(new objectId(question.toString())));
    let query = {_id: {$nin: queRedone},type: type};
    logger.debug("getQuestionById=========>: " + JSON.stringify(queRedone));
    return mongoUtils.find(globals.databaseCollection.Question, query).then(datas => {
        //logger.debug("done query: " + datas.length);
        if(datas.length == 0) throw globals.knownErrors.noQuestionLeave;
        else {
            const numberLength = datas.length.toString().length;
            let randomNum = parseInt(utils.getRandomString(numberLength, true)) % datas.length;
            logger.debug("answer new");
            return datas[randomNum];
        }
    });
}

function getLevel(score){
    if (score > 100 && score < 2000){
        return globals.pkLevel[parseInt(score/100)];
    }else if(score >= 2000) {
        return globals.pkLevel[19];
    }else{
        return globals.pkLevel[0];
    }
}

function userScoreDone (handler) {
    if(handler.isend) return Promise.reject("race is end");
    let userInfo = [
        new objectId(handler.red._id),
        new objectId(handler.blue._id)
    ];
    handler.isend = true;
    logger.debug("race end");
    return mongoUtils.find(globals.databaseCollection.Users, {_id: {$in:userInfo}}).then(datas => {
        let updateDatas = [];
        datas.forEach(data => {
            let updateData = {find: {_id: data._id}};
            let pkData = data.pk || {};
            pkData.score = pkData.score || 0;
            pkData.level = pkData.level || globals.pkLevel[0];
            pkData.sum = pkData.sum || 0
            pkData.win = pkData.win || 0;
            logger.debug("============> _id: " + handler.red._id + "  data._id: " + data._id.toString() + " hangler disconnect: " + handler.red.disconnect);
            logger.debug("============> _id: " + handler.blue._id + "  data._id: " + data._id.toString() + " hangler disconnect: " + handler.blue.disconnect);
            if (handler.red._id == data._id.toString() && !handler.red.disconnect && handler.red.result == 'win') {
                pkData.score = pkData.score + 10;
                pkData.win = pkData.win + 1;
            }
            else if (handler.blue._id == data._id.toString() && !handler.blue.disconnect && handler.blue.result == 'win') {
                pkData.score = pkData.score + 10;
                pkData.win = pkData.win + 1;
            } 
            else pkData.score = pkData.score - 10;
            pkData.level = getLevel(pkData.score);
            pkData.sum = pkData.sum + 1;
            updateData.update = {pk: pkData};
            updateDatas.push(updateData);
        });
        return updateDatas
    }).then(updates => {
        let update = updates[0];
        return mongoUtils.update(globals.databaseCollection.Users, update.find, update.update).then(result => {
            return updates[1];
        });
    }).then(update => {
        return mongoUtils.update(globals.databaseCollection.Users, update.find, update.update);
    });
}

function refreshUserAndEndtime (pkid, users, endtime) {
    let updateDatas = {
        users: users,
        end: new Date()
    };
    return mongoUtils.update(globals.databaseCollection.Pks, {pkid: pkid}, updateDatas);
}

function pushPkQuestion(pkid, question) {
    let questions = {questions: question};
    return mongoUtils.pushUpdate(globals.databaseCollection.Pks, {pkid: pkid},questions);
}

function pushPkMessage(pkid, message) {
    let messages ={messages: message};
    return mongoUtils.pushUpdate(globals.databaseCollection.Pks, {pkid: pkid}, messages);
}

function getQuestionByPage(params) {
    let query = [
        {$sort: {created_date: -1}},
        {$skip: parseInt((params.page - 1) * params.pageSize)},
        {$limit: parseInt(params.pageSize) }
    ];
    return mongoUtils.aggregate(globals.databaseCollection.Question, query);
}

// show pk history
function getPkHistory (userid, queryDatas) {
    let query = [
        {$match: {"users._id": userid}},
        {$sort: {start: -1}}
    ];
    
    if(queryDatas.page) {
        queryDatas.page = parseInt(queryDatas.page);
        queryDatas.pageSize = parseInt(queryDatas.pageSize);
        query.push({$skip: (queryDatas.page - 1) * queryDatas.pageSize});
        query.push({$limit: queryDatas.pageSize});
    }
    logger.debug("query: " + JSON.stringify(query));
     
    return mongoUtils.aggregate(globals.databaseCollection.Pks, query);
}

function randomQuestion (data, handler) {
    let sumNum = data.feedback;
    let visit = {};
    let currentIndex = 0;
    var randomArr = new Array(sumNum);
    if (typeof(data.ans) == "string") data.ans = [data.ans];
    if (typeof(data.correct) == 'string') data.correct = data.correct.split(/\r\n/);
    for(let i = 0 ; i < data.ans.length ; i ++) {
        let step = Math.floor(Math.random() * 100) + 1;
        for (let j = 0 ; j < step ; j ++) {
            while(visit[currentIndex] == 1) {
                currentIndex ++;
                currentIndex = currentIndex % sumNum;
            }
        }
        randomArr[currentIndex] = data.ans[i];
        logger.debug("current index: " + currentIndex)
        visit[currentIndex] = 1;
    }

    const leaveSize = sumNum - data.ans.length;
    let correctArr = data.correct.slice(0);
    for(let i = 0 ; i < leaveSize ; i ++) {
        let randomNum = Math.floor(Math.random() * correctArr.length);
        let step = Math.floor(Math.random() * 100) + 1;
        for (let j = 0 ; j < step ; j ++ ) {
            while(visit[currentIndex] == 1) {
                currentIndex ++;
                currentIndex = currentIndex % sumNum;
            }
        }
        randomArr[currentIndex] = correctArr[randomNum];
        correctArr.splice(randomNum, 1);
        visit[currentIndex] = 1;
    }
    handler.setAnswer(data.ans);
    let outputArr = new Array(sumNum);
    for(let i = 0 ; i < outputArr.length ; i ++) {
        let randomNum = Math.floor(Math.random() * randomArr.length * 10) % randomArr.length ;
        outputArr[i] = randomArr[randomNum];
        randomArr.splice(randomNum, 1);
    }
    
    return outputArr;
}

function pushPkResult(userPkHandler, type) {
    let message;
    switch(type) {
        case "red": {
            message = {
                user: userPkHandler.red,
                win: "1",
                message: pkCode.pkManager,
                type: globals.message.pk
            };
        }; break;
        case "blue": {
            message = {
                user: userPkHandler.blue,
                win: "1",
                message: pkCode.pkManager,
                type: globals.message.pk
            };
        };break;
        case "peer": {
            message = {
                win: "0",
                message: pkCode.pkManager,
                type: globals.message.pk
            }
        }; break;
    }
    if (type != 'peer') userPkHandler.stop();
    pushHandler.sendNotification(userPkHandler.red._id, message);
    pushHandler.sendNotification(userPkHandler.blue._id, message);

    return type == "peer";
}

function getQuestionById (id) {
    logger.debug("_id:  " + id);
    return mongoUtils.findOne(globals.databaseCollection.Question, {
        _id: new objectId(id)
    });
}

function getMainMessage(userid) {
    let response = {};
    return mongoUtils.findOne(globals.databaseCollection.Users, {_id: new objectId(userid)})
    .then(datas => {
        const user = datas.pk;
        if(user) {
            response = user;
            return response.score;
        }
        else {
            response = {
                win: 0,
                sum: 0,
                score: 0,
                level: '幼儿园'
            };
            return -1;
        }
    })
    .then(score => {
        if(score == -1) {
            response.rank = '-';
            return response;
        }
        else {
            const query = [
                {$match: {'pk.score': {$ne: null, $gt: score}}},
                {$group: {_id: null, count: {$sum: 1}}}
            ];
            return mongoUtils.aggregate(globals.databaseCollection.Users, query).then(re=>{
                if(re.length == 0) response.rank = 1;
                else response.rank = re[0].count + 1;
                return response;
            });
        }
    });
}

function deleteQuestionById(_id) {
    return mongoUtils.remove(globals.databaseCollection.Questions, {_id: objectId(_id)});
}

function getRankListByPage(page, pageSize){
    let query = [
        {$match: {"pk.score": {$ne: null}}},
        {$sort: {'pk.score': -1}},
        {$skip: (page - 1)*pageSize},
        {$limit: pageSize},
        {$project: {"score": "$pk.score", "pksum": "$pk.sum", "win": "$pk.win", "_id": "$_id", "user_id": "id", "displayName": "$displayName", "avatar": "$avatar"}}
    ];
    return mongoUtils.aggregate(globals.databaseCollection.Users, query);
}

exports.getRankListByPage = getRankListByPage;
exports.getMainMessage = getMainMessage;
exports.pushPkResult = pushPkResult;
exports.insertPkManager = insertPkManager;
exports.insertQuestion = insertQuestion;
exports.getQuestionByIds = getQuestionByIds;
exports.pkAlert = pkAlert;
exports.pkCode = pkCode;
exports.getPkHistory = getPkHistory;
exports.randomQuestion = randomQuestion;
exports.pkErrorCode = pkErrorCode;
exports.getQuestionByPage = getQuestionByPage;
exports.refreshUserAndEndtime = refreshUserAndEndtime;
exports.pushPkMessage = pushPkMessage;
exports.pushPkQuestion = pushPkQuestion;
exports.getQuestionById = getQuestionById;
exports.userScoreDone = userScoreDone;
exports.deleteQuestionById = deleteQuestionById;
exports.pkroom = pkroom;
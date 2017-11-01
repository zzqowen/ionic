const uuid = require("node-uuid");
const pkObjectManager = {};
const defaultQuestionNumber = process.env.DEFAULT_QUESNUM || 7;
// 1分钟内未接到消息算输
const defaultTimeout = process.env.defaultTimeout || 10 * 1000;
// 断线算失败的时间
const defaultGracePeriod = process.env.DEFAULT_DISCONNECT || 20 * 1000;
const helper = require("../game/questions");
const pushHandler = require("../pushHandlers");
const dateUtils = require("../common/dateUtils").dateUtils;
const globals = require("../globals");
const utils = require("../utils");
const questionProxy = require("./questions");
const logger = utils.logger;
let candidates = {};
let players = {};
let isLock = false;

function pk() {
    let count = defaultQuestionNumber;
    let red;
    let blue;
    let round = 1;
    let que = defaultQuestionNumber;
    let questionLock = false;
    let currentQuestion;
    let sum = 0;
    let timeout = defaultTimeout;
}



pk.prototype.init = function (redid, blueid, type, questionNumber, time) {
    let pkid = uuid.v4();
    let redLevel;
    let blueLevel;
    let redScore = 0;
    let blueScore = 0;
    this.count = questionNumber || defaultQuestionNumber;
    this.questionType = type;
    this.timeout = time || defaultTimeout;
    //que => total
    this.que = this.count;
    this.pkid = pkid;
    this.sum = 0;
    players[redid] = pkid;
    players[blueid] = pkid;
    this.questionsUsed = new Array();
    let self = this;
    pkObjectManager[pkid] = this;
    logger.debug(" =====> current pkid: " + pkid);
    let reduser;
    return utils.findUserFromId(redid).then(rduser => {
        reduser = rduser;
        if (reduser.pk){ redLevel = reduser.pk.level; redScore = reduser.pk.score;}
        else { redLevel = globals.pkLevel[0]}
        return utils.findUserFromId(blueid);
    }).then(blueuser => {
        if (blueuser.pk){ blueLevel = blueuser.pk.level; blueScore = blueuser.pk.score;}
        else { blueLevel = globals.pkLevel[0]}
        self.red = { _id: reduser._id.toString(), id: reduser.id, displayName: reduser.displayName, pkScore: redScore, score: 0, answered: false, avatar: reduser.avatar, start: false, pkLevel: redLevel, province: reduser.province, city: reduser.city};
        self.blue = { _id: blueuser._id.toString(), id: blueuser.id, displayName: blueuser.displayName, pkScore: blueScore, score: 0, answered: false, avatar: blueuser.avatar, start: false, pkLevel: blueLevel, province: blueuser.province, city: blueuser.city};
        const insertData = {
            pkid: pkid,
            start: new Date().toJSON(),
            end: null,
            users: [self.red, self.blue],
            questions: [],
            messages: []
        };
        helper.insertPkManager(insertData);
        return pkid;
    });
};

pk.prototype.setAnswer = function (right) {
    this.currentAnswer = right;
}

// judge ans is true
pk.prototype.checkAnswer = function (ans, userid, time, expendTime) {
    if (this.red._id == userid && this.red.answered) return false;
    else if (this.blue._id == userid && this.blue.answered) return false;
    let result = true;
    let handler = this;
    if (ans.length == 0) result = false;
    else {
        ans.forEach(an => {
            let isRight = false;
            handler.currentAnswer.forEach(right => {
                if (an == right) isRight = true;
            });
            result = result && isRight;
        });
    }

    // construct getScore()
    let pushTime = this.red._id == userid ? this.red.quetime : this.blue.quetime;
    let leaveTime = this.red._id == userid ? this.red.leaveTime: this.blue.leaveTime;
    let spendTime = dateUtils.secondDiff(time, pushTime);
    let score = 2*(leaveTime - expendTime);
    score = (score > 0 && score) || 0;
    
    let sendMessage = {
        message: helper.pkCode.pkJudge,
        type: globals.message.pk,
        userid: userid,
        flag: result ? "success" : "failure",
        score: score
    };
    logger.debug("sendMessage: " + JSON.stringify(sendMessage) + " \n currentAnser " + handler.currentAnswer)
    // { from, question_id, type, user_target, timestamp, content?, photos[]? } 
    helper.pushPkMessage(handler.pkid, {
        from: 'system',
        question_id: handler.questionsUsed[handler.sum],
        type: handler.questionType,
        user_target: ans,
        ////
        user: handler.red,
        spendTime: spendTime,
        date: new Date()
    });
    pushHandler.sendNotification(handler.red._id, sendMessage);
    pushHandler.sendNotification(handler.blue._id, sendMessage);
    if (this.red._id == userid) {
        this.red.answered = true
        if (result) this.red.score = this.red.score + score;
    }
    else if (this.blue._id == userid) {
        this.blue.answered = true;
        if (result) this.blue.score = this.blue.score + score;
    }
    let users = [
        this.red,
        this.blue
    ];

    helper.refreshUserAndEndtime(this.pkid, users);
    return true;
}

// when time out, push next question
pk.prototype.setTimeout = function (time, isDis) {
    let handler = this;
    logger.debug("ready to set timeout:" + handler.pkid)
    time = time || (handler.timeout + defaultGracePeriod);
    logger.debug("^^^^^^^^^^^^^time: " + time);

    this.timeManager = setTimeout(function () {
        logger.debug("time out start");
        if (isDis) {
            if (handler.red.disconnect && !handler.blue.disconnect) {
                helper.pushPkResult(handler, "blue");
                handler.blue.result = 'win';
            }
            else if (!handler.red.disconnect && handler.blue.disconnect) {
                helper.pushPkResult(handler, "red");
                handler.blue.result = 'win';
            }
        }
        else  {
            if (!handler.red.answered && handler.blue.answered) {
                helper.pushPkResult(handler, "blue");
                handler.blue.result = 'win';
            }
            else if (handler.red.answered && !handler.blue.answered) {
                helper.pushPkResult(handler, "red");
                handler.red.result = 'win';
            }
        }
        handler.stop();
        
        helper.refreshUserAndEndtime(handler.pkid, [handler.red, handler.blue], new Date());
        
    }, time);
}

pk.prototype.clearTimeout = function () {
    logger.debug("clean time out");
    if (this.timeManager) clearTimeout(this.timeManager);
}

// Only to push question
pk.prototype.pushQuestion = function (userid) {
    let handler = this;
    logger.info("userid: " + userid + " islock: " + handler.questionLock + " sum: " + handler.sum);

    if (!handler.currentQuestion) {
        return helper.getQuestionByIds(handler.questionsUsed, handler.questionType).then(datas => {
            if (handler.currentQuestion) {
                pushHandler.sendNotification(userid, handler.currentQuestion);
                return { questionPushed: true, notify: handler.currentQuestion };
            }
            let startTime = new Date();
            
            handler.questionPushTime = startTime;
            //set red basic data
            handler.red.quetime = startTime;
            handler.red.leaveTime = Math.floor(handler.timeout / 1000);
            handler.red.answered = false;
            //set blue basic data
            handler.blue.quetime = startTime;
            handler.blue.leaveTime  = Math.floor(handler.timeout / 1000);
            handler.blue.answered = false;
            // set globals question data
            logger.debug("question userd : " + handler.questionsUsed);
            handler.questionsUsed = handler.questionsUsed || [];
            handler.questionsUsed.push(datas._id);
            handler.count--;
            handler.currentAnswer = datas.ans;

            const notify = {
                _id: datas._id,
                choices: helper.randomQuestion(datas, handler),
                picture: datas.picture,
                question: datas.content,
                message: helper.pkCode.pkPushQuestion,
                type: globals.message.pk,
                multi: datas.multi ? "1" : "0",
                index: handler.questionsUsed.length
            };
            handler.currentQuestion = notify;
            
            logger.debug("============> datas: " + datas);
            if (handler.questionsUsed.length == 1) pushHandler.sendNotification(userid, notify);
            else {
                pushHandler.sendNotification(handler.red._id, notify);
                pushHandler.sendNotification(handler.blue._id, notify);
            }

            helper.pushPkQuestion(handler.pkid, {
                _id: datas._id,
                ans: datas.ans,
                content: datas.content,
                choices: notify.choices,
                pictures: datas.picture
            });
            
            return {
                questionPushed: false,
                data: datas,
                notify: notify
            };
        });
    }
    else {
        handler.questionLock = false;
        logger.debug("=======>question unlock: " + handler.questionLock);
        pushHandler.sendNotification(userid, handler.currentQuestion);

        return new Promise((resolve, reject) => resolve({ questionPushed: true, notify: handler.currentQuestion }));
    }
}

// when user reconnect
pk.prototype.reconnect = function(userId) {
    let pkInstance = this;
    let sendMessage = {message: helper.pkCode.pkReconnect, type: globals.message.pk};

    if (this.red._id == userId) {
        this.red.disconnect =false;
        pkInstance.red.quetime = new Date();
        sendMessage.player = this.red.displayName;
        sendMessage.leaveTime = this.red.leaveTime;
    }
    else if (this.blue._id == userId) {
        this.blue.disconnect = false;
        pkInstance.blue.quetime = new Date();
        sendMessage.player = this.blue.displayName;
        sendMessage.leaveTime = this.blue.leaveTime;
    }
    if (!this.blue.disconnect && !this.red.disconnect) {
        pkInstance.clearTimeout();
        sendMessage.connectInfo = "0";
        pkInstance.setTimeout((sendMessage.leaveTime + defaultGracePeriod) * 1000);
    }
    else sendMessage.connectInfo = "1";

    pushHandler.sendNotification(this.blue._id, sendMessage);
    pushHandler.sendNotification(this.red._id, sendMessage);
}

// when a user disconnect
pk.prototype.disconnect = function (userId) {
    let sendMessage = {message: helper.pkCode.pkDisconnect, type: globals.message.pk};
    const disconnectTime = new Date();
    let pkInstance = this;
    const isRedWin = this.blue._id == userId;
    const isBlueWin = this.red._id == userId;
    if (isBlueWin) {
        sendMessage.player = pkInstance.red.displayName;
        pkInstance.red.disconnect = true;
        pushHandler.sendNotification(pkInstance.blue._id, sendMessage);
    }
    else {
        sendMessage.player = pkInstance.blue.displayName;
        pkInstance.blue.disconnect = true; 
        pushHandler.sendNotification(pkInstance.red._id, sendMessage);
    }
    this.clearTimeout();
    let isTie;
    if(isRedWin) pkInstance.red.result = 'win';
    else pkInstance.blue.result = 'win';
    questionProxy.refreshUserAndEndtime(this.pkid, [pkInstance.red, pkInstance.blue], new Date());

    if (isRedWin) isTie = questionProxy.pushPkResult(pkInstance, "red");
    else isTie = questionProxy.pushPkResult(pkInstance, "blue");
}

function connectPk(userId, isReconnect) {
    let pkid = isUserPlaying(userId);
    let pkInstance = getPkObject(pkid);
    if (pkInstance) {
        if (!isReconnect) pkInstance.disconnect(userId);
        else pkInstance.reconnect(userId);
    }
}

pk.prototype.getUsersObject = function () {
    return {
        red: this.red,
        blue: this.blue
    };
}

pk.prototype.stop = function () {
    return helper.userScoreDone(this).then(db => {
        delete players[this.red._id];
        delete players[this.blue._id];
        delete pkObjectManager[this.pkid];
    });
}

pk.prototype.initNextRound = function (nextTurn) {
    this.sum++;
    this.red.answered = false;
    this.currentQuestion = null;
    this.blue.answered = false;
    if (nextTurn) {
        this.round ++;
        this.count = this.que;
    }
}

function getPkObject(pkid) {
    return pkObjectManager[pkid];
}

function listPkObjectId() {
    let pkid = [];
    for (let all in pkObjectManager) {
        pkid.push(all);
    }
    return pkid;
}

function isUserPlaying(userid) {
    return players[userid];
}

exports.isLock = isLock;
exports.getPkObject = getPkObject;
exports.pk = pk;
exports.candidates = candidates;
exports.isUserPlaying = isUserPlaying;
exports.listPkObjectId = listPkObjectId;
exports.connectPk = connectPk;
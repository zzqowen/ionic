const express = require("express");
const globals = require("../globals");
const valid = require("../common/validation").valid;
const utils = require("../utils");
const fs = require("fs");
const url = require("url");
const pkInstance = require("../game/pk");
const pk = pkInstance.pk;
const questionProxy = require("../game/questions");
const logger = utils.logger;
const pushHandler = require("../pushHandlers");

function isGameOver(pkInstance, userid, response) {
    if (!pkInstance) {
        pushPkErrorMessage(userid, questionProxy.pkErrorCode.raceIsEnd, globals.knownErrors.raceIsFinished);
        return false;
    }
    return true;
}

function giveUpGame(req, res){
    let pkid = req.body.pkid;
    let userid = req.token._id;
    let userpkInstance = pkInstance.getPkObject(pkid);
    questionProxy.pkroom.beinvite = {};
    questionProxy.pkroom.invite = {};
    const isBlueWin = userpkInstance.red._id == userid;
    const isRedWin = userpkInstance.blue._id == userid;
    let isTie;
    if (isRedWin) isTie = questionProxy.pushPkResult(userpkInstance, "red");
    else isTie = questionProxy.pushPkResult(userpkInstance, "blue");

    if(isRedWin) userpkInstance.red.result = 'win';
    else userpkInstance.blue.result = 'win';
    questionProxy.refreshUserAndEndtime(this.pkid, [userpkInstance.red, userpkInstance.blue], new Date());
    userpkInstance.stop();
    return utils.respondWithOk(null, null, res);
}

function gameManager(request, response) {
    let currentTime = new Date();
    let pkid = request.body.pkid;
    let userid = request.token._id;
    // arr
    let answer = request.body.answer;
    let time = request.body.time;
    let userpkInstance = pkInstance.getPkObject(pkid);

    logger.debug("pkid: " + pkid + " userid: " + userid);

    if (!isGameOver(userpkInstance, userid, response)) return utils.respondWithOk(null, null, response);
    if (answer) userpkInstance.checkAnswer(answer, userid, currentTime, time);

    let enterNextRound = false;
    let allAnswered = userpkInstance.red.answered && userpkInstance.blue.answered;

    if (allAnswered && userpkInstance.count == 0) {
        questionProxy.pkroom.beinvite = {};
        questionProxy.pkroom.invite = {};
        const isRedWin = userpkInstance.red.score > userpkInstance.blue.score;
        const isBlueWin = userpkInstance.red.score < userpkInstance.blue.score;
        // judge is need to enter the next turn
        let isTie;
        if (!isRedWin && !isBlueWin) isTie = questionProxy.pushPkResult(userpkInstance, "peer");
        else if (isRedWin) isTie = questionProxy.pushPkResult(userpkInstance, "red");
        else if (isBlueWin) isTie = questionProxy.pushPkResult(userpkInstance, "blue");
        if (!isTie) {
            if(isRedWin) userpkInstance.red.result = 'win';
            else userpkInstance.blue.result = 'win';
            questionProxy.refreshUserAndEndtime(this.pkid, [userpkInstance.red, userpkInstance.blue], new Date());
            userpkInstance.stop();
            return utils.respondWithOk(null, null, response);
        } else {
            userpkInstance.red.score = 0;
            userpkInstance.blue.score = 0;
        }
        enterNextRound = true;
    }

    if (allAnswered) userpkInstance.initNextRound(enterNextRound);

    // push the next question
    if (!answer || allAnswered) {
        userpkInstance.pushQuestion(userid).then(data => {
            logger.debug("data: " + data);
            if (data.questionPushed) return;
            userpkInstance.clearTimeout();
            userpkInstance.setTimeout();
        })
        .catch(err => {
            // pk出现异常怎么处理？
            let messageObj = {};
            userpkInstance.questionLock = false;
            logger.error("errorMsg: " + err);
            messageObj.message = questionProxy.pkCode.pkError;
            messageObj.type = globals.message.pk;
            if (typeof err == "string") messageObj.err = err;
            else messageObj.err = globals.knownErrors.unknown;
            pushHandler.sendNotification(userpkInstance.red._id, messageObj);
            pushHandler.sendNotification(userpkInstance.blue._id, messageObj);
        });
    }

    utils.respondWithOk(null, null, response);
}

function pushPkErrorMessage(userid, errorCode, message) {
    var messageObj = {
        errorCode: errorCode,
        message: questionProxy.pkCode.pkError,
        type: globals.message.pk,
        err: message
    };
    pushHandler.sendNotification(userid, messageObj);
}

function checkGameHasStarted(request, response) {
    const _id = request.token._id;
    const currentPkId = pkInstance.isUserPlaying(_id);

    if (currentPkId) {
        const currentPkInstance = pkInstance.getPkObject(currentPkId);
        pushHandler.sendNotification(_id, {
            message: questionProxy.pkCode.pkBack,
            type: globals.message.pk,
            data: currentPkInstance.currentQuestion
        });
        return utils.respondWithOk(handler.currentQuestion, null, response);;
    }

    utils.respondWithError(null, "nomatch", null, response);
}

// just done match people
function matchPlayer(request, response) {
    const _id = request.token._id;
    const type = request.body.type;
    const count = request.body.question;
    const timeout = request.body.timeout;

    utils.findUserFromId(_id).then(user => {
        pkInstance.candidates = pkInstance.candidates || {};
        pkInstance.candidates[_id] = {
            _id: user._id,
            id: user.id,
            displayName: user.displayName,
            userName: user.userName,
            date: new Date().getTime(),
            type: type
        };
        // if cancel match other
        let canMapPeople = [];
        for (let map in pkInstance.candidates) {
            if (map != _id && pkInstance.candidates[map].type == type) canMapPeople.push(map);
        }

        if (canMapPeople.length > 0) {
            const index = parseInt(Math.random() * canMapPeople.length);
            let blueId = canMapPeople[index];
            let redId = _id;
            let userpkInstance = new pk();
            userpkInstance.init(redId, blueId, type, count, timeout).then(pkid => {
                const alertmanager = {
                    message: questionProxy.pkCode.mapSuccess,
                    type: globals.message.pk,
                    alert: questionProxy.pkAlert.mapSuccess,
                    pkid: pkid,
                    red: userpkInstance.getUsersObject().red,
                    blue: userpkInstance.getUsersObject().blue,
                    pkType: type
                };

                pushHandler.sendNotification(redId, alertmanager);
                pushHandler.sendNotification(blueId, alertmanager);
                delete pkInstance.candidates[redId];
                delete pkInstance.candidates[blueId];
            }).catch(err => logger.error("error: " + err));
        };
        utils.respondWithOk(null, null, response);
    });
}

function questionValid(body) {
    if (body.type && body.content && body.correct && body.ans && typeof body.multi != "undefined" && body.feedback) return globals.ok;
    else return globals.knownErrors.pleaseInputRequired;
}

function addQuestion(request, response) {
    const body = request.body;
    // title photo content ans
    const checkRequire = questionValid(body);

    if (checkRequire == globals.ok) {
        logger.debug("inhere");
        logger.debug("body: " + JSON.stringify(body));
        questionProxy.insertQuestion(body)
            .then(result => utils.respondWithOk(null, null, response))
            .catch(err => utils.errorResponse(err, response));
    }
    else utils.respondWithError(null, checkRequire, null, response);
}

function rebuildInsertQuestionData(params) {
    let datas = {
        "type": params.type,
        "content": params.content,
        "correct": params.correct,
        "ans": params.ans,
        "multi": false,
        "picture": [],
        "feedback": params.feedback
    }
}
// utils共享
function validateAuthToken(request, response, next) {
    utils.validateToken(request.query.cookie)
        .then(function (token) {
            logger.debug('user authenticated');
            request.token = token;
            next();
        })
        .catch(function (err) {
            logger.debug(`auth failed: ${JSON.stringify(err)}`);
            return response.status(401).json({
                msg: globals.knownErrors.cookie
            });
        });
}

function cancelMatch(request, response) {
    let _id = request.token._id;
    delete pkInstance.candidates[_id];
    utils.respondWithOk(null, null, response);
}

function pkHistroy(request, response) {
    let body = request.params || {};
    const userid = request.token._id;
    questionProxy.getPkHistory(userid, body).then(datas => utils.respondWithOk({
        datas: datas
    }, null, response));
}

function getQuestion(request, response) {
    let body = request.params || {};
    logger.debug("body: " + JSON.stringify(body));
    questionProxy.getQuestionByPage(body).then(datas => {
        utils.respondWithOk(datas, request, response);
    }).catch(err => utils.errorResponse(err, response))
}

function sendToListQuestion(request, response) {
    const urlDir = request.params.page;
    const pathname = "/frontend/view/question/" + urlDir;
    fs.readFile(pathname.substr(1), (err, data) => {
        if (err) {
            console.log(err);
            response.writeHead(404, { 'Content-Type': 'text/html' });
        } else {
            response.writeHead(200, { 'Content-Type': 'text/html' });
            response.write(data.toString());
        }
        response.end();
    });
}

function showPkPerson (request, response) {
    let userid = request.token._id;
    questionProxy.getMainMessage(userid)
        .then(data => {
            utils.respondWithOk(data, request, response);
        }).catch(err => utils.errorResponse(err, response));
}

function showQuestionDetail(request, response) {
    let id = request.params._id;
    questionProxy.getQuestionById(id).then(datas => {
        logger.debug("detail datas: " + JSON.stringify(datas));
        utils.respondWithOk(datas, null, response);
    }).catch(err => utils.errorResponse(err, response));
}

function deleteQuestion(request, response) {
    let _id = request.body._id;
    questionProxy.deleteQuestionById(_id).then(result => {
        utils.respondWithOk(null, request, response);
    }).catch(err => utils.errorResponse(err, response));
}

function invite (req, res){
    let currentId = req.token._id;
    let type = req.body.type;
    let inviteId = req.body._id;
    let count = req.body.count;
    let timeout = req.body.timeout;
    let currentUser;

    if (currentId == inviteId) return utils.respondWithError(null, globals.knownErrors.canNotInviteSelf, null, res);
    logger.debug("invite==>: currentId : "+ currentId + " type : "+ type +" inviteId : "+inviteId+ " count : "+count + " timeout : "+timeout);
    if (questionProxy.pkroom.beinvite[inviteId] || questionProxy.pkroom.invite[inviteId]) return utils.respondWithError(null, questionProxy.pkAlert.pkInvited, null, res);
    if (questionProxy.pkroom.beinvite[currentId] || questionProxy.pkroom.invite[currentId]) return utils.respondWithError(null, questionProxy.pkAlert.pkInvited, null, res);
    utils.findUserFromId(currentId).then( user => {
        currentUser = user
        return utils.findUserFromId(inviteId);
    }).then( user => {
        if (!user) throw globals.knownErrors.userNotFound;

        questionProxy.pkroom.invite[currentId] = {
            people: inviteId,
            type: type,
            count: count,
            timeout: timeout
        };
        questionProxy.pkroom.beinvite[inviteId] = {
            people: currentId,
            type: type,
            count: count,
            timeout: timeout
        };
        pushHandler.sendNotification(inviteId, {
            message: questionProxy.pkCode.pkInvited,
            type: globals.message.pk,
            invite: {
                avatar: currentUser.avatar,
                _id: currentUser._id,
                userid: currentUser.id,
                displayName: currentUser.displayName
            }
        });
        // set inviate timeout
        questionProxy.pkroom.inviteTimeManager = setTimeout(function() {
            delete questionProxy.pkroom.invite[currentId];
            delete questionProxy.pkroom.beinvite[inviteId];
            pushHandler.sendNotification(currentId, {message: questionProxy.pkCode.pkCancelInvited, type: globals.message.pk, timeoutStatus: true});
            pushHandler.sendNotification(inviteId, {message: questionProxy.pkCode.pkCancelInvited, type: globals.message.pk, timeoutStatus: true});
        }, 60000);
        return utils.respondWithOk({
            avatar: user.avatar,
            _id: user._id,
            userid: user.id,
            displayName: user.displayName
        }, null, res)
    })
}

function accept(req, res){
    let _id = req.token._id;
    const peopleConst = questionProxy.pkroom.beinvite[_id];
    let blueId = peopleConst.people;
    let type = peopleConst.type;
    let count = peopleConst.count;
    let timeout = peopleConst.timeout;
    clearTimeout(questionProxy.pkroom.inviteTimeManager);
    let userpkInstance = new pk();
    return userpkInstance.init(_id, blueId, type, count, timeout)
    .then( pkid => {
        const alertmanager = {
            message: questionProxy.pkCode.mapSuccess,
            type: globals.message.pk,
            alert: questionProxy.pkAlert.mapSuccess,
            pkid: pkid,
            red: userpkInstance.getUsersObject().red,
            blue: userpkInstance.getUsersObject().blue,
            pkType: type
        };
        pushHandler.sendNotification(_id, alertmanager);
        pushHandler.sendNotification(blueId, alertmanager);
        delete pkInstance.candidates[_id];
        delete pkInstance.candidates[blueId];
        
        utils.respondWithOk(null, null, res);
    })
    .catch( err => {
        logger.error("error: "+err);
        utils.respondWithError(null, err, req, res);
    });
}

function pkCancelInvited(req, res){
    let _id = req.token._id;
    logger.debug("_id : "+ _id);
    let currentId;
    let beinvite;
    if (questionProxy.pkroom.beinvite[_id]){
        currentId = questionProxy.pkroom.beinvite[_id].people
    }else{
        currentId = _id
    }
    if (questionProxy.pkroom.invite[currentId]){
        beinvite = questionProxy.pkroom.invite[currentId].people;
    }
    if (questionProxy.pkroom.invite[currentId] && questionProxy.pkroom.beinvite[beinvite]){
        delete questionProxy.pkroom.invite[currentId];
        delete questionProxy.pkroom.beinvite[beinvite];
    }
    clearTimeout(questionProxy.pkroom.inviteTimeManager);
    if (_id == currentId) pushHandler.sendNotification(beinvite, {message: questionProxy.pkCode.pkCancelInvited, type: globals.message.pk});
    else pushHandler.sendNotification(currentId, {message: questionProxy.pkCode.pkCancelInvited, type: globals.message.pk});

    utils.respondWithOk(null, null, res);
}

function getRankListByPage(req ,res){
    let page = req.params.page;
    let pageSize = req.params.pageSize;

    questionProxy.getRankListByPage(parseInt(page), parseInt(pageSize))
    .then( datas => utils.respondWithOk(datas, null, res))
    .catch( err => utils.respondWithError(err, res));
}

exports.questionOpenApi = new express.Router()
    .get("/list/:page/:pageSize", getQuestion)
    .post("/delete", deleteQuestion)
    .post("/add", addQuestion)
    .get("/view/:page", sendToListQuestion)
    .get("/detail/:_id", showQuestionDetail);

exports.pkApi = new express.Router()
    .use(validateAuthToken)
    .get("/rank/:page/:pageSize", getRankListByPage)
    .post("/match", matchPlayer)
    .post("/submit", gameManager)
    .get("/person", showPkPerson)
    .post("/cancel/match", cancelMatch)
    .post("/giveUp", giveUpGame)
    .get("/history", pkHistroy)
    .get("/history/:page/:pageSize", pkHistroy)
    .post("/isplaying", checkGameHasStarted)
    .post("/invite/friend", invite)
    .get("/invite/ensure", accept)
    .get("/invite/cancel", pkCancelInvited);
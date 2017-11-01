var globals = require("../globals");
var utils = require("../utils");
var smsStatic = require("./smsCommon").static;
var dateutils = require("../common/dateUtils").dateUtils;
var registCommon = require('./registCommon');

const logger = utils.logger;

function generatePassword(user, response) {
    checkIsOk(user,response,"recover");
}

function registerUser(user,response) {
    checkIsOk(user,response,"regist");
}

function checkValidNum(mobileHandler,valid,response) {
    if (mobileHandler.validNum == valid) return true;
    utils.respondWithError(null, globals.knownErrors.validNumError, null, response);
    return false;
}

function checkIsOk(user,response,type) {
    var mobile = user.userName;
    user.mobile = user.userName ;
    var mobileHandler = smsStatic.validNum[mobile];

    if (isMobileCached(mobileHandler,response) && !isTimeout(mobileHandler,response) && checkValidNum(mobileHandler,user.valid,response)){
        switch(type) {
            case "regist": registCommon.registHelper.registUser(user, response);break;
            case "recover": registCommon.registHelper.recoverPassword(user, response);break;
        }
    }
}

function isMobileCached(mobileHandler, response) {
    logger.info("mobileHanderl: " + mobileHandler);
    if (mobileHandler) {
        return true;
    }
    else {
        utils.respondWithError(null,globals.knownErrors.validExceedError,null,response);
        return false;
    }
}

function isTimeout(mobileHandler,response) {
    var time = dateutils.minuteDiff(new Date(), mobileHandler.last_updated_date);
    logger.info("isTimeout: "+ time);
    if (time >= 5) {
        utils.respondWithError(null,globals.knownErrors.validExceedError,null,response);
        return true;
    }
    else {
        return false;
    }
}

exports.registerUser = registerUser;
exports.generatePassword = generatePassword;
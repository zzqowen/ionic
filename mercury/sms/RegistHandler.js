var regist = require("./Regist");
var registCommon = require("./registCommon");
var express = require("express");
var utils = require("../utils");
var logger = utils.logger;
var smsmethod = require('./smsSend').smsmethod;
var sms = new smsmethod();
var globals = require("../globals");
var comon = require("./smsCommon");
var dateUtils = require("../common/dateUtils").dateUtils;

var registerPhoneNew = function (request, response) {
    var user = request.body;
    user.password = '123456';
    var validRequired = user.userName && user.password && user.valid;
    logger.debug("boolean: " + validRequired + "    user: " + JSON.stringify(user));
    if (validRequired) {
        logger.info("input");
        regist.registerUser(user, response);
    }
    else {
        utils.respondWithError(null, globals.knownErrors.pleaseInputRequired, null, response);
    }
};

var registerPhone = function (request, response) {
    var user = request.body;
    var validRequired = user.userName && user.password && user.valid;
    logger.debug("boolean: " + validRequired + "    user: " + JSON.stringify(user));
    if (validRequired) {
        logger.info("input");
        regist.registerUser(user, response);
    }
    else {
        utils.respondWithError(null, globals.knownErrors.pleaseInputRequired, null, response);
    }
};



var sendMessage = function (request, response) {
    var params = request.body;
    logger.info("message send: " + JSON.stringify(params));
    var mobile = params.mobile;
    var type = params.type;
    logger.info("mobile: " + mobile + " type:" + type)
    if (mobile && type) {
        switch (type) {
            case "register":
                sms.register(mobile, response);
                break;
            case "recover":
                sms.recover(mobile, response);
                break;
            default:
                utils.respondWithError(null, "没有该种类型", null, response);
        }
    }
    else {
        logger.info("regist params loss!");
        utils.respondWithError(null, globals.knownErrors.paramsLoss, null, response);
    }
};

var recoverPassword = function (request, response) {
    var user = request.body;
    user.mobile = user.userName;
    var validRequired = user.code && user.password;
    
    if (!validRequired) utils.respondWithError(null, globals.knownErrors.pleaseInputRequired, null, response);
    else registCommon.registHelper.recoverPassword(user, response);
};

var validateCode = function (request, response) {
    logger.info("code: " + request.body.code + " valid:" + request.body.valid);
    var code = request.body.code;
    var valid = request.body.valid;
    if (!code || !valid) return utils.respondWithError(null, globals.knownErrors.pleaseInputRequired, request, response);
    var validHandler = comon.static.recover[code];
    if (!validHandler || dateUtils.minuteDiff(new Date(), validHandler.last_updated_date) > 5) 
        return utils.respondWithError(null, globals.knownErrors.validExceedError, request,response);
    if (validHandler.validNum != valid) 
        return utils.respondWithError(null, globals.knownErrors.validNumError, request, response);
    comon.static.recover[code].pass = true;
    comon.static.last_updated_date = new Date();
    delete comon.static.recover[code].validNum;
    utils.respondWithOk(null, request, response);
}

function setNewPassword(req, res){
    let code = req.body.code;
    let valid = req.body.valid;
    let user = req.body;
    user.mobile = user.userName;
    var validRequired = user.code && user.password;
    
    if (!code || !valid) return utils.respondWithError(null, globals.knownErrors.pleaseInputRequired, req, res);
    let validHandler = comon.static.recover[code];
    if (!validHandler || dateUtils.minuteDiff(new Date(), validHandler.last_updated_date) > 5)
        return utils.respondWithError(null, globals.knownErrors.validExceedError, req, res);
    if (validHandler.validNum != valid)
        return utils.respondWithError(null, globals.knownErrors.validNumError, req, res);
    comon.static.recover[code].pass = true;
    comon.static.last_updated_date = new Date();
    delete comon.static.recover[code].validNum;

    if (!validRequired) utils.respondWithError(null, globals.knownErrors.pleaseInputRequired, null, res);
    else registCommon.registHelper.recoverPassword(user, res)
}

exports.api = new express.Router()
    .post("/registerPhone", registerPhone) // registerPhone
    .post("/registerPhoneNew", registerPhoneNew) // registerPhone
    .post("/recoverPassword", recoverPassword) // recoverPassword : refer to changeUserInfo
    .post("/recoverValid", validateCode) 
    .post("/requestSms", sendMessage)// requestSms body{mobile, purpose}
    .post("/setNewPassword", setNewPassword)
    ;

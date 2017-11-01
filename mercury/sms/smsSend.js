const common = require("./smsCommon.js");
const smscommon = common.smscommon;
const utils = require('./../utils');
const logger = utils.logger;
const globals = require("../globals");
const valid = require("../common/validation").valid;
const uuid = require("node-uuid");

/**
 * 短信发送方法
 * @constructor
 */
function SmsCode() {
    var thx = {
        //发送短信
        sendMessage: function (params) {
            return new Promise(function (resolve, reject) {
                var mobile = params.mobile;
                var type = params.type;
                var TopClient = require('./topClient.js').TopClient;
                var client = new TopClient(common.appkey);
                // 6位验证码
                var validNum = utils.getRandomString(6, true);
                logger.info("userName: " + params.mobile + " validNum: " + validNum);
                var param = {};
                // 不同方式传送的报文不同
                switch (type) {
                    case common.source.register:
                        param = common.buildSms.register(validNum, "答尔文", mobile);
                        break;
                    case common.source.recover:
                        param = common.buildSms.recover(validNum, "答尔文", mobile);
                        break;
                }
                var str = "";
                logger.debug("type: " + type + ",sendMessageParams: " + str);

                client.execute('alibaba.aliqin.fc.sms.num.send', param, function (error, response) {
                    logger.debug("error: " + error + ", response: " + response);
                    if (!error) {
                        var code = uuid.v4();
                        if (type == common.source.register) {
                            common.static.validNum[mobile] = {
                                validNum: validNum,
                                last_updated_date: new Date()
                            };
                        }
                        else {
                            common.static.recover[code] = {
                                userName: mobile,
                                validNum: validNum,
                                last_updated_date: new Date(),
                                mobile: mobile
                            };
                        }
                
                        resolve(code);
                    }
                    else {
                        logger.info(error.data);
                        reject(globals.knownErrors.validBusy);
                    }

                });
            });
        },
        // 发送注册短信方法
        validUserExist: function (mobile) {
            return new Promise(function (resolve, reject) {
                if (!valid.isPhoneNumber(mobile)) {
                    reject(globals.knownErrors.mobileFormat);
                    return;
                    //utils.respondWithError(null, globals.knownErrors.mobileFormat, null, response);
                }
                utils.isRegistered(mobile).then(function (bool) {
                    if (bool) {
                        reject(globals.knownErrors.userExistError);
                    }
                    else {
                        logger.info("register: " + common.source.register);
                        resolve({
                            mobile: mobile,
                            type: common.source.register
                        });
                    }
                });
            });
        },
        // 发送找回短信方法
        validUserNotExist: function (mobile) {
            return new Promise(function (resolve, reject) {
                utils.getDb().then(function (db) {
                    if (!valid.isPhoneNumber(mobile)) {
                        logger.info("current phone: " + mobile + " is not legel ");
                        reject(globals.knownErrors.phoneNumError);
                        return;
                    }
                    return db.collection(globals.databaseCollection.Users).find({
                        userName: mobile,
                        mobile: mobile
                    });
                }).then(function (data, error) {
                    if (error) {
                        logger.error("database error:  " + error);
                        reject("系统错误，请联系管理员")
                    }
                    data.toArray(function (errors, datas) {
                        logger.info(" errors:" + errors + " mobile: " + mobile);

                        if (datas && datas.length > 0) {
                            logger.info("datas: " + JSON.stringify(datas));
                            resolve({
                                mobile: mobile,
                                type: common.source.recover
                            });
                        }
                        else {
                            logger.info("Retrieve user not exist: " + mobile);
                            reject(globals.knownErrors.mobileNotExist);
                        }
                    })
                });
            })

        },
        register: function (mobile, response) {
            thx.validUserExist(mobile)
                .then(smscommon.checkTimeOut)
                .then(thx.sendMessage)
                .then(function (ok) {
                    utils.respondWithOk(null, null, response);
                })
                .catch(function (err) {
                    utils.respondWithError(null, err, null, response);
                })
        },
        recover: function (mobile, response) {
            thx.validUserNotExist(mobile)
                .then(smscommon.checkTimeOut)
                .then(thx.sendMessage)
                .then(function (code) {
                    utils.respondWithOk({code: code}, null, response);
                })
                .catch(function (err) {
                    utils.respondWithError(null, err, null, response);
                })
        }
        //END
    }
    this.recover = thx.recover;
    this.register = thx.register;
}

exports.smsmethod = SmsCode;
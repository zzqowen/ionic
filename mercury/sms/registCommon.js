var globals = require("../globals");
var utils = require("../utils");
var valid = require("../common/validation").valid;
var logger = utils.logger;
var comon = require("./smsCommon");
var uuid = require("node-uuid");
var dateUtils = require("../common/dateUtils").dateUtils;

var registHelper = {
    registUser: function (user, response) {
        var bool = user.userName && user.password;

        if (bool) {
            if (!valid.isValidPassword(user.password)) {
                utils.respondWithError(null, globals.knownErrors.passwordLength, null, response);
                return null;
            }
            utils.registerUser(user).then(function () {
                delete comon.static.validNum[user.userName];
                utils.respondWithOk(null, null, response);
            }).catch(function (err) {
                utils.respondWithError(null, globals.knownErrors.systemError, null, response);
            });
        }
        else {
            utils.respondWithError(null, globals.knownErrors.pleaseInputRequired, null, response);
        }
    },
    recoverPassword: function (user, response) {
        var mobileHandler = comon.static.recover[user.code];
        var checkTimeOutValid = !mobileHandler || dateUtils.minuteDiff(new Date(),mobileHandler.last_updated_date) > 5 || !mobileHandler.pass;
        if (checkTimeOutValid) return utils.respondWithError(null, globals.knownErrors.validExceedError, null, response);
        var code = user.code;
        var mobile = comon.static.recover[code].mobile;
        var userName = comon.static.recover[code].userName;
        utils.getDb()
            .then(function (db) {
                return db.collection(globals.databaseCollection.Users).updateOne(
                    {userName: userName, mobile: mobile},
                    {$set: {password: user.password}});
            })
            .then(function (result) {
                delete comon.static.recover[code];
                utils.respondWithOk(null, null, response);
            })
            .catch(function (err) {
                logger.error(err);
                utils.respondWithError(null, globals.knownErrors.resetError, null, response);
            });
    }
}

exports.registHelper = registHelper;
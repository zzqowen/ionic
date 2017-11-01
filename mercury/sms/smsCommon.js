const utils = require("../utils");
const logger = utils.logger;
const dateUtils = require("../common/dateUtils").dateUtils;
const globals = require("../globals");

const source = {
    register: "register",
    recover: "recover"
};

var staticParams = {
    validNum: {},
    recover: {}
};

var cleanValidTime = process.env.VALID_TIMER || 1000 * 60 * 60 * 2;

var appkey = {
    'appkey': process.env.appkey || '23827666',
    'appsecret': process.env.appsecret || 'a3ac09b20d4aaeab347aba711e140758',
    // 正式环境： http://gw.api.taobao.com/router/rest， 测试环境：  http://gw.api.tbsandbox.com/router/rest
    'REST_URL': process.env.DEBUGSMS == "debug" ? 'http://gw.api.tbsandbox.com/router/rest' : 'http://gw.api.taobao.com/router/rest'
};

var sms_collection = {
    VALID: "VALID_SMS_TIME"
};

var buildSms = {
    register: function (code, product, mobile) {
        return {
            'extend': 'test',
            'sms_type': 'normal',
            'sms_free_sign_name': '答尔文',
            'sms_param': '{\"code\":\"' + code + '\",\"product\":\"' + product + '\"}',
            'rec_num': mobile,
            'sms_template_code': 'SMS_67280851'
        };
    },
    recover: function (code, product, mobile) {
        return {
            'extend': 'test',
            'sms_type': 'normal',
            'sms_free_sign_name': '答尔文',
            'sms_param': '{\"code\":\"' + code + '\",\"product\":\"' + product + '\"}',
            'rec_num': mobile,
            'sms_template_code': 'SMS_67280849'
        };
    }
};

var smscommon = {
    checkTimeOut: function (params) {
        var mobile = params.mobile;
        var type = params.type;
        logger.info("outside : " + type);
        return new Promise(function (resolve, reject) {
            var mobileHandler = staticParams.validNum[mobile];
            logger.info("result check time out: " + mobileHandler);

            if (mobileHandler) {
                logger.info("mobileHandler.last_updated_date:" + mobileHandler.last_updated_date + " dateUtils:" + JSON.stringify(dateUtils));
                var time = dateUtils.secondDiff(new Date(), mobileHandler.last_updated_date);
                if (time > 60)
                    delete staticParams.validNum[mobile];
                else {
                    reject(globals.knownErrors.validBusy);
                    return null;
                }
            }
            resolve(params);
        });
    }
}

function validNumCleanTask() {
    logger.info("valid num start to remove staticParams:" + JSON.stringify(staticParams.validNum) );
    var mobiles = staticParams.validNum;
    var currentDate = new Date();
    for (var mobile in mobiles) {
        var last_updated_date = mobiles[mobile].last_updated_date;
        if (dateUtils.secondDiff(currentDate, last_updated_date) >= 5 * 60) {
            delete staticParams.validNum[mobile];
        }
    }
}

setInterval(validNumCleanTask, cleanValidTime);

exports.source = source;
exports.static = staticParams;
exports.sms_collection = sms_collection;
exports.appkey = appkey;
exports.smscommon = smscommon;
exports.buildSms = buildSms;

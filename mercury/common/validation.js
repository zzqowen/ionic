var fix = {
    isArray: function(obj) {
        return Object.prototype.toString.call(obj)=='[object Array]';
    },
    isPhoneNumber: function (mobile) {
        var myreg = /^1[3578]\d{9}$/;
        return myreg.test(mobile);
    },
    isValidPassword: function (valid) {
        return valid.length <= 16 && valid.length >= 6;
    },
    isPeerNumber: function(num) {
        var r = /^\+?[1-9][0-9]*$/;
        return r.test(num);
    }
};

exports.valid = fix;
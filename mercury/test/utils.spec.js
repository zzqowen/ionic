var nock = require('nock');
var expect = require('chai').expect;
var utils = require("../utils");
require('dotenv').load();

describe("Testing utils module", function () {
  it("returns a user for oauth code", function (done) {
    nock('https://api.weixin.qq.com')
    .get('/sns/oauth2/access_token')
    .query(true)
    .reply(200, {
      "access_token":"f3N9eIomvqQBQy0OtW3WZxgZmgQsr49Cug1C7q8SS5tAjlqFwaqm2rD0jZjE8AyIbohw6cDF2efixSbOYrKKFhvCo-_sihFZw_gxpe2grDc",
      "expires_in":7200,
      "refresh_token":"I15cPmdPRLrU8PHMzGQBG5R4iD-SYukoabWTxaqqFoc3UsAdJJx-bfuIV9dswVfJ86B385ksr88_scc2p6ZhjpK3qwZOVPF1k2SAwri-emI",
      "openid":"oiDD1w4bTMrvi9A9bjN5Yw2utiK4",
      "scope":"snsapi_userinfo",
      "unionid":"oUeiow_8WKGSoliKtJZ0zOpjLuTI"
    })
    .get('/sns/userinfo')
    .query(true)
    .reply(200,{
      "openid":"oiDD1w4bTMrvi9A9bjN5Yw2utiK4",
      "nickname":"mynick",
      "sex":1,"language":"zh_CN",
      "city":"",
      "province":"",
      "country":"CN",
      "headimgurl":"http:\/\/wx.qlogo.cn\/mmopen\/nxibTuCCIcuH0qjCVgicJYgEaGicujGfeSA39fyVrXL5I7lSVBpkgATQib63HwvsO8ohANIx3sIHZCNTPHWSalm6jZU6BIk9T8Cic\/0",
      "privilege":[],
      "unionid":"oUeiow_8WKGSoliKtJZ0zOpjLuTI"
    });

    utils.authWithWx('code1234', 'referral1234')
    .then(function (result) {
      console.log('-------result', result);
      done();
    }, function (err) {
      console.log('------err=', err);
      done(err);
    });
  })
});

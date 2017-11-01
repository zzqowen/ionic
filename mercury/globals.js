'use strict';

var appName = "答尔文";
var appId = "com.aihuawen.darwin";
var maxQuestions = 10;
var expire = 24*60*60000;
var sharpQuality = 300;
var bonus = 3.0;
var award = 1;
const posts = {
    count: 10
}
const peekCost = {
    cost: 0.1,
    spent: 1,
    earn: 0.9
}
var score = {
    initial: 2000,
    rewardPerPost: 10,
    askPerPost: 10,
    ansPerPost: 1,
    cancelPost: 5
};
var gender = {
    male: 'M',
    female: 'F',
}
var maxDebugString = 100;
var ok = "ok";
var unrated = -1;
var postState = {
    active: 0,
    answering: 1,
    answered: 2,
    closed: 3,
    deleted: 4
};
var accountType = {
    client: 0,
    expert: 1,
    yunying: 8,
    administrator: 9
};
var message = {
    question: 0,
    comment: 1,
    answer: 2,
    reward: 3,
    grab: 4,
    post: 5,
    register: 6,
    pk: 7,
    grabs: 8,
    discuss: 9,
    overtime: 10
};
var myPosts = {
    questions: 1,
    replies: 2,
    all: 3
};
var categories = {
    name: "所有分类",
    value: "/",
    selected: false,
    getName: function(value){
        for (var i = 0; this.options && i < this.options.length; i++)
            if (this.options[i].value == value) return this.options[i].name;
        return value;
    },
    options: [{name: "教育" , value: "/edu"  , options: []},
       {name: "娱乐" , value: "/entertainment", options: []},
       {name: "情感" , value: "/emotion" ,options: []},
        {name: "生活" , value: "/life" ,options: []},
       {name: "就业" , value: "/sports" , options: []},
       {name: "其它" , value: "/other", options: []} 
      ],
    defaults: [],
    categoryMap: {}
};

categories.defaults = [];
categories.options.forEach(json => categories.defaults.push(json.value));
categories.options.forEach(json => categories.categoryMap[json.value] = json.name);

var bugReport = "/support/bug";
var buggerUser = {
    name: "bugger",
    _id: "5830f1d1f4f56056525aa390",
    avatar: "data/user3.png"
};

var maxAnswer = 3;

var databaseUrl = process.env.databaseUrl || 'mongodb://127.0.0.1:27017/mercury';

var databaseCollection = {
    Pks: 'pks',
    Posts: 'posts',
    Users: 'users',
    Tokens: 'tokens',
    Friends: 'friends',
    Questions: 'questions',
    Answers: 'answers',
    Follows: 'follows',
    FriendActivity: 'friendActivity',
    Question: 'question',
    Discuss: 'discuss',
    Grabs: 'grabs',
    Complaints: 'complaints',
    LuckyMoney: 'luckyMoney',
};

var knownErrors = {
    canNotGrab: '您当前为初级用户，每天只可以回答三个问题!',
    canNotGrabMore: '您当前为中级用户，每天只可以回答五个问题！',
    canNotInviteSelf: "自己不能邀请自己",
    noQuestionLeave: "已无更多的题目",
    raceIsFinished: "比赛已结束",
    operateTimeOut: "操作超时",
    passwordInputDiff: "两次输入密码不一致",
    answerCanNotMoreThanThree: "抢答问题的数目不可以多于" + maxAnswer + "条",
    validBusy: "请勿频繁请求发送验证码",
    mobileNotExist: "手机号未注册",
    mobileFormat: "请输入正确的手机格式",
    userExistError: "用户已存在",
    passwordLength: "密码长度必须在6-16之间",
    pleaseInputRequired: "请输入完整的信息",
    validExceedError: "验证码超时，请重新发送",
    validNumError: "验证码错误，请重新输入",
    paramsLoss: "参数缺失",
    unknown: "抱歉，服务暂时不可用",
    invalidRequest: "无效的服务请求",
    network: "网络故障，请稍后重试",
    userNameTooShort: "用户名长度不够",
    userNotFound: "无法找到用户",
    postNotFound: "无法找到提问",
    parameterError: "参数错误",
    userUpdateFailed: "无法更新用户信息",
    postUpdateFailed: "无法更新提问信息",
    cookie: "用户验证过期，请重新登录",
    taken: "该用户名已被注册",
    lowFund: "账户余额不足，请充值",
    canDelete: "抱歉，该回答不能删除",
    file: "无法读取文件",
    questionClosed: "问题已关闭",
    notAnyFriend: "没有发现朋友",
    alreadyFriend: "你们已经是朋友",
    addFriendError: "添加朋友出错",
    delError: "删除错误",
    answered: '已回答过该问题',
    findFriendError: "查找朋友出错",
    resetError: "重置失败",
    phoneNumError: "请输入正确的手机号",
    systemError: "系统错误",
    usernameOrPassword: "用户名或密码错误",
    needMoreContent: "请输入内容后再提交",
    addQuestionError: "提问失败",
    haveFollowPosts: "已经关注了改问题",
    haveGrabPosts: "已经参与抢答",
    grabPostsFail: "参与抢单失败",
    notAnyDiscuss: "没有用户发表提问",
    notFollowAnyPosts: "还未关注任何问题",
    posthavaGrab: "该单已被抢答",
    noMorePosts: "没有更多的单了",
    cancelFail: "取消失败",
    answerFail: "回答失败",
    peekFail: "授权偷看失败",
    peekThisFail: "偷看该单失败",
    notFoundPosts: "没有发现单",
    payFail: "支付失败",
    haveComplaints: "该单您已投诉，客服正在处理！",
    postDelete: "此问题已被删除",
    noPermission: "权限不够，请登录后在访问",
}

var rootDir = __dirname;

// push down to user
var userSettings = {
    refundRatio: 1,
    enableWxPay: true,
    enableIOSPay: true,
    enableIsPay: true
};

var systemUser = {
    _id: "0000000000000000",
    displayName: "答尔文",
    avatar: "data/system.png"
};

var anonymousUser = {
    displayName: "***",
    avatar: "data/anonymous.png"
};

var payStatus = {
    satisfy: 0,
    receive: 1,
    delete: 2
};

const listType = {
    question : 0,
    answer : 1,
    follow : 2
};

const questions = {
    max: 1000,
    count: 10
};

const listStatus = {
    add: 1,
    update: 2,
    complete: 0
};

const version = ['2.0','1.7.0', '1.6.0', '7.8.9'];

var friendActivityType = {
    answer: 0,
    question: 1
};

let pkLevel = [
    '幼儿园',
    '小学一年级',
    '小学二年级',
    '小学三年级',
    '小学四年级',
    '小学五年级',
    '小学六年级',
    '初一',
    '初二',
    '初三',
    '高一',
    '高二',
    '高三',
    '大一',
    '大二',
    '大三',
    '大四',
    '研究生',
    '博士生',
    '博士后'
];

exports.version = version;
exports.pkLevel = pkLevel;
exports.peekCost = peekCost;
exports.posts = posts;
exports.friendActivityType = friendActivityType;
exports.payStatus = payStatus;
exports.rootDir = rootDir;
exports.appName = appName;
exports.appId = appId;
exports.maxQuestions = maxQuestions;
exports.expire = expire;
exports.maxDebugString = maxDebugString;
exports.ok = ok;
exports.unrated = unrated;
exports.postState = postState;
exports.accountType = accountType;
exports.message = message;
exports.myPosts = myPosts;
exports.categories = categories;
exports.databaseUrl = databaseUrl;
exports.databaseCollection = databaseCollection;
exports.knownErrors = knownErrors;
exports.buggerUser = buggerUser;
exports.bugReport = bugReport;
exports.bonus = bonus;
exports.score = score;
exports.userSettings = userSettings;
exports.systemUser = systemUser;
exports.anonymousUser = anonymousUser;
exports.gender = gender;
exports.sharpQuality = sharpQuality;
exports.award = award;
exports.maxAnswer = maxAnswer;
exports.listType = listType;
exports.questions = questions;
exports.listStatus = listStatus;

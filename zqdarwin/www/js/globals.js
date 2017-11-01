angular.module('darwin.globals', [])
.constant('globals', {
    server: {
        options: [
            {name: "ali", value: "https://svc.aihuawen.com"},
            {name: "ali internal", value: "https://go.aihuawen.com:4430"},
            {name: "localhost", value: "http://127.0.0.1"},
            {name: "localhost 8080", value: "https://127.0.0.1:8080"},
            {name: "ZQ internal", value: "http://192.168.1.112:9080"},
            {name: "hui", value: "http://192.168.0.108:9080"},
        ],
        get: function(){
           return (window.localStorage.server ? window.localStorage.server : "https://svc.aihuawen.com");
        },
        set: function(server){
            window.localStorage.server = server;
        }
    },
    push: {
        options: ["huawei", "xiaomi", "google"],
        get: function(){
            return (window.localStorage.push ? window.localStorage.push : "xiaomi");
        },
        set: function(device){
            window.localStorage.push = device;
        }
    },
    settings: {
        get: function(){
          return JSON.parse(window.localStorage.settings || '{}');
        },
        set: function(settings){
          window.localStorage.settings = JSON.stringify(settings);
        }
    },
    share: {
        friends: 0,
        zone: 1,
    },
    copy: function(source, target, replace) {
      if (!source) return;
      if (!target) return source;
      if (replace)
          for (var key in target) delete target[key];
      for (var key in source) target[key] = source[key];
      return target;
    },
    
    version: "1.5",
    httpTimeout: 5000,
    maxQuestions: 10,
    timeConversionConstant: 10,
    photoQuality: 80,
    photoTargetWidth: 800,
    photoTargetHeight: 800,
    maxPhotos: 3,
    maxAudios: 1,
    currencyUnit: "元",
    ok: "ok",
    gracePeriodInMinutes: 5,
    timeDifference: -28800000,
    minuteToMilliscond: 60000,
    unrated: -1,
    postState: {
        active: 0,
        answering: 1,
        answered: 2,
        closed: 3,
        deleted: 4,
        stateTransform: 1
    },
    complainState: {
        invalid: 0,
        filed: 1,
        investigating: 2,
        resolved: 3
    },
    message: {
        question: 0,
        comment: 1,
        answer: 2,
        reward: 3,
        grab: 4,
        post: 5,
        register: 6,
        pull: 7,
        grabs:8,
        overtime:10,

    },
    accountType: {
        client: 0,
        expert: 1,
        administrator: 9
    },
    myPosts: {
        questions: 1,
        replies: 2,
        all: 3
    },
    history: {
        myQuesionListValue: 0,
        myAnswerListValue: 1,
        myCareListValue: 2
    },
    rating: {
        good: 5,
        bad: 0
    },
    getRatingString: function(rating){
        if (!rating) return "";
        var str = "";
        for (i = 0; i < 5; i++) str += (i < rating) ? "★" : "☆"; // &#9733 : &#9734
        return str;
    },
    categories:[
       [{name: "生活" , value: "/life" , selected: true , imgSrc: 'data/life.png' ,  options: []},
       {name: "情感" , value: "/emotion" , selected: true , imgSrc: 'data/emotion.png' , options: []},
       {name: "就业" , value: "/sports" , selected: true , imgSrc: 'data/sports.png' , options: []},
       {name: "娱乐" , value: "/entertainment" , selected: true , imgSrc: 'data/entertainment.png' , options: []},
       {name: "教育" , value: "/edu" , selected: true , imgSrc: 'data/edu.png' , options: []},
      ],
    ],
    prices:[
       [{name: "10" , value: 1},
       {name: "20" , value: 2},
       {name: "30" , value: 3},
       {name: "50" , value: 5},
       {name: "100" , value: 10},
      ],
    ],
    price: {
        default: 1
    },
    expire: {
        range: [
            {name:"十五分钟", value:15},
            {name:"三十分钟", value:30},
            {name:"一小时", value:60},
            {name:"两小时", value:120},
            {name:"十二小时", value:720},
            {name:"二十四小时", value:1440},
            {name:"四十八小时", value:2880},
            {name:"三个月", value:129600}
        ],
        default: 129600
    },
    knownErrors: {
        unknown: "抱歉，服务暂时不可用",
        invalidRequest: "无效的服务请求",
        network: "网络故障，请稍后重试",
        userNameTooShort: "用户名长度不够",
        userNotFound: "无法找到用户",
        postNotFound: "无法找到提问",
        userUpdateFailed: "无法更新用户信息",
        postUpdateFailed: "无法更新提问信息",
        cookie: "用户验证过期，请重新登录",
        taken: "该用户名已被注册",
        lowFund: "账户余额不足，请充值",
        canDelete: "抱歉，该回答不能删除",
        file: "无法读取文件",
        questionClosed: "问题已关闭",
        loginError: "用户名或密码错误，请重新输入",
    },
    pkCode: {
        matchSuccess: "matchsuccess",
        pkManager: "pkmanager",
        pkError: "pkerror",
        pkPushQuestion: "pushquestion",
        pkJudge: 'pkjudge',
        pkBack: 'pkback',
        backtopk: 'backtopk',
        disconnect: 'disconnect',
        reconnect: 'reconnect',
        pkinvited: 'pkinvited',
        cancelinvited: 'cancelinvited'
    },
    pkType: [
        {name: '王者荣耀', selected: true, value: '娱乐'},
        {name: '四级英语', selected: false, value: '四六级'},
        {name: '猜想歌词', selected: false, value: '音乐'}
    ],
    pkData: {
        pkTime: 10,
        pkStartAllScore: 140
    }
});

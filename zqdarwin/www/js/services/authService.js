angular.module('darwin.authService', [])
.service('AuthService',
  function ($rootScope, $http, $q, $ionicScrollDelegate, $ionicPlatform, $ionicViewSwitcher, $location, PushServer, HttpHelper, globals, util, store, $state, $sce, PostServer){
    var currentUser = store.getUser();
    var userValidated = false;
    var self = this;
    var source = "";
    var deleteCareId;
    var channel = ($location.absUrl().indexOf('?') != -1) && $location.absUrl().split("?")[1].split("#")[0].split("=")[1];

    this.setSource = function(src){
      self.source = src;
    };

    this.addCredit = function (payment) {
      return HttpHelper.post(util.getApiUrl('/user/add_credit/'), payment)
      .then(function(result){
          store.updateUser({credit: result.credit}, false);
          return result.credit;
      });
    };

    var doLoginWx = function(referral) {
      var deferred = $q.defer();
      var scope = "snsapi_userinfo", state = "_" + (+new Date());
      Wechat.auth(scope, state,
        function (response) {
          console.log(response);
          self.login({code: response.code, referral: referral, source: 'wx', channel: channel}, false).then(
            function(user){ deferred.resolve(user); },
            function(error){ deferred.reject(globals.knownErrors.unknown);}
          );
        },
        function (error) {
          console.error(error);
          deferred.reject(globals.knownErrors.unknown);
        }
      );
      return deferred.promise;
    };

    var doLoginQQ = function(referral) {
      var deferred = $q.defer();
      QQSDK.ssoLogin(
        function (args) {
          console.log(args);
          self.login({token: args.access_token, userId: args.userid, referral: referral, source: 'qq', channel: channel}, false).then(
            function(user){ deferred.resolve(user); },
            function(error){ deferred.reject(globals.knownErrors.unknown);}
          );
        },
        function (error) {
          console.error(error);
          deferred.reject(globals.knownErrors.unknown);
        }
      );
      return deferred.promise;
    };

    this.doLogin = function(user, referral){
      if (self.source == "wx") return doLoginWx(referral);
      if (self.source == "qq") return doLoginQQ(referral);
      return self.login({userName: user.userName, password: user.password, referral: referral, source: source}, false);
    }

    this.doRegister = function(user, referral) {
      var deferred = $q.defer();
      user.version = globals.version;
      user.channel = channel;
      self.registerUser(user).then(
        function(data){
          if (data.status != globals.ok) return deferred.reject(data.status);
          self.setSource('phone');
          self.doLogin(user, referral).then(
            function(user){ deferred.resolve(user); },
            function(err){ deferred.reject(globals.knownErrors.network); }
          );
        },
        function(err){ deferred.reject(globals.knownErrors.network); }
      );
      return deferred.promise;
    };

    this.updateUser = function() {
      HttpHelper.get(util.getApiUrl('/user/update/')).then(
        function(data){
          if (data.status == globals.ok) store.updateUser(data.user, false);
        }
      );
    };

    this.checkUserNameAvailability = function(userName) {
        return HttpHelper.get(util.getOpenUrl('/check_availability/?userName=' + userName));
    };

    this.recoverPassword = function(code, password , valid) {
      return HttpHelper.post(util.getOpenUrl('/sms/setNewPassword'), {code: code, password: password, valid: valid});
    };

    this.login = function(info, isVisitor) {
      info.version = globals.version;
      var deferred = $q.defer();
      info.version = globals.version;
      HttpHelper.post(util.getOpenUrl('/user/login/'), info).then(
        function(data){
          console.log(data);
          if (data.status != globals.ok && !isVisitor) return deferred.reject(data.status);
          userValidated = true;
          window.localStorage.isExist = data.isExist;
          store.updateUser(data.user, true);
          PushServer.register(currentUser);
          deferred.resolve(currentUser);
        },
        function(err){ deferred.reject(globals.knownErrors.network); }
      );
      return deferred.promise;
    };

    this.isFirstTime = function(){
      return (window.localStorage.user == null);
    };

    // this.registerUser = function(user, nonce) {
    //   return HttpHelper.post(util.getOpenUrl('/sms/registerPhone/NEW/'), user);
    // };

    this.registerUser = function(user, nonce) {
      return HttpHelper.post(util.getOpenUrl('/sms/registerPhoneNew/'), user);
    };

    this.setDisplayName = function(displayName,password){
      return HttpHelper.post(util.getApiUrl('/user/init'), {displayName: displayName, password: password});
    }

    this.userIsLoggedIn = function(){
      var deferred = $q.defer();
      if (userValidated) deferred.resolve(true);
      else{
        if (currentUser && currentUser.cookie){
          HttpHelper.get(util.getApiUrl('/user/update/')).then(function(data){
            if (data.status != globals.ok) return deferred.resolve(false);
            userValidated = true;
            store.updateUser(data.user, false);
            PushServer.register(currentUser);
            deferred.resolve(true);
          });
        }
        else{
          deferred.resolve(false);
        }
      }
      return deferred.promise;
    };

    this.logOut = function(){
      userValidated = false;
      PushServer.unregister(currentUser);
      store.updateUser({}, true);
      PostServer.clear();
      $rootScope.$emit('refreshHomePage');
    };

    this.isSelfPosted = function(post){
      if (!post) return false;
      if (!currentUser || post.author._id != currentUser._id) return false;
      return true;
    };

    this.isSelfAnswered = function(post){
      if (!post) return false;
      if (!currentUser || post.expert._id != currentUser._id) return false;
      return true;
    };

    this.isMine = function(post){
      if (!post || !currentUser) return false;
      if (post.author._id != currentUser._id) return false;
      return true;
    };

    this.changeUserInfo = function(info){
      return HttpHelper.patch(util.getApiUrl('/user/change/'), info);
    };

    this.getFriends = function(sort){
      return HttpHelper.post(util.getApiUrl('/user/getFriendList/')).then(function(data){
        window.localStorage.friendsList = JSON.stringify(data);
        if (data.length == 0) return;
        if (sort){
          var friends = [];
          var brr = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','#'];
          for (var i=0; i < brr.length; i++){
            friends[i] = {};
            friends[i].name = brr[i];
            friends[i].value = [];
          }
          var x = data.length;
          for (var i = 0; i < x; i++){
            for (var j = 0; j<friends.length; j++){
              if (codefans_net_CC2PY(data[i].displayName).slice(0,1).toLowerCase() == friends[j].name.toLowerCase()) {
                friends[j].value.push(data[i]);
                break;
              }else{
                if (j == friends.length-1 ) friends[26].value.push(data[i]);
              }
            }
          }
          return friends;
        }else{
          return data;
        }
      });
    };

    this.getFriendsList = function() {
      return [
        {name: '陌生人', url: '/moments/stranger', userFriends: [], loaded: false, isLoading: false, hasMore: true, lastActTimeStamp: 0, isEmpty: true},
        {name: '好朋友', url: '/moments/friends', userFriends: [], loaded: false, isLoading: false, hasMore: true, lastActTimeStamp: 0, isEmpty: true}
      ];
    };
    
    var currentUser = store.getUser();
    this.getFriendsActivity = function(url, lastActTimeStamp){
      var content = {
        date: lastActTimeStamp
      };
      var deferral = $q.defer();
      HttpHelper.post(util.getApiUrl(url), content).then(
        function(data){
          for(var i = 0;i<data.length;i++){
            data[i].peeknum = Math.floor(Math.random() * 1000);
          }
          data = PostServer.set(data);
          deferral.resolve(data);
        }, 
        function(error) {
          console.error(error);
          deferral.reject(error);
        }
      )
      return deferral.promise;
    };

    this.getSelfPosts = function(id, lastPostTimeStamp, cache) {
      if (cache) return PostServer.getSelfPosts(id);
      var content = {
        date: lastPostTimeStamp,
        author_id: id
      };
      var deferral = $q.defer();
      HttpHelper.post(util.getApiUrl('/moments/personPosts'), content).then(
        function(data) {
          data = PostServer.set(data);
          deferral.resolve(data);
        },
        function(error) {
          console.error(error);
          deferral.reject(error);
        }
      )
      return deferral.promise;
    };

    this.searchFriends = function(id){
      return HttpHelper.post(util.getApiUrl('/user/searchUser/'), {userId: id}).then(function(data){
          return data;
      });
    }

    this.addFriends = function(obj){
      return HttpHelper.post(util.getApiUrl('/user/addFriend/'), obj).then(function(data){
          return data;
      });
    }

    this.delFriends = function(_id){
      return HttpHelper.post(util.getApiUrl('/user/deleteFriend/'), {_id: _id}).then(function(data){
          return data;
      });
    }

    this.getUserSummary = function(id){
      console.assert(id);
      return HttpHelper.get(util.getOpenUrl('/summary/user/' + id)).then(function(data) {
        return data;
      });
    }

    this.share = function(content){
      console.debug(content);
      console.assert(currentUser && content);
      if (content.target == 'wx') return shareWx(content);
      else return shareQQ(content);
    };

    this.getVerificationCode = function(mobile, type){
      return HttpHelper.post(util.getOpenUrl('/sms/requestSms'), {mobile: mobile, type: type});
    }
    
    this.areFriendsWith = function(idName){
      var data = JSON.parse(window.localStorage.friendsList);
      if (data instanceof Array){
        var arr = data.filter(function(x){return x.id.indexOf(idName) != -1});
        return (arr.length == 1);
      }
      return false;
    }

    this.getFriendActivity = function(obj){
      return HttpHelper.post(util.getApiUrl('/friend/activity'), obj);
    }

    this.showAbout = function(url){
      $ionicViewSwitcher.nextDirection("forward");
      $state.go('about');
      $rootScope.paySrc = $sce.trustAsResourceUrl('http://www.aihuawen.com/' + url);
      if ( url == 'service.html')  return $rootScope.theTitle = "用户许可及服务协议";
      if ( url == 'pay.html') return $rootScope.theTitle = "充值说明";
      if ( url == 'aboutUs.html') return $rootScope.theTitle = "关于我们";
      if ( url == 'banner.html') return $rootScope.theTitle = "活动";
    }

    this.feedback = function( type,reason,content,post_id){
      return HttpHelper.post(util.getApiUrl('/complaints/add'),{type: type, reason: reason, content: content, post_id: post_id});
    }

    this.getRedPacket = function(){
      return HttpHelper.post(util.getApiUrl('/luckyMoney/get'));
    }

    this.toGetRedPacket = function(obj){
      return HttpHelper.post(util.getApiUrl('/luckyMoney/receive'),obj);
    }

    this.redPacketHistory = function(){
      return HttpHelper.post(util.getApiUrl('/luckyMoney/history'));
    }

    this.theLatestVersion = function(){
      return HttpHelper.post(util.getOpenUrl('/version/get'));
    }

    //自动触发下拉加载
    this.triggerScrollViewPullToRefresh = function (scrollView) {
        scrollView.__publish(
            scrollView.__scrollLeft, -scrollView.__refreshHeight,
            scrollView.__zoomLevel, true);

        var d = new Date();

        scrollView.refreshStartTime = d.getTime();

        scrollView.__refreshActive = true;
        scrollView.__refreshHidden = false;
        if (scrollView.__refreshShow) {
            scrollView.__refreshShow();
        }
        if (scrollView.__refreshActivate) {
            scrollView.__refreshActivate();
        }
        if (scrollView.__refreshStart) {
            scrollView.__refreshStart();
        }
    }

    var scrollViewIndex = {
      home: 0,
      friends: 0,
      history: 0
    };
    this.setScrollViewIndex = function(index, style){
      scrollViewIndex[style] = index;
    }

    this.getScrollViewIndex = function(index){
      return scrollViewIndex;
    }

    this.getInstances = function(delegateIndex, content){
        //get all the instances that ionic scroll delegate is handling
        var instances = $ionicScrollDelegate["_instances"];
        //Create Instance you want to get
        console.log(instances);
        var instance = [];
        for (var index in instances) {
            // instances[index].$$delegateHandle = index;
            if (instances[index].$$delegateHandle == content) {
                instance.push(instances[index]);
            }
        }
        console.log(instance)
        return instance[delegateIndex]; //return the instance 
      }
  }
)


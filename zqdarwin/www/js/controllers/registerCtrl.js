angular.module('darwin.registerCtrl', [])
.controller('RegisterCtrl',
  function($scope, $state, $ionicHistory, AuthService, store, $ionicLoading , globals, $timeout, $interval, wrongBounced) {
    // $scope.theNumber = Math.floor(Math.random()*12+1);
    // console.log($scope)
    $scope.avatarSrc = 'data/z_'+ Math.floor(Math.random()*12+1) +'@3x.png';
    var Height = angular.element(document.querySelector('ion-nav-view'))[0].offsetHeight;
    $scope.theHeight = Height - 42 + 'px';
    $scope.theHeightSecond = Height - 430 + 'px';
    $scope.user = {
      userName: "",
      avatar: $scope.avatarSrc,
    };
    $scope.config = store.getConfig();
    console.log($scope.config);
    var loginError = "用户名或密码错误，请重新输入";
    var phoneNumError = "请输入正确的手机号码";
    var passwordError = "两次输入的密码不一致";
    $scope.goBack = function() {
      $ionicHistory.goBack();
    };

    $scope.toShow = true;
    $scope.focus = function(){
      $scope.error = "";
      $scope.toShow = false;
    }

    $scope.blur = function(){
      if (!$scope.user.userName) $scope.error = phoneNumError;
      $timeout(function(){
        $scope.toShow = true;
      }, 100);
    }

    $scope.toShow1 = true;
    $scope.focus1 = function(){
      $scope.toShow1 = false;
    }

    $scope.blur1 = function(){
      $timeout(function(){
        $scope.toShow1 = true;
      }, 100);
    }

    $scope.verifyPassword = function(){
      if ($scope.user.password != $scope.user.truePassword) return $scope.error = passwordError;
      if (!$scope.user.userName) return $scope.error = phoneNumError;
      $scope.error = '';
      $scope.isCodeClicked = true;
    }

    $scope.btnName = "获取验证码";
    $scope.isCodeClicked = false;
    $scope.getSmsCode = function(){
      if ($scope.btnName != "获取验证码") return $scope.isCodeClicked = true;;
      AuthService.getVerificationCode($scope.user.userName.toString(), "register").then(
        function(data){
          if (data.status == "ok"){
            $scope.isCodeClicked = false;
            $scope.btnName = "获取验证码60s";
            $scope.error= '';
            var number = 60;
            var counter = $interval(function(){
              number--;
              $scope.btnName= "获取验证码"+ number + "s";
              if(number <=0) {
                $scope.btnName = "获取验证码";
                $scope.isCodeClicked = true;
                $interval.cancel(counter);
              }
            }, 1000);
          }
          else {
            $scope.error = data.status;
            $scope.btnName = "获取验证码";
            $scope.isCodeClicked = true;
          }
        }
      )
    }

    $scope.doRegister = function(){
      var user = {
        userName: $scope.user.userName.toString(),
        password: "123456",
        mobile: $scope.user.mobile,
        displayName: $scope.user.displayName,
        avatar: $scope.user.avatar,
        valid: $scope.user.valid.toString(),
        version: "1.5",
      };
      store.updateUser(user, true);
      $ionicLoading.show({ template: '正在注册...' });
        AuthService.doRegister(user, $scope.referral)
        .then(function(user){
          $state.go("nickname");
          $ionicLoading.hide();
          console.debug(user);
        },function(err){
          wrongBounced.toRemind(err, "register");
          $ionicLoading.hide();
          console.debug(err);
        });
    };

    $scope.showAbout = function(url){
      AuthService.showAbout(url);
    }

    $scope.sendNickName = function(){
      AuthService.setDisplayName($scope.user.displayName, $scope.user.password).then(
        function(data){
          if (data.status == "ok") {
            wrongBounced.toRemind('答尔文奖励你30金币!',"tab.home");
            //$state.go("tab.home", {source: "nickname"});
            store.updateUser({displayName: $scope.user.displayName}, false);
          }
          else wrongBounced.toRemind(data.status, "nickname");
          $ionicLoading.hide();
        },function(err){
          $scope.message = err.data.msg;
          $ionicLoading.hide();
        }
      )
    }
    $scope.data = {};
    $scope.data.eyesWay = "data/closeEyes.png";
    $scope.data.passwordType = "password";
    $scope.toShowPassword = function(){
     $scope.data.eyesWay == "data/closeEyes.png" ? $scope.data.eyesWay = 'data/openEyes.png' : $scope.data.eyesWay = 'data/closeEyes.png';
     $scope.data.passwordType == "password" ? $scope.data.passwordType = "text" : $scope.data.passwordType = "password";
    }

    $scope.setSource = function(source){
      $scope.showSpinner = true;
      var user = store.getUser();
      AuthService.setSource(source);
      AuthService.doLogin(user, $scope.referral).then(
        function(user){
          if (user) $timeout(function(){
            $state.go("tab.home"); 
            $scope.isVisitor = false;
            $scope.showSpinner = false;
          }, 1500);
          else {
            wrongBounced.toRemind(loginConnectError,"register");
            $scope.showSpinner = false;
          }
        }, 
        function(err){ $scope.showSpinner = false; }
      );
    };

    $scope.visitorLogin = function() {
      var user = {
        _id: '010101010101010101010101'
      };
      AuthService.login(user, true).then(function(user) {
        console.log(user);
        $state.go('tab.home', {_id: '010101010101010101010101'});
      });
    };

  }
)

.controller('InviteCtrl',
  function($scope, $state, $stateParams, $ionicHistory, $ionicLoading, AuthService, store, shareService) {
    var user = store.getUser();
    $scope.credit = user.credit;
    $scope.fromInvite = true;
    $scope.data = {};
    $scope.data.friendId = parseInt(window.localStorage.invitedBy);
    $scope.addFriend = function(){
      AuthService.addFriends({id: $scope.data.friendId, isInvitation: true})
      .then(function(data){
        if (data.status == "ok") $state.go("shareGetCash", {source: 'invite'});
        else $scope.error = data.status;
        window.localStorage.invitedBy = null;
        $ionicLoading.hide();
      });
    }

    $scope.btnName = '直接进入';
    if ($stateParams.source == "account") {
      $scope.btnName = '返回';
      $scope.fromInvite = false;
    }

    $scope.togo = function(){
      if ($stateParams.source == "account") $state.go("tab.account");
      else $state.go("tab.home");
    }

    $scope.share = function(){
      shareService.showShareTargets($scope, 'getCash', $scope.post);
    } 
  }
)
.controller('LoginCtrl',  function($scope,$cordovaFileTransfer,$cordovaFileOpener2, $state, $timeout, $ionicHistory, $ionicModal, AuthService, globals, store , wrongBounced, $ionicLoading, $ionicPopup, util, HttpHelper, $q) {
    $scope.data = {};
    $scope.showSpinner = false;
    $scope.data.understood = false;
    $scope.currentName = $state.current.name;

    var Height = angular.element(document.querySelector('ion-nav-view'))[0].offsetHeight;
    $scope.theHeight = Height - 42 + 'px';
    $scope.theHeightSecond = Height - 430 + 'px';
    var savedUser = store.getUser();
    var loginError = "用户名或密码错误，请重新输入";
    var phoneNumError = "请输入正确的手机号码";
    if (savedUser.from == 'me') {
      $scope.user = {
        userName: savedUser.userName,
        password: savedUser.password
      };
    } else {
      $scope.user = {
        userName: '',
        password: ''
      };
    }
    AuthService.userIsLoggedIn().then(function(result){
      if (result) $state.go("tab.home");
    });
    $scope.$on('$ionicView.beforeEnter', function() {
      if ( window.localStorage.savedUser == 'true'){
        $scope.data.understood = true;
        $scope.user = {
        userName: Number(window.localStorage.userName),
        password: window.localStorage.userPassword
      }}
      $scope.error = "";
      $ionicHistory.clearHistory();
    });

    $scope.$on('$ionicView.afterEnter', function(){
      if ($state.current.name == "phoneLogin"){
        
      }
    });
    
    $scope.toShow = true;
    $scope.focus = function(){
      $scope.error = "";
      $scope.toShow = false;
    }

    $scope.blur = function(){
      if (!$scope.user.userName) $scope.error = phoneNumError;
      $timeout(function(){
        $scope.toShow = true;
      }, 100);
    }

    // $scope.enterThePassword = function(){
    //   $scope.blur();
    // }
    // $scope.blur = function(){
    //   if (!$scope.user.userName) $scope.error = phoneNumError;
    //   else $scope.error = "";
    // }
    
    $scope.isVisitor = true;
    $scope.doLogin = function(){
      if ($scope.data.understood == true){
        window.localStorage.savedUser = true;
        window.localStorage.userName = $scope.user.userName;
        window.localStorage.userPassword = $scope.user.password;
      }
      $ionicLoading.show({ template: '正在登录...' });
      var user = {
        userName: $scope.user.userName.toString(),
        password: $scope.user.password
      };
      AuthService.setSource('phone');
      AuthService.doLogin(user, null)
      .then(function(user){
        if (user) {
          $state.go("tab.home");
          $scope.isVisitor = false;
        }
        $ionicLoading.hide();
      }, function(err){
        wrongBounced.toRemind(globals.knownErrors.loginError,"phoneLogin");
        $ionicLoading.hide();
      });
    };

    $scope.referral = "";
    var loginConnectError = "登录失败，请稍后重试"
    $scope.setSource = function(source){
      $scope.showSpinner = true;
      var user = store.getUser();
      AuthService.setSource(source);
      AuthService.doLogin(user, $scope.referral).then(
        function(user){
          if (user) $timeout(function(){
            $state.go("tab.home"); 
            $scope.isVisitor = false;
            $scope.showSpinner = false;
          }, 1500);
          else {
            wrongBounced.toRemind(loginConnectError,"phoneLogin");
            $scope.showSpinner = false;
          }
        }, 
        function(err){ $scope.showSpinner = false; }
      );
    };

    $scope.showAbout = function(url){
      AuthService.showAbout(url);
    }

    $scope.config = store.getConfig();
    $scope.debug = {
      userNameTapped: false,
      passwordTapped: 0,
    };
    $scope.showDebug = function(source) {
      // pattern check
      if (source == 0){ $scope.debug.userNameTapped = true; $scope.debug.passwordTapped = 0; return; }
      if (!$scope.debug.userNameTapped) return;
      $scope.debug.passwordTapped++;
      if ($scope.debug.passwordTapped < 3) return;
      $scope.debug.userNameTapped = false;
      $scope.debug.passwordTapped = 0;
      // passed pattern check, now show the debug popup
      $scope.debug.customServer = "";
      $scope.debug.isCustomServer = false;
      $scope.debug.isAndroid = ionic.Platform.isAndroid();
      if ($scope.debug.isAndroid)
        $scope.debug.push = {
          options: globals.push.options,
          current: globals.push.get()
        };
      $scope.debug.servers = globals.server.options;
      $scope.debug.current = globals.server.get();
      if (!$scope.debug.modal){
        $ionicModal.fromTemplateUrl('views/common/debug.html', {
          scope: $scope,
          animation: 'slide-in-up'
        }).then(function(modal) {
          $scope.debug.modal = modal;
          $scope.debug.modal.show();
        });
      }
      else{
          $scope.debug.modal.show();
      }
    };

    $scope.closeDebug = function(){
      $scope.debug.modal.hide();
      if ($scope.debug.isCustomServer) globals.server.set($scope.debug.customServer);
      else globals.server.set($scope.debug.current);
      if ($scope.debug.isAndroid) globals.push.set($scope.debug.push.current);
    };

    $scope.goBack = function(){
      $ionicHistory.goBack();
    };

    $scope.visitorLogin = function() {
      var user = {
        _id: '010101010101010101010101'
      };
      AuthService.login(user, true).then(function(user) {
        console.log(user);
        $state.go('tab.home', {_id: '010101010101010101010101'});
      });
    };

    $scope.data.eyesWay = "data/closeEyes.png";
    $scope.data.passwordType = "password";
    $scope.toShowPassword = function(){
     $scope.data.eyesWay == "data/closeEyes.png" ? $scope.data.eyesWay = 'data/openEyes.png' : $scope.data.eyesWay = 'data/closeEyes.png';
     $scope.data.passwordType == "password" ? $scope.data.passwordType = "text" : $scope.data.passwordType = "password";
    }
  }
)

.controller('ForgotPasswordCtrl',
  function($scope, $state, $ionicLoading, $ionicHistory, $interval, AuthService, wrongBounced, $ionicPopup, $rootScope) {
    var phoneNumError = "请输入正确的手机号码";
    var passwordSuccess = "成功修改密码";
    var passwordError = "两次输入的秘密不一致";
    $scope.goBack = function() {
      $ionicHistory.goBack();
    };

    $scope.user = {};
    $scope.goBack = function() {
      $ionicHistory.goBack();
    };

    $scope.recoverPassword = function(){
      AuthService.recoverPassword(window.localStorage.code , $scope.user.password ,$scope.user.valid.toString())
      .then(function(data){
        if (data.status == "ok") wrongBounced.toRemind(passwordSuccess,"phoneLogin");
        // else wrongBounced.toRemind(data.status,"newPassword"); 
        else wrongBounced.toRemind(data.status,"forgotPassword"); 
        $ionicLoading.hide();
      });
    };

    $scope.focus = function(){
      $scope.message = "";
    }

    $scope.verifyPassword = function(){
      if ( $scope.user.password != $scope.user.truePassword ) $scope.message = passwordError;
      else $scope.message = '';
    }

    $scope.blur = function(){ if (!$scope.user.userName) $scope.message = phoneNumError; }
    
    $scope.isCodeClicked = true;
    $scope.toGetCode = function(){
      // AuthService.getVerificationCode($rootScope.userName, "recover").then(
      AuthService.getVerificationCode($rootScope.userName, "recover").then(
        function(data){
          if (data.status != "ok") wrongBounced.toRemind(data.status,"forgotPassword");
          else {
            // $state.go("newPassword");
            window.localStorage.code = data.code;
            //$rootScope.btnName = "获取验证码(60s)";
            $scope.btnName = "获取验证码60s";
            //$rootScope.isCodeClicked = false;
            $scope.isCodeClicked = false;
            var number = 60;
            var counter = $interval(function(){
              number--;
              //$rootScope.btnName = "获取验证码"+ number + "s";
              $scope.btnName = "获取验证码"+ number + "s";
              if(number <=0) {
                // $rootScope.btnName = "获取验证码";
                // $rootScope.isCodeClicked = true;
                $scope.btnName = "获取验证码";
                $scope.isCodeClicked = true;
                $interval.cancel(counter);
              }
            }, 1000);
          }
        }
      )
    }
    $scope.getSmsCode = function(){
     $rootScope.userName = $scope.user.userName.toString();
     $scope.toGetCode();
    }
    $scope.getSmsCodeAgain = function(){
      if ($rootScope.btnName == "获取验证码") $scope.toGetCode();
    }

    $scope.btnName = "获取验证码";
    $scope.data = {};
    $scope.data.eyesWay = "data/closeEyes.png";
    $scope.data.passwordType = "password";
    $scope.toShowPassword = function(){
     $scope.data.eyesWay == "data/closeEyes.png" ? $scope.data.eyesWay = 'data/openEyes.png' : $scope.data.eyesWay = 'data/closeEyes.png';
     $scope.data.passwordType == "password" ? $scope.data.passwordType = "text" : $scope.data.passwordType = "password";
    }
  }
)

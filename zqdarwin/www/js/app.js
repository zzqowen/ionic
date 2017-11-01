// Ionic Starter App

angular.module('underscore', [])
.factory('_', function() {
  return window._; // assumes underscore has already been loaded on the page
});

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
angular.module('darwin', [
  'ionic',
  'ionic-ratings',
  'darwin.globals',
  'darwin.directives',
  'darwin.controllers',
  'darwin.postCtrl',
  'darwin.newPostCtrl',
  'darwin.homeCtrl',
  'darwin.registerCtrl',
  'darwin.settingCtrl',
  'darwin.categoryCtrl',
  'darwin.listCtrl',
  'darwin.friendsCtrl',
  'darwin.contactCtrl',
  'darwin.searchCtrl',
  'darwin.pkCtrl',
  'darwin.historyCtrl',
  'darwin.userInfoCtrl',
  'darwin.tabCtrl',
  'darwin.services',
  'darwin.authService',
  'darwin.pkService',
  'darwin.postService',
  'darwin.pushServer',
  'darwin.postServer',
  'darwin.filters',
  'angularMoment',
  'underscore',
  'ngMessages',
  'ion-gallery',
  'ngCordova'
])
.config(function($sceDelegateProvider, $ionicConfigProvider, ionGalleryConfigProvider, globals) {
  $sceDelegateProvider.resourceUrlWhitelist(['**']);
  ionGalleryConfigProvider.setGalleryConfig({
    action_label: '关闭',
    template_gallery: 'gallery.html',
    template_slider: 'slider.html',
    toggle: false,
    row_size: globals.maxPhotos,
    fixed_row_size: true
  });
  $ionicConfigProvider.platform.ios.tabs.style('standard');
  $ionicConfigProvider.platform.ios.tabs.position('bottom');
  $ionicConfigProvider.platform.android.tabs.style('standard');
  $ionicConfigProvider.platform.android.tabs.position('standard');
  $ionicConfigProvider.platform.ios.navBar.alignTitle('center');
  $ionicConfigProvider.platform.android.navBar.alignTitle('left');
  $ionicConfigProvider.platform.ios.backButton.previousTitleText('').icon('ion-ios-arrow-thin-left');
  $ionicConfigProvider.platform.android.backButton.previousTitleText('').icon('ion-android-arrow-back');
  $ionicConfigProvider.platform.ios.views.transition('ios');
  $ionicConfigProvider.platform.android.views.transition('android');
  $ionicConfigProvider.scrolling.jsScrolling(true);
})

.run(function($ionicPlatform, amMoment,$cordovaFileTransfer, AuthService, PkService, globals, shareService, $rootScope, $state, PushServer, $cordovaNativeAudio, $timeout, $ionicLoading, $ionicHistory, AudioService, $ionicPopup, $ionicViewSwitcher, $cordovaPushV5) {

  amMoment.changeLocale('zh-cn');

  $ionicPlatform.on("deviceready", function(){
    if ($cordovaNativeAudio) $cordovaNativeAudio.preloadSimple('msg', 'audio/msg.mp3');

    if (AuthService.isFirstTime()){
      // var user = {
      //   _id: '010101010101010101010101'
      // };
      // AuthService.login(user, true).then(function(user) {
      //   console.log(user);
      //   $state.go('tab.home', {_id: '010101010101010101010101'});
      // });
      $state.go("walkthrough");
    }
    else{
      AuthService.userIsLoggedIn().then(function(valid){
        if (!valid) {
          var user = {
            _id: '010101010101010101010101'
          };
          AuthService.login(user, true).then(function(user) {
            console.log(user);
            $state.go('tab.home', {_id: '010101010101010101010101'});
          });
        }
        $state.go("tab.home");
        shareService.checkClipboard();
      });
    }

    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      cordova.plugins.Keyboard.disableScroll(true);
    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }

    $timeout(function(){
      AuthService.theLatestVersion().then(function(data){
        $timeout(function () {
          cordova.getAppVersion(function(version) {
            if (data.indexOf(version) == "-1") {
              var confirmPopup = $ionicPopup.confirm({
                template: "你的版本太低，请更新!",
                cancelText: '取消',
                okText: '确认',
                cssClass: 'confirm'
              });
              confirmPopup.then(function(res) {
                //if (res) window.open('http://www.aihuawen.com', '_system', 'location=yes');
                if (res){
                  if (ionic.Platform.isAndroid()) {
                    $ionicLoading.show({
                        template: "正在更新：0%"
                    });
                    console.log(cordova.file);
                    window.requestFileSystem(LocalFileSystem.PERSISTENT,0,function(fileSystem) {
                      console.log(fileSystem);
                      var url = "http://www.aihuawen.com/download/darwin.apk";
                      var targetPath = cordova.file.dataDirectory + "darwin.apk";
                      console.log(targetPath);
                      var trustHosts = true
                      var options = {};
                      $timeout(function(){
                        $cordovaFileTransfer.download(url, targetPath, options, trustHosts).then(function (result) {
                            console.log(result);
                            $timeout(function(){
                              cordova.plugins.fileOpener2.open(
                                  targetPath.replace('file://', ''), 
                                  'application/vnd.android.package-archive',
                                  {
                                    error: function(){
                                      console.log('安装失败');
                                    },
                                    success: function(){
                                      console.log('安装成功');
                                    }
                                  }
                              );
                            }, 500);

                            // $cordovaFileOpener2.open(targetPath, 'application/vnd.android.package-archive'
                            // ).then(function () {
                            //     //ionic.Platform.exitApp();
                            // }, function (err) {

                            // });
                            $ionicLoading.hide();
                        }, function (err) {
                            alert('下载失败');
                        }, function (progress) {
                            $timeout(function () {
                                var downloadProgress = (progress.loaded / progress.total) * 100;
                                $ionicLoading.show({
                                    template: "正在更新: " + Math.floor(downloadProgress) + "%"
                                });
                                // if (downloadProgress > 99) {
                                //     $ionicLoading.hide();
                                // }
                            })
                        });
                      }, 1000);
                    });
                  } else {
                    window.open('https://itunes.apple.com/cn/app/qq/id1202605978', '_system', 'location=yes');
                  }
                  // window.open('http://www.aihuawen.com/download/darwin.apk', '_system', 'location=yes');
                  // ionic.Platform.exitApp();
                } else {
                  ionic.Platform.exitApp();
                }
              });
            }
          })
        }, 500)
      });
    }, 500);

    IonicDeeplink.route(
      {
        '/post/:postId': { target: 'post', parent: 'home' },
        '/user/:userId': { target: 'userInfo', parent: 'home' },
        '/invite/:userId': { target: 'login'}
      },
      function(match) {
        $timeout(function() {
          if (match.$route.target == 'login'){
            console.debug("user is invited by id", match.$args.userId);
            window.localStorage.invitedBy = match.$args.userId;
          }
          if (!match.$route.parent) return $state.go(match.$route.target, match.$args);
          $state.go(match.$route.parent);
          $timeout(function(){
            $state.go(match.$route.target, match.$args);
          }, 500);
        });
      },
      function(nomatch) {
        console.warn(nomatch);
      }
    );
  });

  $ionicPlatform.on("resume", function(){
    if (AuthService.isFirstTime() && (AuthService.source!= "wx") && (AuthService.source != "qq")){
      //$state.go("login");
      var user = {
        _id: '010101010101010101010101'
      };
      // AuthService.login(user, true).then(function(user) {
      //   console.log(user);
      //   $state.go('tab.home', {_id: '010101010101010101010101'});
      // });
      $state.go('tab.home');
    }
    else{
      AuthService.userIsLoggedIn().then(function(valid){
        if (!valid) {
          var user = {
            _id: '010101010101010101010101'
          };
          // AuthService.login(user, true).then(function(user) {
          //   console.log(user);
          //   $state.go('tab.home', {_id: '010101010101010101010101'});
          // });
          $state.go('tab.home');
        }
        if (ionic.Platform.isIOS()) {
          $cordovaPushV5.setBadgeNumber(0);
        } 
        shareService.checkClipboard();
      });
    }
  });

  $ionicPlatform.registerBackButtonAction(function(event) {
    if ( $state.current.name.slice(0,4) != "tab." && $state.current.name != "login") {
      $ionicViewSwitcher.nextDirection("back");
      $ionicHistory.goBack();
    } else {
      if ($rootScope.backButtonPressedOnceToExit) return ionic.Platform.exitApp();
      $rootScope.backButtonPressedOnceToExit = true;
      $timeout(function () {
        $rootScope.backButtonPressedOnceToExit = false;
        $ionicLoading.show({ template: '双击退出程序', noBackdrop: true, duration: 1000 });
      }, 1000);
    }
  }, 100);

  // UI Router Authentication Check
  $rootScope.$on("$stateChangeStart", function(event, toState, toParams, fromState, fromParams){
    if (toState.data.authenticate){
      AuthService.userIsLoggedIn().then(function(valid){
        if (!valid){
          event.preventDefault();
          $state.go("phoneLogin");
        }
      });
    };
    AudioService.stop();
  });
})

.config(function($stateProvider, $urlRouterProvider, globals, $ionicConfigProvider) {
  $ionicConfigProvider.platform.ios.tabs.style('standard'); 
  $ionicConfigProvider.platform.ios.tabs.position('bottom');
  $ionicConfigProvider.platform.android.tabs.style('standard');
  $ionicConfigProvider.platform.android.tabs.position('bottom');
  
  $ionicConfigProvider.platform.ios.navBar.alignTitle('center'); 
  $ionicConfigProvider.platform.android.navBar.alignTitle('center');
  
  $ionicConfigProvider.platform.ios.backButton.previousTitleText('').icon('ion-ios-arrow-thin-left');
  $ionicConfigProvider.platform.android.backButton.previousTitleText('').icon('ion-android-arrow-back');
  
  $ionicConfigProvider.platform.ios.views.transition('ios'); 
  $ionicConfigProvider.platform.android.views.transition('android');
  $ionicConfigProvider.views.swipeBackEnabled(false);

  $stateProvider

  .state('tab', {
    url: '/tab',
    abstract: true,
    controller: 'tabCtrl',
    templateUrl: 'views/app/tabs.html'
  })

  .state('register', {
    url: "/register",
    templateUrl: "views/auth/register.html",
    controller: 'RegisterCtrl',
    data: {
      authenticate: false
    }
  })

  .state('nickname', {
    url: "/nickname",
    templateUrl: "views/auth/nickname.html",
    controller: 'RegisterCtrl',
    data: {
      authenticate: false
    }
  })

  .state('walkthrough', {
    url: "/walkthrough",
    templateUrl: "views/auth/walkthrough.html",
    controller: 'LoginCtrl',
    data: {
      authenticate: false
    }
  })

  .state('login', {
    url: "/login",
    templateUrl: "views/auth/login.html",
    controller: 'LoginCtrl',
    data: {
      authenticate: false
    }
  })

  .state('phoneLogin',{
    url:"/phoneLogin",
    templateUrl:"views/auth/phoneLogin.html",
    controller:'LoginCtrl',
    data:{
      authenticate:false
    }
  })

  .state('invite',{
    url:"/invite/:source",
    templateUrl:"views/auth/invite.html",
    controller:"InviteCtrl",
    data:{
      authenticate:false
    }
  })

  .state('shareGetCash',{
    url:"/shareGetCash/:source",
    templateUrl:"views/auth/shareGetCash.html",
    controller:"InviteCtrl",
    data:{
      authenticate:false
    }
  })

  .state('forgotPassword', {
    url: "/forgotPassword",
    templateUrl: "views/auth/forgotPassword.html",
    controller: 'ForgotPasswordCtrl',
    data: {
      authenticate: false
    }
  })

  .state('newPassword', {
    url: "/newPassword",
    templateUrl: "views/auth/newPassword.html",
    controller: 'ForgotPasswordCtrl',
    data: {
      authenticate: false
    }
  })

  .state('tab.home', {
    url: "/home",
    params: {'_id': null},
    views: {
      'tab-home': {
        templateUrl: 'views/app/home.html',
        controller: 'HomeCtrl'
      }
    },
    data: {
      authenticate: false
    }
  })

  .state('tab.qiangdan', {
    url: "/qiangdan",
    views: {
      'tab-qiangdan': {
        templateUrl: 'views/app/home.html',
        controller: 'HomeCtrl'
      }
    },
    data: {
      authenticate: true
    }
  })

  .state('post', {
    url: "/post/:postId",
    templateUrl: "views/app/post.html",
    controller: 'PostCtrl',
    data: {
      authenticate: true
    }
  })

  .state('tab.list', {
    url: "/list",
    views: {
      'tab-list': {
        templateUrl: "views/app/list.html",
        controller: 'ListCtrl',
      }
    },
    data: {
      authenticate: true
    }
  })

  .state('tab.history', {
    url: "/history",
    views: {
      'tab-history': {
        templateUrl: 'views/app/history.html',
        controller: 'HistoryCtrl'
      }
    },
    data: {
      authenticate: true
    }
  })

  .state('newpost', {
    url: "/newpost",
    params: {'postId': null, 'pkQuestion': null, 'type': null},
    templateUrl: "views/app/newpost.html",
    controller: 'NewPostCtrl',
    data: {
      authenticate: true
    }
  })

  .state('category', {
    url: "/category/:source",
    templateUrl: "views/app/category.html",
    controller: 'CategoryCtrl',
    data: {
      authenticate: true
    }
  })

  .state('about', {
    url: "/about",
    templateUrl: "views/app/about.html",
    controller: 'SettingCtrl',
    data: {
      authenticate: false
    }
  })

  .state('tab.account', {
    url: "/account",
    views: {
      'tab-account': {
        templateUrl: "views/app/account.html",
        controller: 'SettingCtrl',
      }
    },
    data: {
      authenticate: true
    }
  })

  .state('terms', {
    url: "/terms",
    templateUrl: "views/common/terms.html",
    controller: 'SettingCtrl',
    data: {
      authenticate: true
    }
  })

  .state('settings', {
    url: "/account/settings",
    templateUrl: "views/app/settings.html",
    controller: 'SettingCtrl',
    data: {
      authenticate: true
    }
  })

  .state('personalDetails', {
    url: "/personalDetails",
    templateUrl: "views/app/personalDetails.html",
    controller: 'SettingCtrl',
    data: {
      authenticate: true
    }
  })

  .state('change_password', {
    url: "/account/change_password",
    templateUrl: "views/app/changePassword.html",
    controller: 'SettingCtrl',
    data: {
      authenticate: true
    }
  })

  .state('purchase', {
    url: "/purchase",
    templateUrl: "views/app/purchase.html",
    controller: 'SettingCtrl',
    data: {
      authenticate: true
    }
  })

  .state('honorRoll', {
    url: "/honorRoll",
    templateUrl: "views/app/honorRoll.html",
    controller: 'SettingCtrl',
    data: {
      authenticate: true
    }
  })

  .state('tab.friends', {
    url: "/friends",
    views: {
      'tab-friends': {
        templateUrl: "views/app/friends.html",
        controller: 'friendsCtrl',
      }
    },

    data: {
      authenticate: true
    }
  })

  .state('tab.pk', {
    url: "/pk",
    views: {
      'tab-pk': {
        templateUrl: "views/app/pk.html",
        controller: 'pkCtrl',
      }
    },
    data: {
      authenticate: true
    }
  })

  .state('pkStart', {
    url: "/pkStart",
    templateUrl: "views/app/pkStart.html",
    controller: 'pkCtrl',
    data: {
      authenticate: true
    }
  })
  
  .state('userInfo', {
    url: "/userInfo/:id",
    templateUrl: "views/app/userInfo.html",
    controller: 'userInfoCtrl',
    data: {
      authenticate: true
    }
  })

  .state('chatDetails', {
    url: "/chatDetails",
    templateUrl: "views/app/chatDetails.html",
    controller: 'SettingCtrl',
    data: {
      authenticate: true
    }
  })

  .state('pkWaiting', {
    url: "/pkWaiting/:way",
    templateUrl: "views/app/pkWaiting.html",
    controller: 'pkCtrl',
    data: {
      authenticate: true
    }
  })

  .state('search', {
    url: "/search",
    templateUrl: "views/app/search.html",
    controller: 'searchCtrl',
    data: {
      authenticate: true
    }
  })
  
  .state('pkResult', {
    url: "/pkResult/:way",
    templateUrl: "views/app/pkResult.html",
    controller: 'pkCtrl',
    data: {
      authenticate: true
    }
  })

  .state('toDraw', {
    url: "/toDraw",
    templateUrl: "views/app/toDraw.html",
    controller: 'pkCtrl',
    data: {
      authenticate: true
    }
  })

  .state('pkHonorRoll', {
    url: "/pkHonorRoll",
    templateUrl: "views/app/pkHonorRoll.html",
    controller: 'pkCtrl',
    data: {
      authenticate: true
    }
  })

  .state('contacts', {
    url: "/contacts/:type",
    templateUrl: "views/app/contacts.html",
    controller: 'contactCtrl',
    data: {
      authenticate: true
    }
  })

  .state('isMyself', {
    url: "/isMyself",
    templateUrl: "views/app/isMyself.html",
    controller: 'SettingCtrl',
    data: {
      authenticate: true
    }
  })

  // .state('feedback', {
  //   url: "/feedback/:source",
  //   templateUrl: "views/app/feedback.html",
  //   controller: 'SettingCtrl',
  //   data: {
  //     authenticate: true
  //   }
  // })
  .state('feedback', {
    url: "/feedback/:source",
    templateUrl: "views/app/feedback.html",
    controller: 'NewPostCtrl',
    data: {
      authenticate: true
    }
  })

  .state('redPacket', {
    url: "/redPacket",
    templateUrl: "views/app/redPacket.html",
    controller: 'SettingCtrl',
    data: {
      authenticate: true
    }
  })

  .state('subscribe', {
    url: "/subscribe",
    templateUrl: "views/app/subscribe.html",
    controller: 'SettingCtrl',
    data: {
      authenticate: true
    }
  })

  .state('aboutDarwin', {
    url: "/aboutDarwin",
    templateUrl: "views/app/aboutDarwin.html",
    controller: 'SettingCtrl',
    data: {
      authenticate: true
    }
  })

  .state('creditScore', {
    url: "/creditScore",
    templateUrl: "views/app/creditScore.html",
    controller: 'SettingCtrl',
    data: {
      authenticate: true
    }
  })

  .state('accessToCredit', {
    url: "/accessToCredit",
    templateUrl: "views/app/accessToCredit.html",
    controller: 'SettingCtrl',
    data: {
      authenticate: true
    }
  })
  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise("phoneLogin");
});

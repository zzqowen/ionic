angular.module('darwin.services', [])

.service('HttpHelper', function ($http, $q, $cordovaFileTransfer, globals, util, store){
  this.get = function(url){
    return $http.get(url, {timeout: globals.httpTimeout})
    .then(function (result) {
      return result.data;
    })
  };

  this.post = function(url, obj){
    return $http.post(url, obj, {timeout: globals.httpTimeout})
    .then(function (result) {
      return result.data;
    })
  };

  this.patch = function(url, obj){
    return $http.patch(url, obj, {timeout: globals.httpTimeout})
    .then(function(result){
      return result.data;
    })
  };

  this.upload = function (path) {
    var fileName = util.getFileName(path);
    var uploadUrl = util.getApiUrl('/upload');
    return $cordovaFileTransfer.upload(uploadUrl, path, {"fileName": fileName});
  };
})

.service('util', function(globals, store) {
  var self = this;
  var user = store.getUser();

  this.getApiUrl = function (relUrl) {
    return globals.server.get() + '/api' + relUrl + (relUrl.indexOf('?') >= 0 ? '&' : '?') + 'cookie=' + user.cookie;
  }

  this.getOpenUrl = function (relUrl) {
    return globals.server.get() + relUrl;
  }

  this.getMediaUrl = function (src) {
    console.assert(src);
    if (src.indexOf('http') == 0 || src.indexOf('localhost') != -1) return src;
    return self.getOpenUrl('/file/'+ src);
  }

  this.getThumbnailUrl = function (src) {
    return src.indexOf('http') == 0 ? src : self.getOpenUrl('/file/thumb_'+ src);
  }

  this.getFileName = function(path) {
    return path.split('/').pop().split('?')[0];
  };

  this.getCdvTmpFilePath = function(ext) {
    return "cdvfile://localhost/temporary/" + Date.now() + "." + ext;
  };

  // unhandled exception
  window.onerror = function(msg, url, line, col, error) {
    var extra = !col ? '' : 'column: ' + col;
    extra += !error ? '' : 'error: ' + error;
    console.error(msg, url, line, extra);
    return true;
  };
})
.factory('ImageSlider', function ($ionicModal, $ionicScrollDelegate, $rootScope, $timeout, util) {
  var showImage = function (items, index, parentScope, $event, home) {
    var style = document.createElement('style');
    console.debug($event);
    var left = $event.clientX - $event.offsetX;
    var top = $event.clientY - $event.offsetY;
    console.log(left+'````'+top);
    console.log(index);
    var _left = $event
    var width = $event.target.offsetWidth;
    var height = $event.target.offsetHeight;
    var viewWidth = document.getElementsByTagName('ion-nav-view')[0].offsetWidth;
    var viewHeight = document.getElementsByTagName('ion-nav-view')[0].offsetHeight;

    style.innerHTML = '.slide-in-scale {transform: translate('+(left+width/2-viewWidth/2)+'px, '+(top+height/2-viewHeight/2)+'px) scale('+width/viewWidth+', '+height/viewHeight+');opacity: 0;}'+
      '.slide-in-scale.ng-enter, .slide-in-scale > .ng-enter {-webkit-transition: all ease-in-out 400ms;transition: all ease-in-out 400ms;}'+
      '.slide-in-scale.ng-enter-active, .slide-in-scale > .ng-enter-active {transform: translate(0) scale(1);opacity: 1;}'+ 
      '.slide-in-scale.ng-leave, .slide-in-scale > .ng-leave {-webkit-transition: all ease 400ms;transition: all ease 400ms;}';

    document.getElementsByTagName('html')[0].insertBefore(style, document.getElementsByTagName('body')[0]);

    var scope = parentScope.$new();
    scope.options = {
      effect: 'flip',
      speed: 500,
      pagination: true,
      loop: false,
      initialSlide: index,
    };

    scope.selected = index;
    scope.slider = {};
    scope.ionGalleryItems = items.map(function(x){ return {src: x}; });
    console.log(scope.ionGalleryItems);
    $ionicModal.fromTemplateUrl('views/app/slider.html', {
      scope: scope,
      animation: 'slide-in-scale'
    }).then(function(modal) {
      console.debug(modal.el);
      scope.close = function (index) {
        if(index != scope.selected && home == "home"){
          left = index * width;
        }else if(index != scope.selected && home == undefined){
          width = 20;
          viewWidth = 100;
          height = 20;
          viewHeight = 100;
          left = -width/2+viewWidth/2;
          top = -height/2+viewHeight/2
        }

        style.innerHTML = '.slide-in-scale {transform: translate('+(left+width/2-viewWidth/2)+'px, '+(top+height/2-viewHeight/2)+'px) scale('+width/viewWidth+', '+height/viewHeight+');opacity: 0;}'+
        '.slide-in-scale.ng-enter, .slide-in-scale > .ng-enter {-webkit-transition: all ease-in-out 400ms;transition: all ease-in-out 400ms;}'+
        '.slide-in-scale.ng-enter-active, .slide-in-scale > .ng-enter-active {transform: translate(0) scale(1);opacity: 1;}'+ 
        '.slide-in-scale.ng-leave, .slide-in-scale > .ng-leave {-webkit-transition: all ease 400ms;transition: all ease 400ms;}';

        modal.remove();
        $timeout(function(){
          angular.element(document.querySelector('html')).find('style').remove();
        },400)
      };
      modal.show();
    });
  };

  $rootScope.showPhotoFiles = function (photoFiles, index, parentScope, $event, home) {
    $event.stopPropagation();
    var items = photoFiles.map(function(x){ return util.getMediaUrl(x.src); });
    showImage(items, index, parentScope, $event, home);
  };

  return {
      show: showImage
  };
})
.service('AudioService', function ($rootScope, util) {

  console.log('AudioService.ctor');

  var media;

  /*
  .stop previous playing with successCallback if any
  */
  this.playFile = function (file, successCallback, errorCallback) {
    console.log('playFile', file);
    if (media) {
      // TBD: does this trigger successCallback over previous play?
      media.stop();
    }

    var mediaFile = util.getMediaUrl(file);
    media = new Media(mediaFile, function () {
      media = null;
      successCallback();
    }, function (err) {
      media = null;
      errorCallback(err);
    });
    media.play();
  };

  this.stop = function () {
    if (media) {
      media.stop();
      media = null;
    }
  }
})

.service('store', function (globals, $ionicPlatform) {
  var user = {};
  if (localStorage.user) user = JSON.parse(localStorage.user);

  var config = {
    isWxInstalled: false,
    isQQInstalled: false,
  };

  $ionicPlatform.ready(function(){
    Wechat.isInstalled(function(installed){
      console.log("Wechat installed: " + (installed ? "Yes" : "No"));
      config.isWxInstalled = installed;
    });
    QQSDK.checkClientInstalled(function () {
      console.log("QQ installed");
      config.isQQInstalled = true;
    }, function () {
      console.log("QQ not installed");
      config.isQQInstalled = false;
    });
  });

  this.setUser = function () {
    user.score = user.score - 5;
  }

  this.getUser = function () {
    return user;
  };

  this.updateUser = function (value, replace) {
    globals.copy(value, user, replace);
    localStorage.user = JSON.stringify(user);
  };

  this.getConfig = function () {
    return config;
  };
})

.service('shareService', function($timeout, $rootScope, $cordovaClipboard, $state, $ionicModal, $q, store, globals, $ionicLoading, AuthService, util, $stateParams, $ionicBackdrop, $ionicPopup, $ionicPlatform, PkService) {
  var self = this;
  var everyCtrlScope;

  this.getCtrlScope = function(scope){
    everyCtrlScope = scope.$new();
    scope.cancel = function(){
      everyCtrlScope.pkObj.pkWaitingEnterAnimation = false;
      PkService.pkCancelMatch().then(function(data){
      });
      $timeout(function(){
        everyCtrlScope.pkObj.ready = false;
        PkService.closeWaitingPopup();
      }, 1000)
    };

    console.log(scope.pkObj);
    scope.cancelInvite = function(){
      everyCtrlScope.pkObj.pkWaitingEnterAnimation = false;
      $timeout(function(){
        everyCtrlScope.pkObj.ready = false;
        PkService.closeWaitingPopup();
      }, 1000)
      // TODO: why not use pkCancelMatch? there is no need to define a new api
      PkService.pkInviteCancel().then(function(data){
        console.log(data);
      });
    };
  };

  this.checkClipboard = function(){
    try{
      $cordovaClipboard.paste().then(function(result){
        console.debug("paste from clipboard", result);
        if (/darwin:\/\/post\/[0-9a-z]{24}/i.test(result)){
          $cordovaClipboard.copy("");
          var postId = result.split('/').pop();
          console.debug("navigating to post:", postId);
          $state.go('post', {postId: postId});
        }
        else if (/darwin:\/\/user\/[0-9a-z]{24}/i.test(result)){
          $cordovaClipboard.copy("");
          var userId = result.split('/').pop();
          console.debug("navigating to user:", userId);
          $state.go('userInfo', {id: userId});
        }
        else if (/darwin:\/\/invite\/[0-9]{4,6}/i.test(result)){
          $cordovaClipboard.copy("");
          var userId = result.split('/').pop();
          console.debug("user is invited by", userId);
          window.localStorage.invitedBy = userId;
        }
        else if (/darwin:\/\/pkInvite\/[0-9a-z]{24}\?type=[0-9]+/i.test(result)){
          $cordovaClipboard.copy("");
          console.log(result);
          var type = globals.pkType[Number(result.split('?').pop().slice(5))].value;
          var userId = result.split('/').pop().split("?")[0];
          console.debug("user is invited to pk by", userId);
          var obj = {type: type, _id: userId};

          PkService.pkInviteFriends(obj).then(function(data){
            console.log(data);
            if (data.status == 'ok'){
              everyCtrlScope.pkObj.invite = false;
              PkService.pkWaitingPopup(everyCtrlScope);
              everyCtrlScope.pkObj.pkWaitingEnterAnimation = true;
              everyCtrlScope.pkObj.ready = true;
            } else {
              PkService.closeBackButtonAction();
              $ionicLoading.show({ template: data.status, noBackdrop: true, duration: 1000 });
            }
          });
        }
      });
    }
    catch(e){
      console.warn(e);
    }
  };

  var share = function(content){
    console.debug(content);
    console.assert(content);
    if (content.target == 'wx') return shareWx(content);
    else if (content.target == "qq") return shareQQ(content);
    else return shareWb(content);
  };

  var shareQQ = function(content){
    var deferred = $q.defer();
    QQSDK.shareNews(
      function () { deferred.resolve(true); },
      function (error) { deferred.reject(error); },
      {
        scene: (content.scene == globals.share.friends) ? QQSDK.Scene.QQ : QQSDK.Scene.QQZone,
        url: content.url,
        title: content.title,
        description: content.description,
        image: content.image,
      }
    );
    return deferred.promise;
  };

  var shareWx = function(content){
    var deferred = $q.defer();
    Wechat.share(
      {
        message: {
          title: content.title,
          description: content.description,
          thumb: content.image,
          media: {
            type: Wechat.Type.LINK,
            webpageUrl: content.url,
          }
        },
        scene: (content.scene == globals.share.friends) ? Wechat.Scene.SESSION : Wechat.Scene.TIMELINE
      },
      function () { deferred.resolve(true); },
      function (error) { deferred.reject(error); }
    );
    return deferred.promise;
  };

  var shareWb = function(content){
    console.log(content);
    var deferred = $q.defer();
    WeiboSDK.shareToWeibo(
      function () { deferred.resolve(true); },
      function (error) { deferred.reject(error); },
      {
        url: content.url,
        title: content.title,
        description: content.description,
        image: content.image,
      }
    );
    return deferred.promise;
  };

  var sharePost = function(post, scene, target){
    var user = store.getUser();
    var description = "";
    if (post.content) description = post.content;
    else if (post.audioFiles.length > 0) description = "这里有一条语音";
    else description = '这里有一张照片';
    var content = {
      scene: scene,
      target: target,
      url: globals.server.get() + '/post/' + post._id,
      title: user.displayName + "分享了一个答尔文提问",
      description: description,
      image: post.photoFiles.length > 0 ? util.getThumbnailUrl(post.photoFiles[0].src) : "http://www.aihuawen.com/images/tup.png",
    };
    share(content).then(
      function(){ $ionicLoading.show({ template: "分享成功！", noBackdrop: true, duration: 1000 });},
      // function(error){ $ionicLoading.show({ template: "分享失败！" + error, noBackdrop: true, duration: 1000 });}
      function(error){ $ionicLoading.show({ template: "分享失败！" , noBackdrop: true, duration: 1000 });}
    );
  };

  var shareUser = function(user, scene, target){
    if (!user._id) user._id = $stateParams.id;
    var content = {
      scene: scene,
      url: globals.server.get() + '/user/' + user._id,
      image: user.avatar,
      target: target,
    };

    if (user._id == store.getUser()._id) {
      content.title = "我在答尔文赚生活: " + user.displayName;
      content.description = '我回答了 ' + user.summary.answered + ' 个问题';
    } else {
      content.title = "推荐一个大牛: " + user.displayName;
      content.description = '他回答了 ' + user.summary.answered + ' 个问题';
    }

    share(content).then(
      function(){ $ionicLoading.show({ template: "分享成功！", noBackdrop: true, duration: 1000 });},
      function(error){ $ionicLoading.show({ template: "分享失败！", noBackdrop: true, duration: 1000 });}
    );
  };

  var redPacketObj = {
    post: {},
    redPacket: true
  };
  var shareGetCash = function(user, scene, target){
    var user = store.getUser();
    var content = {
      scene: scene,
      url: globals.server.get() + '/invite/' + user.id,
      image: user.avatar,
      target: target,
      title: "我是" + user.displayName,
      description: "加入答尔文，领取现金红包！",
    };
    share(content).then(
      function(){
        if (user.packetRemind == undefined) {
          AuthService.changeUserInfo({packetRemind: true});
          store.updateUser({packetRemind: true}, false);
        }
        AuthService.getRedPacket().then(function(data){
          self.redHistory(data);
        });
      },
      function(error){ $ionicLoading.show({ template: "分享失败！", noBackdrop: true, duration: 1000 });}
    );
  };

  this.redHistory = function(data){
    if (data.status == 'ok') {
      redPacketObj.redPacket = true;
      self.redPacketBounced(data);
    }
  }

  var myPopup, confirmPopup, redScope;
  var redHistory = {
    details: [],
    sumMoney: {sum: 0}
  };

  this.getScope = function(parentScope){
    redScope = parentScope;
  };

  this.updateRedHistory = function(data){
    data.sumMoney ? redHistory.sumMoney.sum = data.sumMoney : redHistory.sumMoney.sum = 0;
    data.details ?  redHistory.details = data.details : redHistory.details = [];
  };

  this.redPacketBounced = function(data){
    redScope.redPacket = true;
    redScope.hasMore = true;
    confirmPopup = $ionicPopup.show({
      templateUrl: 'views/common/red-packet.html',
      cssClass: 'red-packet',
      scope: redScope,
      buttons: [
        {
          text: ' ',
          type: 'button-positive',
          onTap: function(e) {
            var toGetpacketCanShu = data;
            delete toGetpacketCanShu.status;
            AuthService.toGetRedPacket(toGetpacketCanShu);
            var reScope = redScope.$new(true);
            reScope.user = {};
            reScope.user.displayName = store.getUser().displayName;
            reScope.user.avatar = store.getUser().avatar;
            reScope.post = {};
            reScope.post.price = Math.floor(data.amount*100)/100;;
            reScope.redPacket = false;
            myPopup = $ionicPopup.show({
              templateUrl: 'views/common/red-packet.html',
              cssClass: 'get-red-packet',
              scope: reScope
            });
            reScope.close = function(){
              toGetpacketCanShu.received = true;
              redHistory.details.push(toGetpacketCanShu);
              redHistory.sumMoney.sum = Math.floor((redHistory.sumMoney.sum + Number(toGetpacketCanShu.amount))*100)/100;
              myPopup.close();
              var user = store.getUser();
              store.updateUser({credit: user.credit + Math.floor(Number(toGetpacketCanShu.amount)*100)/100}, false);
            };
          }
        }
      ]
    });
  }

  this.returnRedHistory = function(){
    return redHistory;
  }
  this.closeRedPacket = function(){
    myPopup.close();
  }
  
  this.getRedPacketObj = function(){
    return redPacketObj;
  }

  this.shareInvitePk = function(scene, target, type){
    var user = store.getUser();
    var content = {
      scene: scene,
      url: globals.server.get() + '/pkInvite/' + user._id + '?type=' + type,
      image: user.avatar,
      target: target,
      title: '我是' + user.displayName,
      description: '我在答尔文等你，一起来pk！',
    };
    share(content).then(
      function(){ $ionicLoading.show({ template: "分享成功!",noBackdrop: true,duration: 1000});}
    );
  };

  this.showShareTargets = function(parentScope, contentType, content) {
    var scope = parentScope.$new(true);
    scope.close = function(){
      if (scope.modal) scope.modal.remove();
      $ionicBackdrop.release();
    };
    scope.share = function(scene, target){
      scope.close();
      if (contentType == 'post') sharePost(content, scene, target);
      else if(contentType == 'getCash') shareGetCash(content, scene, target);
      else shareUser(content, scene, target);
    };

    $ionicModal.fromTemplateUrl('views/common/share.html',{
      scope: scope,
      animation:'slide-in-up'
    }).then(function (modal) {
      scope.modal = modal;
      scope.modal.show();
      $ionicBackdrop.retain();
    });

    var aa = function(){
      scope.releaseBackdrop();
    };

    scope.releaseBackdrop = function() {
      scope.modal.remove();
      $ionicBackdrop.release();
      $ionicPlatform.offHardwareBackButton(aa);
    };

    $ionicPlatform.onHardwareBackButton(aa);
  };
})

.service('wrongBounced',function($ionicPopup, $state){
  this.toRemind = function(err,togo){
    var confirmPopup = $ionicPopup.alert({
      template: err,
      okText: '确认',
      cssClass: 'confirm'
    });
    confirmPopup.then(function(res) {
      if (res && togo) $state.go(togo);
    });
  }
})

.service('remindBounced',function($ionicModal, $state){
  this.toRemind = function($scope, purpose){
    var confirmModal = $ionicModal.fromTemplateUrl('views/app/remindBounced.html',{
        scope: $scope,
        animation:'superScaleIn'
      }).then(function(modal){
        $scope.reminderModal = modal;
        $scope.closeModal = function(result) {
          $scope.reminderModal.remove();
          if (!result) return;
          purpose();
        };
        $scope.reminderModal.show();
      });
  }
})

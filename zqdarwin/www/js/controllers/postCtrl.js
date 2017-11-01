angular.module('darwin.postCtrl', ['ionic'])
.controller('PostCtrl', function($scope, PkService, $ionicLoading, $ionicModal, $ionicHistory, $stateParams, $state, $timeout, $filter, PostService, AuthService, $ionicScrollDelegate, $rootScope, globals, ImageSlider, HttpHelper, $ionicViewSwitcher, util, store, $ionicPopup,$interval, $cordovaNativeAudio, $ionicActionSheet, shareService, $q, $ionicBackdrop, wrongBounced) {

  $scope._id = $stateParams.postId;
  $scope.post = PostService.getPost($scope._id, false);
  $scope.ready = !!$scope.post;
  $scope.unit = globals.currencyUnit;
  $scope.myScope = $scope;
  $scope.user = store.getUser();
  $scope.isMine = AuthService.isMine($scope.post);
  $scope.accepted = false;
  $scope.lists = $rootScope.lists;
  $scope.grab = true;
  $scope.choosed = false;
  $scope.showCancel = false;
  $scope.supplementShow = false;
  $scope.supplementText = "";
  $scope.qid = null;
  $scope.ctrl = $scope;
  $scope.data = {};
  $scope.data.closeRead = false;

  $scope.pushMessage = PostService.getPushMessage();

  $scope.pkObj = PkService.getPkObj();
  shareService.getCtrlScope($scope);

  $scope.confirmAccept = function() {
     $scope.showSatisfy = $ionicPopup.show({
      cssClass: 'confirm',
      scope: $scope,
      template: '<span>再次点击满意，将完成订单</span><label><input type="checkbox" ng-true-value="true" ng-false-value="false" ng-model= "data.closeRead"/><em>不许偷看</em></label>',
      buttons: [
        {
          text: '取消',
          type: 'button-default'
        },
        {
          text: '确认',
          type: 'button-positive',
          onTap: function(e) {
            if(!$scope.data.closeRead) PostService.canRead($scope.post._id);
            $scope.accepted = true;
            $scope.acceptAnswer();
            $scope.satisfaction = true;
          }
        }
      ]
    });
  };

  $scope.showAlert = function() {
    $scope.alertPopup = $ionicPopup.show({
      scope: $scope,
      cssClass: 'like',
      templateUrl: 'views/common/confirm.html',
      buttons: [
        {
          text: '喜欢',
          type: 'button-positive',
          onTap: function(e) {
            $scope.acceptAnswer();
            console.log('accept answer');
          }
        }
      ]
    });

    $scope.closeAlert = function() {
      $scope.alertPopup.close();
    }

    $scope.endTime = new Date();
    var end = $filter('date')($scope.endTime, 'yyyy/MM/dd HH:mm:ss');
    var expireEndTime = $filter('date')($scope.post.expireDate, 'yyyy/MM/dd HH:mm:ss');
    $scope.timeLong = 30 - Math.round((new Date(expireEndTime) - new Date(end))/(60*1000));

  };

  $scope.accept = function() {
    $scope.redPacket = true;
    $scope.confirmPopup = $ionicPopup.show({
      scope: $scope,
      templateUrl: 'views/common/red-packet.html',
      cssClass: 'red-packet',
      buttons: [
        {
          text: ' ',
          type: 'button-positive',
          onTap: function(e) {
            $scope.showPopup();
          }
        }
      ]
    });
  };

    $scope.ifUnread = function(postId){
      var ary = $scope.pushMessage.history.question.concat($scope.pushMessage.history.answer);
      return ary.indexOf(postId) + 1;
    }

    $scope.read = function(postId){
      var ifUnread = $scope.ifUnread(postId);
      var ary = [];
      if(ifUnread){
        if ($scope.user._id == $scope.post.author._id) {
          console.log('que');
          ary = $scope.pushMessage.history.question;
        }else{
          console.log('ans');
          ary = $scope.pushMessage.history.answer;
        }
        for (var i=0; i<ary.length; i++){
            if (ary[i] == postId) ary.splice(i,1);
        }
      }
      console.log($scope.pushMessage);
    }

  $scope.showPopup = function() {
    $scope.redPacket = false;
    var myPopup = $ionicPopup.show({
      scope: $scope,
      templateUrl: 'views/common/red-packet.html',
      cssClass: 'get-red-packet'
    });

    $scope.close = function(){
      $scope.acceptAnswer();
      myPopup.close();
    }
 };

  $scope.shortenTitle = function(content){
    if (!content) return "提问内容";
    return content.substr(0,10);
  };

  $scope.new_comment_id = "";
  $scope.comment = {content:''};
  $scope.messages = [];

  var recording = {
    name: 'cdvfile://localhost/persistent/recording.m4a',
    media: null,
    duration: 0
  };
  $scope.isText = true;
  $scope.isRecording = false;

  $scope.messageBoxVisible = false;

  var messageBoxShow = function (text, duration)  {
    $scope.messageBoxText = text;
    $scope.messageBoxVisible = true;

    if (duration > 0) {
      $timeout(function () {
        $scope.messageBoxVisible = false;
      }, duration);
    }
  };

  var messageBoxHide = function () {
    $scope.messageBoxVisible = false;
  };

  var messageBoxTimer = function () {
    if ($scope.isRecording) {
      var duration = Math.floor((Date.now() - $scope.startMilliSec)/1000);
      messageBoxShow(duration + "'", 0);
      $timeout(messageBoxTimer, 500);
    }
  };

  $ionicLoading.hide();

  $scope.showUserAccount = function($event){
    $event.stopPropagation();
    $state.go('account');
  };

  $scope.startRecord = function () {
    if ($scope.isRecording) {
      return;
    }

    stopCurrentPlayMessage();

    $scope.isRecording = true;
    recording.name = util.getCdvTmpFilePath('m4a');
    console.log('startRecord', recording.name);
    $scope.startMilliSec = Date.now();
    messageBoxTimer();

    recording.media = new Media(recording.name, function () {
      console.log('rec success');
    }, function (err) {
      console.log(err);
    });

    recording.media.startRecordWithCompression({SampleRate:16000});
  };

  $scope.stopRecord = function () {
    console.log('stopRecord');
    if (!$scope.isRecording) {
      return;
    };

    recording.media.stopRecord();
    recording.duration = Math.ceil((Date.now() - $scope.startMilliSec)/1000);
    $scope.isRecording = false;

    messageBoxHide();
    var dur = (Date.now() - $scope.startMilliSec)/1000;
      if (dur < 1)
        return $timeout(function(){
          $ionicLoading.show({
            template: '录音时间过短', noBackdrop: true, duration: 1000
          })
        }, 300);

    console.log('start upload');
    HttpHelper.upload(recording.name)
    .then(function(result) {
      console.log("upload success: ", result.response);
      var audioFileName = util.getFileName(result.response);
      $scope.submitComment('audioFiles', [{src: audioFileName, dur: recording.duration}]);
    })
    .catch(function(err) {
      console.log('upload error: %j', err);
    });
  };

  $scope.addPhoto = function (isCamera) {
    navigator.camera.getPicture(
      function (filePath){
        HttpHelper.upload(filePath)
        .then(function(result) {
          console.log('upload success: ${result.response}');
          $scope.submitComment('photoFiles', [util.getFileName(result.response)]);
        }, function(err) {
          console.log('upload error: %j', err);
        });
      },
      function (error){
        console.log(error);
      },
      {
        quality: globals.photoQuality,
        targetWidth: globals.photoTargetWidth,
        targetHeight: globals.photoTargetHeight,
        destinationType: Camera.DestinationType.FILE_URI,
        sourceType: isCamera ? Camera.PictureSourceType.CAMERA : Camera.PictureSourceType.PHOTOLIBRARY,
        popoverOptions: new CameraPopoverOptions(300, 300, 100, 100, Camera.PopoverArrowDirection.ARROW_ANY)
      }
    );
  };

  $scope.addSupplement = function(){
    var text = $scope.supplementText;
    console.log(text);
    $scope.supplementText = "";
    var post_id = $scope.post._id;
    var postUser_id = $scope.post.author._id;
    var qid = $scope.qid;
    $scope.qid = null;
    PostService.postSupplement(post_id, postUser_id, text, qid);
    if (qid){
      function findSupplement(element) { return element.qid == qid };
      var index = $scope.supplementList.findIndex(findSupplement);
      $scope.supplementList[index].acontent = text;
    }else{
      $scope.supplementList.push({qcontent : text});
      ($scope.ifMyCare) ? $scope.switchNum = 0 : $scope.switchNum = 1;
      $scope.ifMyCare = 1;
    }
    console.log($scope.supplementList);
    console.log($scope.qid);
  };

  $scope.postSupplement = function($event) {
    if ($event.keyCode == 13 && $scope.supplementText != '') {
      $scope.addSupplement();
      cordova.plugins.Keyboard.close();
    };
  };

  $scope.getQid = function(qid){
    $scope.qid = qid;
  }

  var getSupplement =function(){
    PostService.getSupplement($scope._id)
    .then(function(data){
      $scope.supplementList = data;
    }).finally(function(error) {
      $scope.$broadcast('scroll.infiniteScrollComplete');
      $scope.$broadcast('scroll.refreshComplete');
    });
  }

  var sendMessages = function() {
    var text = $scope.comment.content;
    $scope.comment.content = "";
    $scope.submitComment('content', text);
  };

  $scope.addText = function ($event) {
    if ($event.keyCode == 13 && $scope.comment.content != '') {
      sendMessages();
    };
  };

  $scope.send = function() {
    if ($scope.comment.content != '') {
      sendMessages();
    }
  };

  $scope.submitComment = function(key, val){
    var comment = {
      isQuestion: false,
      parentId: $scope.post._id,
      content: '',
      author: {
        _id: $scope.user._id,
        displayName: $scope.user.displayName,
        avatar: $scope.user.avatar
      },
      // date: new Date(),
      comments: [],
      comment_count: 0,
      audioFiles: [],
      photoFiles: []
    };

    // update field based on media type
    comment[key] = val;

    PostService.submitComment(comment).then(function(data){
      console.log(data);
      $scope.post.comments = data.post.comments;
      updateMessages();
      $ionicLoading.hide();
      $ionicScrollDelegate.resize();
      $ionicScrollDelegate.$getByHandle('mainScroll').scrollBottom(true);
      $timeout(function(){ $ionicScrollDelegate.$getByHandle('mainScroll').scrollBottom(true);}, 400);
    });
  };

  $scope.isSelfPosted = function(){
    return AuthService.isSelfPosted($scope.post);
  };

  $scope.isSelfAnswered = function(){
    return AuthService.isSelfAnswered($scope.post);
  };

  $scope.isExpired = function(){
    return $scope.post && PostService.isExpired($scope.post);
  };

  $scope.avatar = function(post){
    return PostService.avatar(post);
  };

  $scope.canGetPaid = function () {
    var canGetPaid = $scope.post && $scope.isExpired();
    if(canGetPaid) $scope.post.status = 2;
    return canGetPaid;
  };

  $scope.isTicking = function(){
    return PostService.isTicking($scope.post);
  };

  $scope.canAnswer = function(){
    if (!$scope.post || !$scope.ready || $scope.isExpired() || !$scope.isMine) return false;
    return ($scope.post.status == globals.postState.answering || $scope.post.status == globals.postState.answered);
  };

  $scope.canGrab = function(){
    return PostService.canGrab($scope.post);
  };

  $scope.canModify = function(){
    if (!$scope.post || !$scope.ready || !$scope.isSelfPosted()) return false;
    return ($scope.post.status == globals.postState.active);
  };

  $scope.canDelete = function(){
    if (!$scope.post || !$scope.ready || !$scope.isSelfPosted()) return false;
    return ($scope.post.status == globals.postState.active);
  };

  $scope.isWaiting = function(post) {
      if (!post) return false;
      if (post.status == globals.postState.active) return true;
      return false;
    };

  $scope.canClose = function(){
    var post = $scope.post;
    var noComments = !post.comments || post.comments.length == 0;
    if (!$scope.post || !$scope.ready || !$scope.isSelfPosted() || $scope.isExpired() || noComments) return false;
    return ($scope.post.status == globals.postState.answering);

  };

  $scope.updateStatus = function(status){
    PostService.updateStatus($scope.post._id, status).then(function(data){
      if (data.status == globals.ok){
        $scope.post.status = status;
      }
    });
  };

  $scope.chooseRespondent = function(candidate){
    console.log(candidate._id);
    return PostService.chooseRespondent($scope.post._id, candidate._id)
    .then(function(data){
      if (data.status != globals.ok) return $ionicLoading.show({ template: data.status, noBackdrop: true, duration: 1000 });
      $scope.choosed = true;
      $scope.post.expert = candidate;
      $scope.post.status = globals.postState.answering;
    });
  }

  $scope.startGrab = function(){
    $scope.data = {};
    $scope.data.understood = true;
    if (window.localStorage.firstShow == undefined){
    window.localStorage.skipReminder = false;
    if (window.localStorage.skipReminder == 'true'){
      $scope.data.understood = true;
      $scope.isKnow =false;
    } else $scope.isKnow = true;
    // $scope.newArr();
    // $scope.timeRemaining = globals.timeDifference;
    // $scope.timeOut = false;
    $ionicModal.fromTemplateUrl('views/app/showReminder.html',{
      scope: $scope,
      animation:'superScaleIn'
    }).then(function(modal){
      $scope.reminderModal = modal;
      $scope.closeModal = function(result) {
        window.localStorage.skipReminder = $scope.data.understood;
        $scope.reminderModal.remove();
        if (!result) return;
        // var myDate = new Date();
        // myDate.setTime(myDate.getTime()+globals.minuteToMilliscond*$scope.timeValue);
        // PostService.newGrab($scope.post._id, $scope.post.author._id).then(function(data){
        //   $scope.post = data.post;
        // }).finally(function(error) {
        //   $scope.$broadcast('scroll.infiniteScrollComplete');
        //   $scope.$broadcast('scroll.refreshComplete');
        // });
        // if(!$scope.ifMyCare) $scope.Switch();
        // $scope.grab = false;

        // refreshTimeRemaining();
        // $scope.showCancel = true;
        // $scope.deadLine = myDate;
        $scope.startToAnswer();
        window.localStorage.firstShow = true;

      };
      $scope.reminderModal.show();
    });
     }
     else{
       $scope.startToAnswer();
     }

     if ($scope.post.startDate) {
        $scope.timeAgo = {time: new Date(new Date($scope.post.startDate).getTime() + 24*3600*1000)};
     } else {
        $scope.timeAgo = {time: new Date(new Date().getTime() + 24*3600*1000)};
     }

  };

  $scope.startToAnswer = function(){
    var myDate = new Date();
    myDate.setTime(myDate.getTime()+globals.minuteToMilliscond*$scope.timeValue);
    PostService.newGrab($scope.post._id, $scope.post.author._id).then(function(data){
      if (data.status != "ok") {
        wrongBounced.toRemind(data.message);
        return $scope.grab = true;
      }
      $scope.post = data.post;
    }).finally(function(error) {
      $scope.$broadcast('scroll.infiniteScrollComplete');
      $scope.$broadcast('scroll.refreshComplete');
    });
    // if(!$scope.ifMyCare) $scope.Switch();
    $scope.grab = false;
  }

  $scope.readAnswer = function(){
    $ionicModal.fromTemplateUrl('views/app/showPayReminder.html',{
      scope: $scope,
      animation:'superScaleIn'
    }).then(function(modal){
      $scope.reminderModal = modal;
      $scope.closeModal = function(result) {
        $scope.reminderModal.remove();
        if (!result) return;
        PostService.showAnswer($scope.post._id).then(function(data){
          $scope.post = data.post;
        });
        // console.log(PostService.showAnswer($scope.post._id));
        $scope.showAnswer = true;
      };
      $scope.reminderModal.show();
    });
  };

  var inCandidates = function(){
    if($scope.post.candidates.length == 0) return false;
      $scope.candidate = $scope.post.candidates[0];
      $scope.timeRemaining = getDeadLine() + globals.timeDifference;
      // $scope.timeOut = getDeadLine() <0;
    if($scope.candidate._id == $scope.user._id) return true;
  };

  var refreshTimeRemaining = function(){
    $scope.timer = $interval(function(){
      if($scope.timeOut){
        $interval.cancel($scope.timer);
        $scope.timer = undefined;
      }else{
        var deadLine = getDeadLine();
        $scope.timeRemaining = deadLine + globals.timeDifference;
        // $scope.timeOut = deadLine <0;
      }
    },1000);
  };


  var ifInPeeks = function(){
    if(!$scope.isMine && !$scope.isGraber()){
      var peeks = $scope.post.peeks;
      function findPeeks(element) { return element == $scope.user._id };
      var index = peeks.findIndex(findPeeks);
      if (index == -1) return false;
      $scope.showAnswer = true;
      return true;
    }
  };

  var getDeadLine = function(){
    var myDate = new Date();
    var deadLine;
    myDate.setTime(myDate.getTime());
    ($scope.candidate && $scope.grab) ? deadLine = $scope.candidate.deadLine : deadLine = $scope.deadLine;
    return deadLine - myDate;
  };

  $scope.isGraber = function(){
    if ($scope.isMine || !$scope.post || !$scope.post.expert || $scope.post.expert._id != $scope.user._id) return false;
    return true;
  };

  var startAnswerCore = function(){
    PostService.startAnswer($scope.post._id).then(function(data){
      if (data.status == globals.ok){
        $scope.post = data.post;
      }
      else{
        $scope.post.status = globals.postState.closed;
        $ionicLoading.show({ template: "对不起，该提问已被抢答", noBackdrop: true, duration: 1000 });
      }
    });
    $scope.post.startDate = new Date();
  };

  $scope.acceptAnswer = function(){
    PostService.acceptAnswer($scope.post._id).then(function(data){
      if (data.status == globals.ok || data.status == globals.knownErrors.questionClosed){
        $scope.post = data.post;
        AuthService.updateUser();
      }
    });
  };

  $scope.removePost = function(){
    var post = $scope.post;
    if (!post) return;

    var settings = globals.settings.get() || {};
    var text = '确定要删除吗？';

    if (post.price > 0) {
      var deduct =  ((1-settings.refundRatio) * post.price).toFixed(2);
      text = settings.refundRatio == null ? '删除将部分扣款' : ('删除将扣 ' +  deduct + '金币')
    }

    $ionicPopup.confirm({
      title: '删除',
      template: text,
      okText: '确定',
      cancelText: '取消',
    }).then(function(result) {
      console.log('del confirm', result);
      if(result) {
        return PostService.deletePost(post._id);
      }
    }).then(function(data){
      if (!data) return;
      if (data.status != globals.ok) return $ionicLoading.show({ template: data.status, noBackdrop: true, duration: 1000 });
      AuthService.updateUser();
      $ionicLoading.show({ template: "删除成功！", noBackdrop: true, duration: 1000 });
      $rootScope.$emit('refreshHomePage');
      $scope.goBack();
    });
  };

  $scope.unbindHandler = $rootScope.$on("refreshPost", function(event, postId, message, data) {
    if (postId == $scope._id) {
      if (message == globals.message.comment) {
        $scope.post.comments = data.post.comments;
        updateMessages();
        $ionicScrollDelegate.resize();
        if (viewVisible) {
          $ionicScrollDelegate.$getByHandle('mainScroll').scrollBottom(true);
          $timeout(function() {
            $ionicScrollDelegate.$getByHandle('mainScroll').scrollBottom(true);
          }, 400);
        };
        if (ionic.Platform.isIOS() || ionic.Platform.isAndroid())
          $cordovaNativeAudio.play('msg');
      };
      if (message == globals.message.grab) {
        $scope.post = data.post;
        console.log($scope.post);
      }
      if (message == 2) {
        $scope.post = data.post;
        $interval.cancel($scope.timer);
        $scope.timer = undefined;
      }
      if (message == 3) {
        $scope.post.comments = data.post.comments;
        updateMessages();
        $scope.getPaid = true;
        if (cordova.plugins.Keyboard.isVisible) cordova.plugins.Keyboard.close();
      }
    }
  });

  var currentPlayMedia;
  var currentPlayMessage;

  var stopCurrentPlayMessage = function () {
    if (currentPlayMessage && currentPlayMessage.MMPlaying) {
      currentPlayMessage.MMPlaying = false;
      currentPlayMessage = null;
      currentPlayMedia.stop();
      currentPlayMedia = null;
    }
  };

  var viewVisible = true;
  $scope.$on('$ionicView.afterEnter', function () {
    console.log('enter post view');
    viewVisible = true;
    refresh();
    MyCareInIt();
    if ($scope.post.startDate) {
      $scope.timeAgo = {time: new Date(new Date($scope.post.startDate).getTime() + 24*3600*1000)};
    } else {
      $timeout(function(){
        $scope.timeAgo = {time: new Date(new Date($scope.post.startDate).getTime() + 24*3600*1000)};
      }, 1000)
    }
  });

  $scope.$on('$ionicView.beforeEnter', function(){
    if ($scope.post.startDate) {
      $scope.timeAgo = {time: new Date(new Date($scope.post.startDate).getTime() + 24*3600*1000)};
    } else {
      $timeout(function(){
        $scope.timeAgo = {time: new Date(new Date($scope.post.startDate).getTime() + 24*3600*1000)};
      }, 1000)
    }
  });

  var MyCareInIt = function(){
    ($scope.post.myCare) ? $scope.ifMyCare = 1 : $scope.ifMyCare = 0;
    $scope.switchNum = 0;
  };

  $scope.Switch = function() {
    $scope.ifMyCare++;
    $scope.ifMyCare= $scope.ifMyCare%2;
    $scope.switchNum++;
  }

  $scope.$on('$ionicView.beforeLeave', function () {
    console.log('stop playback before leave');
    $scope.read($scope.post._id);
    viewVisible = false;
    // if ($scope.post.unreadMessages) {
    //   delete $scope.post.unreadMessages;
    //   PostService.pushMessageDelete($scope._id);
    // }
    if ($scope.switchNum % 2 == 1){
      PostService.postMyCareChange($scope._id);
    };
    $interval.cancel($scope.timer);
    $scope.timer = undefined;
    if ($scope.unbindHandler) $scope.unbindHandler();
    stopCurrentPlayMessage();
  });

  $scope.share = function(){
    shareService.showShareTargets($scope, 'post', $scope.post);
  };

  $scope.playVoice = function (message) {
    // stop this message if it is playing
    if (message.MMPlaying) {
      message.MMPlaying = false;
      currentPlayMedia.stop();
      return;
    }

    stopCurrentPlayMessage();

    // play this message
    message.MMPlaying = true;
    currentPlayMessage = message;
    currentPlayMedia = new Media(message.src, (function (msg) {
      return function () {
        console.log('play done; next');
        var nextMessage;

        if (msg.MMPlaying) {
          var voiceMessages = $scope.messages.filter(function(x){ return x.MsgType == 1; });
          var msgIndex = voiceMessages.indexOf(msg);
          console.assert(msgIndex >= 0, 'current voice message not found after playback');

          if (msgIndex < voiceMessages.length - 1) {
            nextMessage = voiceMessages[msgIndex+1];
          }

          currentPlayMessage = null;
          currentPlayMedia = null;
        }

        $scope.$apply(function () {
          msg.MMPlaying = false;
          if (nextMessage) {
            $scope.playVoice(nextMessage);
          }
        });
      }
    })(message), function (err) {
      console.log(err);
    });
    currentPlayMedia.play();
  };

  var commentToMessage = function (comment) {
    if (typeof comment == "string") return;
    var message = {
      MMIsSend: AuthService.isSelfPosted(comment),
      MMIsAuthorSend: comment.author._id == $scope.post.author._id,
      author: {
        avatar: comment.author.avatar,
        _id: comment.author._id
      },
      content: comment.content,
      MsgType: 0,
      MMPlaying: false
    };
    if (comment.audioFiles && comment.audioFiles.length) {
      message.MsgType = 1;
      message.src = util.getMediaUrl(comment.audioFiles[0].src);
      message.dur = comment.audioFiles[0].dur;
    } else if (comment.photoFiles && comment.photoFiles.length) {
      message.MsgType = 2;
      message.src = util.getMediaUrl(comment.photoFiles[0]);
      message.thumb = util.getThumbnailUrl(comment.photoFiles[0]);
    }
    return message;
  };

  var updateMessages = function () {
    if (!$scope.post) return;
    var newMessages = $scope.post.comments.slice($scope.messages.length).map(function(c){ return commentToMessage(c); });
    $scope.messages = $scope.messages.concat(newMessages);
  };

  $scope.showImage = function (index, $event) {
    var items = $scope.messages.filter(function(x){ return x.MsgType === 2; }).map(function(x){ return x.src;});
    var imageIndex = index - $scope.messages.filter(function(e,i){ return e.MsgType != 2 && i <= index; }).length;
    ImageSlider.show(items, imageIndex, $scope, $event);
  };

  var isGrab = true;
  var refresh = function () {
    isGrab = false;
    PostService.getPost($scope._id, true, globals.message.pull).then(
      function(data){
        console.log(data);
        if (data.post && data.post.unreadMessages) delete data.post.unreadMessages;
        if (data.status == globals.ok){
          $scope.post = data.post;
          $scope.ready = true;
          updateUserSummary();
          updateMessages();
          ($scope.post.status == 1) ? $ionicScrollDelegate.scrollBottom(true) : $ionicScrollDelegate.scrollTop(true);
          if($scope.post.status == 0){
            PostService.getPostsGrab($scope._id, isGrab).then(
              function(data){
                console.log(data.grabs.length)
                if (data.status == globals.ok){
                  $scope.post.candidates = data.grabs;
                  var isGraber = inCandidates();
                  if(isGraber) refreshTimeRemaining();
                }
                else $ionicLoading.show({ template: data.status, noBackdrop: true, duration: 1000 });
            });
          }
        }
        else $ionicLoading.show({ template: data.status, noBackdrop: true, duration: 1000 });
        if($scope.post.peeks) ifInPeeks();

        $scope.showContentText = cutOut();
    });
  };

  $scope.goBack = function(){
    $ionicViewSwitcher.nextDirection("back");
    if($ionicHistory.viewHistory().backView == null) $ionicLoading.show({ template: '历史视图丢失', noBackdrop: true, duration: 2000 });
    $ionicHistory.goBack();
  };

  var updateUserSummary = function(){
    if (!$scope.post) return;
    $scope.userSummary = $scope.isSelfPosted() ? $scope.post.expert : $scope.post.author;
    $scope.userSummary.score = parseInt($scope.userSummary.score);
  };

  $scope.showUserInfo = function(){
    if ($scope.post.anonymous) return;
    var id = $scope.isSelfPosted() ? $scope.post.expert._id : $scope.post.author._id;
    $state.go("userInfo", {id: id});
  };

  $scope.scrollBottom = function() {
    $scope.changeBottom = 50 + 'px';
    $ionicScrollDelegate.$getByHandle('mainScroll').scrollBottom(true);
    $scope.showEmojiBoard = false;
  };

  $scope.supplement = function(){
    if(!$scope.supplementShow) {
      $scope.supplementShow = true;
      getSupplement();
    }else{
      $scope.supplementShow = false;
    }
  };


  $scope.showPhotoChoice = function() {
    $scope.showEmojiBoard = false;
    if (!$scope.showEmojiBoard) {
      $scope.changeBottom = 50 + 'px';
      $ionicScrollDelegate.$getByHandle('mainScroll').scrollBottom('true');
    };
    var hideSheet= $ionicActionSheet.show({
        buttons:[
          {text:'拍照'},
        ],
        destructiveText: '本地照片',
        cancelText: '<div style="color:black;">取消</div>',

        buttonClicked: function() {
          $scope.addPhoto(true);
          console.log("正在拍照");
          return true;
        },
        destructiveButtonClicked:function(){
          $scope.addPhoto(false);
          return true;
        }
    });
  };

  $scope.toChooseTime=[];
  $scope.newArr = function(){
    var i=1;
    for(i;i<10;i++){
      time = {
        value : 5*i,
        text : 5*i+'分钟',
      };
      $scope.toChooseTime.push((time));
    };
    $scope.dateValue = $scope.toChooseTime[0];
    $scope.timeValue = $scope.dateValue.value;
  };

  $scope.selectChange = function(dateValue){
    $scope.timeValue = dateValue.value;
  };

  $scope.cancelGrab = function(){
    PostService.cancelGrab($scope.post._id, $scope.post.author._id);
    $scope.showCancel = false;
    $scope.grab = true;
    $scope.post.candidates = [];
    $interval.cancel($scope.timer);
    $scope.timer = undefined;
    if($scope.timeOut) $scope.startGrab();
  };

  $scope.cancelRemind = function() {
    $scope.showRemind = $ionicPopup.show({
      cssClass: 'confirm',
      scope: $scope,
      template: '现在取消将扣除一定信用分，请问您真的要取消吗？',
      buttons: [
        {
          text: '不了',
          type: 'button-default'
        },
        {
          text: '是的',
          type: 'button-positive',
          onTap: function(e) {
            $scope.cancelGrab();
            // localStorage.user.score = localStorage.user.score - 5;
            store.setUser();
          }
        }
      ]
    });
  };

  $scope.getPostId = function(){
    window.localStorage.currentPostId = $scope.post._id;
  };

  var u = navigator.userAgent;
  $scope.isIOS = !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/);
  window.addEventListener('native.keyboardhide', function() {
      if ($scope.isIOS && $scope.showEmojiBoard && !cordova.plugins.Keyboard.isVisible) {
        $scope.changeBottom = 270 + 'px';
        $ionicScrollDelegate.$getByHandle('mainScroll').scrollBottom(true);
      };
    $ionicScrollDelegate.$getByHandle('mainScroll').scrollBottom(true);
  });

  window.addEventListener('native.keyboardshow', function() {
    if (!$scope.isIOS && !$scope.showEmojiBoard && cordova.plugins.Keyboard.isVisible) {
      $ionicScrollDelegate.$getByHandle('mainScroll').scrollBottom(true);
    };
  });

  $scope.showEmojiBoard = false;
  $scope.isRecord = false;
  var showEmojiBoard = function() {
    $scope.showEmojiBoard = true;
    $scope.changeBottom = 268 + 'px';
    $ionicScrollDelegate.$getByHandle('mainScroll').scrollBottom(true);
  };

  $scope.closeEmoji = function(){
    $scope.showEmojiBoard = false;
  }

  $scope.changeText = function(isText) {
    $scope.isRecord = false;
    if (isText ) {
      showEmojiBoard();
    };
    if (!$scope.isIOS) {
      if(isText && cordova.plugins.Keyboard.isVisible) {
        $timeout(function() {
          showEmojiBoard();
        }, 200);
      }
    } else $scope.showEmojiBoard = isText;
    if (!isText) {
      $scope.showEmojiBoard = false;
      $scope.changeBottom = 50 + 'px';
      $ionicScrollDelegate.$getByHandle('mainScroll').scrollBottom(true);
    };
  };

  $scope.changeRecord = function(isText) {
    if ($scope.post.status == 0) return;
    $scope.isRecord = isText;
    $scope.showEmojiBoard = false;
    $scope.changeBottom = 50 + 'px';
    $ionicScrollDelegate.$getByHandle('mainScroll').scrollBottom(true);
  };

  $scope.emoji = [{name: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂','🙃', '😉', '😌', '😍', '😘', '😭', '😱', '😚', '😋', '😜', '🤗', '😡']},
                  {name: ['😨', '😰', '😢', '😓', '😪', '😴', '🙄', '🤔', '😬', '😷', '😈', '👺', '💩', '👻', '💀', '👽', '👾', '😹', '👏', '🙏', '🤝', '👍', '👎']}];
  $scope.androidEmoji = [{name: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '😊', '😇', '😉', '😌', '😍', '😘', '😭', '😱', '😚', '😋', '😜', '😡', '😨', '😰', '😢', '😓',]},
  {name: ['😪', '😴', '😬', '😷', '😹', '😺', '😈', '👿', '👺', '💩', '👻', '💀', '👽', '👾', '💋', '👄', '💪', '👏', '🙏', '👌', '👍', '👎', '👀']}];

  $scope.chooseEmoji = function(val) {
    if ($scope.comment.content) $scope.comment.content += val;
    else $scope.comment.content = val;
  };

  $scope.sendEmoji = function() {
    var text = $scope.comment.content;
    $scope.comment.content = "";
    if (!text) return;
    $scope.submitComment('content',text);
  };

  $scope.deleteEmoji = function() {
    console.log($scope.comment.content);
    if (!$scope.comment.content) return;
    var content = $scope.comment.content.split(''),
        patt = /[\udc00-\udfff]/g,
        isEmoji = content[content.length - 1].search(patt);
    if (isEmoji != -1) {
      content.splice(content.length - 2);
      $scope.comment.content = content.join('');
    } else {
      content.pop();
      $scope.comment.content = content.join('');
    };
  };

  window.addEventListener('ionic.focusin', function(e) {
    console.log(e);
    var input = angular.element(document.querySelector('#input'));
    console.log(input)
  });

  $scope.setAvatar = function(src){
      return PostService.setAvatar(src);
  };

  var cutOut = function(){
    var width = angular.element(document.querySelector('ion-nav-view'))[0].offsetWidth;
    var content = $scope.post.content;
    var str = content.replace(/[\u4E00-\u9FA5]/g, "nb");
    var en = content.length*2 - str.length;
    var num = Math.floor((width-30)/18)*5 + Math.floor(en*0.32);
    if (content.length >= num){
      $scope.moreContent = true;
      return content.substr(0, num) + "...";
    } 
    else return content;
  }



  $scope.lookMore = function(){
    $scope.showContentText = $scope.post.content;
    $scope.moreContent = false;
    $scope.allContent = true;
  }

  $scope.packup = function(){
    $scope.showContentText = cutOut();
    $scope.allContent = false;
  }

  $scope.openClose = false;

  $scope.openQuesion = function(){$scope.openClose = true;}

  $scope.closeQuesion = function(){$scope.openClose = false;}

  $scope.toUserInfo = function (Id, avatar) {
    if (avatar == 'data/anonymous.png') return;
    $state.go('userInfo', {id: Id});
  };
});

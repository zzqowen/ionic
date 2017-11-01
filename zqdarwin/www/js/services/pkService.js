angular.module('darwin.pkService', [])
.service('PkService',
  function ($rootScope, $http, $q, $ionicPlatform, PushServer, HttpHelper, globals, util, store, $state, $sce, $ionicLoading, $ionicViewSwitcher, $timeout, $interval, $cordovaNativeAudio, $cordovaGeolocation, $ionicPopup, $ionicBackdrop, AuthService){
    var confirmPopup;
    var myPopup;
    var opponent, pkResultStatus, pkQuestion, selfChoice;
    var pkAllQuestion = [];
    var user = store.getUser();
    var pkObj = {
      ready: true,
      userScore: 0,
      opponentScore: 0,
      userProgressBar: "100%",
      opponentProgressBar: "100%",
      pkStartTime: globals.pkData.pkTime,
      user: user
    };

    var closeMatch = null;
    var time = null;
    var self = this;
    var countDown = function(){
      $interval.cancel(time);  
      pkObj.pkStartTime = globals.pkData.pkTime;
      time = $interval(function(){
        pkObj.pkStartTime --;
        if (pkObj.pkStartTime <= 0){
          $interval.cancel(time);
          console.log("submit answer");
          if (pkObj.pkAllQuestion[pkObj.pkAllQuestion.length-1].finishAnswer != true){
            self.pkSubmitAnswer({pkid: pkObj.pkid, answer: [''], time: (globals.pkData.pkTime - pkObj.pkStartTime)}).then(function(data){
              console.log('10 second auto commit answer');
            });
          }
          return;
        }
      },1000);
    };

    var endInitData = function(){
        pkObj.userScore = 0;
        pkObj.opponentScore = 0;
        pkObj.userProgressBar = "100%";
        pkObj.opponentProgressBar = "100%";
        pkObj.pkWaitingEnterAnimation = false;
        pkObj.pkWaitingExitAnimation = false;
    };

    $rootScope.$on('newPkMessage', function(event, message){
      if (message.message == globals.pkCode.matchSuccess){
        self.closeBackButtonAction();
        if (message.red.id == user.id){
          opponent = message.blue;
          pkObj.user = message.red;
        }
        else {
          opponent = message.red;
          pkObj.user = message.blue;
        }
        console.log(message.pkid);
        pkObj.pkid = message.pkid;
        pkObj.opponent = opponent;
        pkObj.pkQuestion = [];

        pkObj.opponent = opponent;
        console.log(pkObj.opponent);
        pkObj.ready = false;

        pkObj.pkType = message.pkType;

        $timeout(function(){
          pkObj.pkWaitingExitAnimation = true;
          $ionicViewSwitcher.nextDirection("wrap");
          $state.go('pkStart');
        }, 1000);

        $timeout(function(){
          self.closeWaitingPopup();
          pkObj.pkWaitingExitAnimation = false;
          pkObj.ready = true;
        }, 3000);

      } else if(message.message == globals.pkCode.pkPushQuestion){
        pkObj.roundIndex = message.index;
        $timeout(function(){
          pkObj.pkRound = true;
        }, 800);
        pkQuestion = [{choices:message.choices, content: message.question, finishAnswer: false, _id: message._id, index: message.index}];
        $timeout(function(){
          pkObj.pkRound = false;
          pkAllQuestion.push(pkQuestion[0]);
          pkObj.pkAllQuestion = pkAllQuestion;
          pkObj.pkQuestion = pkQuestion;
          countDown();
        },2000);

      } else if(message.message == globals.pkCode.pkManager){
        if (message.win != '1') {
          endInitData();
          $ionicLoading.show({ template: '平局继续', noBackdrop: true, duration: 1000});
        } else {
          $timeout(function(){
            if (message.user.displayName == user.displayName) pkResultStatus = true;
            else pkResultStatus = false;
            pkObj.pkResultStatus = pkResultStatus;
            pkAllQuestion = [];
            $state.go('pkResult', {way: 'pkStart'});
            $timeout(function(){
              endInitData();
            }, 200);
          }, 1000);
        }

        $interval.cancel(time);
      } else if(message.message == globals.pkCode.pkJudge){
        if (message.userid == user._id){
          pkAllQuestion[pkAllQuestion.length-1].finishAnswer = true;
          if (message.flag == 'success'){
            pkAllQuestion[pkAllQuestion.length-1].questionStatus = true;
            pkObj.userScore += message.score;
            pkObj.userProgressBar = Math.round((globals.pkData.pkStartAllScore - pkObj.userScore)/globals.pkData.pkStartAllScore * 10000)/100 + '%';
          } else{
            pkAllQuestion[pkAllQuestion.length-1].questionStatus = false;
          }
        } else{
          if (message.flag == 'success'){
            pkObj.opponentScore += message.score;
            pkObj.opponentProgressBar = Math.round((globals.pkData.pkStartAllScore - pkObj.opponentScore)/globals.pkData.pkStartAllScore * 10000)/100 + '%';
          }
        };
        if (ionic.Platform.isIOS() || ionic.Platform.isAndroid())
        $cordovaNativeAudio.play('msg');
        console.log(pkObj.userScore + '---' + pkObj.opponentScore);
        console.log(pkObj.userProgressBar + '---' + pkObj.opponentProgressBar);
      } else if(message.message == globals.pkCode.pkError){
        if (message.err == '比赛已结束'){
          $state.go('pkResult', {way: 'pkStart'});
          $interval.cancel(time); 
          $timeout(function(){
            endInitData();
          }, 200)
        } else {
          $state.go('tab.pk');
        }
        $ionicLoading.show({ template: message.err, noBackdrop: true, duration: 1000});
      } else if(message.message == globals.pkCode.backtopk){
        $ionicLoading.show({template: '游戏还在进行中', noBackdrop: true, duration: 1000});
        pkQuestion = [{choices:message.data.choices, content: message.data.question, finishAnswer: false, _id: message.data._id, index: message.index}];
        pkObj.ready = false;
        $timeout(function(){
          pkObj.pkWaitingExitAnimation = true;
          $ionicViewSwitcher.nextDirection("wrap");
          $state.go('pkStart');
        }, 1000);

        $timeout(function(){
          self.closeWaitingPopup();
          pkObj.pkWaitingExitAnimation = false;
          pkObj.ready = true;
          pkObj.pkRound = false;
          pkAllQuestion.push(pkQuestion[0]);
          pkObj.pkAllQuestion = pkAllQuestion;
          pkObj.pkQuestion = pkQuestion;
          countDown();
        },3000);
      } else if (message.message == globals.pkCode.pkinvited){
        self.registerBackButtonAction();
        confirmPopup = $ionicPopup.confirm({
          template: '是否接受'+message.invite.displayName+'的PK邀请?',
          okText: '确定',
          cancelText: '取消',
          cssClass: 'confirm'
        });
        confirmPopup.then(function(res) {
          if(res) {
            self.pkInviteEnsure().then(function(data){
              console.log(data);
            });
          } else {
            self.pkInviteCancel().then(function(data){
              console.log(data);
              pkObj.pkWaitingEnterAnimation = false;
            })
          }
        });
      } else if (message.message == globals.pkCode.cancelinvited){
        self.closeBackButtonAction();
        if (message.timeoutStatus) {
          $ionicLoading.show({template: '邀请超时', noBackdrop: true, duration: 1000});
        } else {
          $ionicLoading.show({template: '对方取消了邀请', noBackdrop: true, duration: 1000});
        }
        if (confirmPopup) confirmPopup.close();
        pkObj.pkWaitingEnterAnimation = false;
        $timeout(function(){
          pkObj.ready = false;
          if (myPopup) self.closeWaitingPopup();
        }, 1000);
      } else if (message.message == globals.pkCode.disconnect){
          if (user.displayName != message.player){
            $ionicLoading.show({template: message.player + '已经掉线了', noBackdrop: true, duration: 1000});
          }
        } else if (message.message == globals.pkCode.reconnect){
          if (user.displayName != message.player){
            $ionicLoading.show({template: message.player + '已经连接上了', noBackdrop: true, duration: 1000});
          }
        } 
      });

    this.chooseAnswer = function(content){
      console.log(content);
      pkAllQuestion[pkAllQuestion.length - 1].selfChoice = content;
      pkObj.pkAllQuestion = pkAllQuestion;
    }

    this.choosePkType = function(content){
      console.log(content);
      pkObj.pkType = content;
    }

    this.getPkObj = function(){
      console.log(pkObj);
      return pkObj;
    }

    this.getPkHistory = function(data){
      console.log(data);
      pkObj.pkAllQuestion = data.questions;
      pkObj.user = data.author;
      pkObj.opponent = data.opponent;
      if (data.pkResult == "胜利") pkObj.pkResultStatus = true;
      else if (data.pkResult == "失败") pkObj.pkResultStatus = false;
    }

    this.getAutoLocation = function() {
      var location = {};
      var deferral = $q.defer();
      navigator.geolocation.getCurrentPosition(function(position) {
        var gcj = coordtransform.wgs84togcj02(position.coords.longitude, position.coords.latitude);
        var baidu = coordtransform.gcj02tobd09(gcj[0], gcj[1]);
        var geoc = new BMap.Geocoder();
        var pt = new BMap.Point(baidu[0],baidu[1]);
        geoc.getLocation(pt, function(rs){
          console.log(rs);
          var addComp = rs.addressComponents;
          location.province = addComp.province;
          location.city = addComp.city;
          location.country = addComp.country;
          console.log(location);
          AuthService.changeUserInfo(location).then(function(data){
            if (data.status == 'ok') deferral.resolve(location);
          })
        });
      }, function() {
        $ionicLoading.show({template: '定位失败', noBackdrop: true, duration: 1000});
          location.province = "未知";
          location.city = "未知";
          location.country = "未知";
          console.log(location);
          AuthService.changeUserInfo(location).then(function(data){
            if (data.status == 'ok') deferral.resolve(location);
          })
        deferral.resolve(location);
      });
      return deferral.promise;
    };

    this.pkWaitingPopup = function(scope){
      myPopup = $ionicPopup.show({
        templateUrl: 'views/app/pkWaiting.html',
        cssClass: 'pkWaitingPopup',
        scope: scope
      });
      $ionicBackdrop.release();
    }

    this.closeWaitingPopup = function(){
      myPopup.close();
    }

    this.registerBackButtonAction = function(e){
      closeMatch = $ionicPlatform.registerBackButtonAction(function(e){
        if (!!e && typeof e.preventDefault === 'function') {
            e.preventDefault();
        }
        return false;
      }, 501);
    }

    this.closeBackButtonAction = function(){
      if (closeMatch) closeMatch();
    }

    this.pkMatch = function(obj){
      self.registerBackButtonAction();
      return HttpHelper.post(util.getApiUrl('/game/match'), obj);
    }

    this.pkCancelMatch = function(obj){
      self.closeBackButtonAction();
      return HttpHelper.post(util.getApiUrl('/game/cancel/match'), obj);
    }

    this.pkSubmitAnswer = function(obj){
      return HttpHelper.post(util.getApiUrl('/game/submit'), obj);
    }

    this.pkPlaying = function(){
      return HttpHelper.post(util.getApiUrl('/game/isplaying'));
    }

    this.pkHistory = function(page, size){
      return HttpHelper.get(util.getApiUrl('/game/history/'+page+'/'+size));
    }

    this.pkRank = function(page, size){
      return HttpHelper.get(util.getApiUrl('/game/rank/'+page+'/'+size));
    }

    this.pkPersonInfo = function(page, size){
      return HttpHelper.get(util.getApiUrl('/game/person'));
    }

    this.pkInviteFriends = function(obj){
      self.registerBackButtonAction();
      return HttpHelper.post(util.getApiUrl('/game/invite/friend'), obj);
    }

   this.pkInviteEnsure = function(){
      return HttpHelper.get(util.getApiUrl('/game/invite/ensure'));
    }

    this.pkInviteCancel = function(){
      self.closeBackButtonAction();
      return HttpHelper.get(util.getApiUrl('/game/invite/cancel'));
    }

    this.addQuestion = function(obj){
      return HttpHelper.post(util.getOpenUrl('/question/add'), obj);
    }

    this.getSelfLocation = function(){
      return self.getAutoLocation();
    }

    this.pkGiveUp = function(obj){
      $interval.cancel(time);
      return HttpHelper.post(util.getApiUrl('/game/giveUp'), obj);
    }
  }
)

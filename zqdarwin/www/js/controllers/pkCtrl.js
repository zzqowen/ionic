angular.module('darwin.pkCtrl', [])
.controller('pkCtrl',
  function($scope, $stateParams, $ionicHistory, AuthService, $ionicLoading, PkService, store, globals, PostService, shareService, $rootScope, $ionicViewSwitcher, $ionicModal, $state, $ionicPopup, $timeout, $interval, $ionicScrollDelegate, $ionicSlideBoxDelegate, $cordovaNativeAudio, $ionicPlatform) {
    $scope.currentName = $state.current.name;
    $scope.matchOrInvite = $stateParams.way;
    $scope.type = globals.pkType;
    $scope.user = store.getUser();
    $scope.pkObj = PkService.getPkObj();
    $scope.personInfo = [];
    $scope.drawObj = {type: $scope.type[0].name, content: "", ans: "", correct: ["", "", ""], multi: false, feedback: 4};
    $scope.matchWay = ['开始比赛', '挑战好友', '我要出题', '我的排行'];
    $scope.rollAndHistory = [{name: '排行', selected: true}, {name: '历史', selected: false}];
    $scope.chooseAnswer = "";
    $scope.pkStartAllScore = globals.pkData.pkStartAllScore;

    var InitializeData = function(){
      $scope.pkHistoryPage = 1;
      $scope.pkRankPage = 1;
      $scope.dataSize = 10;
    };
    InitializeData();

    $scope.showUserAccount = function($event){
      $event.stopPropagation();
      $ionicViewSwitcher.nextDirection("forward");
      $state.go('account');
    };
    
    $scope.goBack = function(){
      $ionicViewSwitcher.nextDirection("back");
      $ionicHistory.goBack();
    };

    $scope.inviteFriends = function(){
      shareService.showShareTargets($scope, 'invitePk', $scope.user);
    };

    $scope.typeIndex = 0;
    $scope.pkType = $scope.type[0].value;
    $scope.chooseType = function(index, item){
      $scope.pkType = item.value;
      PkService.choosePkType($scope.pkType);
      if (!item.selected){
        item.selected = true;
        $scope.type[$scope.typeIndex].selected = false;
        $scope.typeIndex = index;
      };
    };

    $scope.onClick = function(item){
      PkService.choosePkType($scope.pkType);
      if (item == '开始比赛'){
        if (!$scope.pkType) return $ionicLoading.show({ template: '请先选择类型，再开始比赛', noBackdrop: true, duration: 1000});
        $scope.pkObj.invite = true;
        PkService.pkWaitingPopup($scope);
        $scope.pkObj.pkWaitingEnterAnimation = true;
        $scope.pkObj.ready = true;
        var obj = {type: $scope.pkObj.pkType};
        console.log(obj);
        $timeout(function(){
          PkService.pkMatch(obj).then(function(data){
            console.log(data);
            if (data.status != globals.ok) $ionicLoading.show({ template: '匹配失败', noBackdrop: true, duration: 1000});
          });
        }, 1000);
      } else if (item == '我的排行'){
        $ionicViewSwitcher.nextDirection("forward");
        $state.go('pkHonorRoll');
      } else if (item == '挑战好友'){
        $scope.showSatisfy = $ionicPopup.show({
          templateUrl: 'views/common/pkInvite.html',
          cssClass: 'confirm',
          scope: $scope,
        });
      } else if (item == '我要出题'){
        $ionicViewSwitcher.nextDirection("forward");
        $state.go('toDraw');
      }
    };

    var transformIndex = function(){
      for(var i = 0; i< $scope.type.length; i++){
        if ($scope.type[i].value == $scope.pkObj.pkType){
          return i;
        }
      }
    }

    $scope.pkInviteQQ = function(){
      shareService.shareInvitePk(globals.share.friends, 'qq', transformIndex());
      $scope.showSatisfy.close();
    }

    $scope.pkInviteWx = function(){
      shareService.shareInvitePk(globals.share.friends, 'wx', transformIndex());
      $scope.showSatisfy.close();
    }

    $scope.submitAnswer = function(item){
      $scope.chooseAnswer = item;
      PkService.chooseAnswer(item);
      PkService.pkSubmitAnswer({pkid: $scope.pkObj.pkid, answer: [item], time: (globals.pkData.pkTime - $scope.pkObj.pkStartTime)}).then(function(data){
        console.log('already answer question');
      });
    };

    $scope.pkDarwinFriends = function(){
      $scope.showSatisfy.close();
      $state.go('contacts', {type: $scope.pkObj.pkType});
    };

    $scope.rollHistoryChoice = 0;
    $scope.pkRollAndHistory = function(item, index){
      if (!item.selected){
        item.selected = true;
        $scope.rollAndHistory[$scope.rollHistoryChoice].selected = false;
        $scope.rollHistoryChoice = index;
      };

      if (item.name == '排行'){
        if (!$scope.pkRankData || $scope.pkRankData.length == 0){
          PkService.pkRank($scope.pkRankPage, $scope.dataSize).then(function(data){
            $scope.pkRankData = data;
          });
        }
      } else if (item.name == '历史'){
        if (!$scope.pkHistoryData || $scope.pkHistoryData.length == 0){
          PkService.pkHistory($scope.pkHistoryPage, $scope.dataSize).then(function(data){
            $scope.pkHistoryData = handle(data);
          });
        }
      }
    };

    $scope.$on('$ionicView.afterEnter', function(){
      shareService.getCtrlScope($scope);
      if ($state.current.name == 'tab.pk'){
        PkService.pkPersonInfo().then(function(data){
          console.log(data);
          $scope.user.rank = data.rank;
          $scope.user.pkLevel = data.level;
          localStorage.user = JSON.stringify($scope.user);
          $scope.personInfo = [
            {name: '排名', data: data.rank},
            {name: '历史', data: data.sum},
            {name: '胜率', data: data.sum ? Math.round((data.win/data.sum)*1000)/10 + '%' : "-"},
            {name: '分数', data: data.score},
          ];
        });
      } else if($state.current.name == 'pkStart'){
        $ionicHistory.clearHistory();
        console.log($scope.pkObj);
        $scope.opponent = $scope.pkObj.opponent;
        $timeout(function(){
          PkService.pkSubmitAnswer({pkid: $scope.pkObj.pkid}).then(function(data){
            console.log('start pk push question');
          });
        }, 2000);

        $scope.isLost = function(){
          $ionicPopup.confirm({
            template: '确定退出PK吗？(自动认输)',
            okText: '确定',
            cancelText: '取消',
            cssClass: 'confirm'
          }).then(function(res) {
            if(res) {
              console.log('确定');
              PkService.pkGiveUp({pkid: $scope.pkObj.pkid}).then(function(data){
                console.log(data);
              });
            } else {
              console.log('取消');
            }
          });
        }
        $ionicPlatform.onHardwareBackButton($scope.isLost);
      } else if($state.current.name == 'pkResult'){
        if ($stateParams.way == 'pkStart'){
          $scope.pkResultState = function(){
            $state.go("tab.pk");
          };
          $ionicPlatform.onHardwareBackButton($scope.pkResultState);
        } else{
          $scope.pkResultState = function(){
            $state.go("pkHonorRoll");
          };
        }
      };
    });

    $scope.$on('$ionicView.beforeEnter', function(){
      if ($state.current.name == 'pkResult'){
        $scope.opponent = $scope.pkObj.opponent;
        $scope.pkResultStatus = $scope.pkObj.pkResultStatus;
        $scope.allQuestion = $scope.pkObj.pkAllQuestion;
        $ionicSlideBoxDelegate.update();
        console.log($scope.allQuestion);
        if ($stateParams.way == 'pkStart') $scope.pkMatchShow = true;
        else $scope.pkMatchShow = false;
      } else if ($state.current.name == 'pkStart'){
          $scope.allQuestion = [];
          $scope.pkQuestion = [];
      }
    });

    $scope.$on('$ionicView.afterLeave', function(){
      $scope.pkObj.pkWaitingEnterAnimation = false;
      if ($scope.currentName == "pkStart"){
        $ionicPlatform.offHardwareBackButton($scope.isLost)
      } else if ($scope.currentName == 'pkResult'){
        $ionicPlatform.offHardwareBackButton($scope.pkResultState);
      }
    })

    $scope.$on('$ionicView.loaded', function(){
      $scope.location = $scope.user.city;
      if (($state.current.name == 'tab.pk') && !($scope.user.province || $scope.user.city)){
        $scope.location = '定位中...';
        PkService.getSelfLocation().then(function(data){
          console.log(data);
          $scope.user.province = data.province;
          $scope.user.city = data.city;
          $scope.user.country = data.country;
          if (data.province) $scope.location = data.city.slice(0, (data.city.length-1));
          else $scope.location = '未知';
          localStorage.user = JSON.stringify($scope.user);
        });
      } else if($state.current.name == "pkHonorRoll"){
        $scope.pkRollAndHistory($scope.rollAndHistory[0], 0);
      }
    });

    var handle = function(data){
      _.each(data.datas, function(comment, i){
        if ($scope.user.id == comment.users[0].id){
          comment.author = comment.users[0];
          comment.opponent = comment.users[1];
          if (comment.users[0].result && comment.users[0].result == 'win'){
            comment.pkResult = '胜利';
          } else{
            comment.pkResult = '失败';
          };
        } else{
          comment.author = comment.users[1];
          comment.opponent = comment.users[0];
          if (comment.users[1].result && comment.users[1].result == 'win'){
            comment.pkResult = '胜利';
          } else{
            comment.pkResult = '失败';
          };
        }
      });
      return data.datas;
    };

    $scope.refreshPkHistory = function(boolean){
      if (boolean){
        $scope.pkHistoryPage = 1;
        $scope.historyNotMore = false;
      } else {
        $scope.pkHistoryPage ++;
      }
      console.log($scope.pkHistoryPage);
      PkService.pkHistory($scope.pkHistoryPage, $scope.dataSize).then(function(data){
        boolean ? $scope.pkHistoryData = handle(data) : $scope.pkHistoryData = $scope.pkHistoryData.concat(handle(data));
        console.log($scope.pkHistoryData);
        if (data.datas.length == 0){
          $scope.historyNotMore = true;
        }
      }).finally(function(error) {
          $scope.$broadcast('scroll.infiniteScrollComplete');
          $scope.$broadcast('scroll.refreshComplete');
      });
    };

    $scope.refreshPkRank = function(boolean){
      if (boolean){
        $scope.pkRankPage = 1;
        $scope.rankNotMore = false;
      } else {
        $scope.pkRankPage ++;
      }
      console.log($scope.pkRankPage);
      PkService.pkRank($scope.pkRankPage, $scope.dataSize).then(function(data){
        console.log(data);
        boolean ? $scope.pkRankData = data : $scope.pkRankData = $scope.pkRankData.concat(data);
        if (data.length == 0){
          $scope.rankNotMore = true;
        }
      }).finally(function(error) {
          $scope.$broadcast('scroll.infiniteScrollComplete');
          $scope.$broadcast('scroll.refreshComplete');
      });
    };

    $scope.page = function(index){
      console.log(index);
      $ionicSlideBoxDelegate.slide(index);
    };

    $scope.aa = function(){
      $scope.pkWaitingExitAnimation = true;

      $timeout(function(){
        $scope.pkWaitingExitAnimation = false;
      }, 2000);
    }

    $scope.submitPkQuestion = function(question){
      var index = $ionicSlideBoxDelegate.currentIndex();
      var question = $scope.allQuestion[index].content;
      $state.go('newpost', {pkQuestion: question, type: $scope.pkObj.pkType});
    };

    $scope.addQuestion = function(){
      console.log($scope.drawObj);
      if ($scope.drawObj.content == ""
        || $scope.drawObj.ans == ""
        || ($scope.drawObj.correct[0] == "" || $scope.drawObj.correct[1] == "" || $scope.drawObj.correct[2] == "")
        || !$scope.drawObj.type)
      return $ionicLoading.show({ template: '请把信息填全', noBackdrop: true, duration: 1000});
      PkService.addQuestion($scope.drawObj).then(function(data){
        if (data.status == 'ok') {
          $ionicLoading.show({ template: '出题成功,请等待审核通过', noBackdrop: true, duration: 1000});
          $scope.drawObj = {type: $scope.drawObj.type, content: "", ans: "", correct: ["", "", ""], multi: false, feedback: 4};
        }
      });
    };

    $scope.showAbout = function(url){
      AuthService.showAbout(url);
    };

    $scope.showHistoryDetail = function(content){
      PkService.getPkHistory(content);
      console.log(content);
      $state.go("pkResult", {way: "history"});
    };
});

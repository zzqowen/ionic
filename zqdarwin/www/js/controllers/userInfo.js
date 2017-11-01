angular.module('darwin.userInfoCtrl', [])
.controller('userInfoCtrl',
  function($scope, $stateParams, PkService, $ionicHistory, $ionicLoading, AuthService, store, globals, shareService, $rootScope, $ionicViewSwitcher, $ionicPopup, $ionicModal, PostService, $state, wrongBounced, $timeout) {
    $scope.ready = false;
    $scope.isSelf = true;
    $scope.selfPosts = [];
    var viewVisible = true;
    $scope.user = store.getUser();
    $scope.pkObj = PkService.getPkObj();
    shareService.getCtrlScope($scope);
    $scope.self = {
      displayName : '      '
    };

    $scope.$on("$ionicView.loaded", function(ev){
      console.log("loaded userInfo view");
      $scope.getSelfPosts();
    });

    $scope.$on("$ionicView.afterEnter", function(ev){
      console.log("enter userInfo view");
      viewVisible = true;
      console.log($scope.selfPosts)
      if ($scope.selfPosts) {
        for (var key in $scope.selfPosts) {
          if ($scope.selfPosts.hasOwnProperty(key) && $scope.selfPosts[key].peek) {
            var user = store.getUser();
            $scope.selfPosts[key].isPaid = ($scope.selfPosts[key].peeks.indexOf(user._id) != -1); 
            console.log($scope.selfPosts[key].isPaid);
          };
        };
      };
    });

    $scope.$on("$ionicView.afterLeave", function(ev){
      console.log("leave userInfo view");
      viewVisible = false;
    });

    if ($stateParams.id == $scope.user._id){
      $scope.self = $scope.user;
      $scope.ready = true;
      //$scope.integralIcon = 'data/v_' + $scope.user.level + '@3x.png';
    }
    else{
      $scope.isSelf = false;
      AuthService.getUserSummary($stateParams.id).then(function(data){
        $scope.self = data.user;
        console.log($scope.user)
        //$scope.user.level = data.user.score ? Math.ceil(data.user.score/1000) : 1;
        //$scope.userLevel();
        $scope.ready = true;
        $scope.canAddFriend = !AuthService.areFriendsWith(data.user.id);
        //$scope.integralIcon = 'data/v_' + $scope.user.level + '@3x.png';
      });
      
    }

    $scope.goBack = function(){
      $ionicViewSwitcher.nextDirection("back");
      $ionicHistory.goBack();
    };

    $scope.share = function(item){
     shareService.showShareTargets($scope, 'user', $scope.user);
    };

    $scope.addFriends = function(){
      console.log($scope.user);
      AuthService.addFriends($scope.user).then(function(data){
        if (data.status == "ok") {
          $scope.canAddFriend = false;
          AuthService.getFriends().then(function(data){
            $rootScope.userFriends = data;
            var index = 1;
            $rootScope.$emit('refreshFriendsList');
          });
        } else {
          $ionicLoading.show({ template: data.status, noBackdrop: true, duration: 1000 });
        }
      })
    };

     //CircleOfFriends Delete Function
    $scope.deleteFriend = function(item) {
      var confirmPopup = $ionicPopup.confirm({
        template: '你确定取消关注该好友?',
        cancelText: '取消',
        okText: '确认',
        cssClass: 'confirm'
      });
      confirmPopup.then(function(res) {
        if(res) {
          AuthService.delFriends(item._id).then(function(data){
            console.log(data);
            if (data.status && data.status == "ok"){
              $scope.canAddFriend = true;
              AuthService.getFriends().then(function(data){
                $rootScope.userFriends = data;
                var index = 0;
                $rootScope.$emit('refreshFriendsList');
              });
            }else{
              $ionicLoading.show({ template: '删除失败', noBackdrop: true, duration: 1000 });
            }
          })
        } else {
          console.log('cancel delete');
        }
      });
    };

    var isLoading = false;
    $scope.isPaid = [];
    $scope.hasMore = true;
    $scope.isEmpty = ($scope.selfPosts.length == 0);
    $scope.showLoading = true;
    $scope.getSelfPosts = function() {
      if ($scope.selfPosts.length % globals.maxQuestions == 0 || $scope.hasMore) {
        if (isLoading) return;
        isLoading = true;
        if ($scope.selfPosts.length != 0) var lastPostTimeStamp = $scope.selfPosts[$scope.selfPosts.length - 1].date;
        else lastPostTimeStamp = undefined;
        AuthService.getUserSummary($stateParams.id).then(function(data) {
          var id = data.user._id;
          AuthService.getSelfPosts(id, lastPostTimeStamp).then(function(data) {
            console.log('load more selfPosts');
            $scope.hasMore = (data.length != 0 && data.length % globals.maxQuestions == 0);
            $scope.selfPosts = $scope.selfPosts.concat(data);
            console.log(data)
            $scope.isEmpty = ($scope.selfPosts.length != 0);

            for (var key in $scope.selfPosts) {
              if ($scope.selfPosts.hasOwnProperty(key) && $scope.selfPosts[key].peeks) {
                var user = store.getUser();
                $scope.selfPosts[key].isPaid = ($scope.selfPosts[key].peeks.indexOf(user._id) != -1);
              };
            };
          }).finally(function(error) {
            isLoading = false;
            $scope.$broadcast('scroll.infiniteScrollComplete');
            $scope.$broadcast('scroll.refreshComplete');
          });
        })
      }
    };

    $scope.doRefresh = function() {
      if (!viewVisible) return;
      $scope.showLoading = false;
      $scope.hasMore = true;
      $scope.isEmpty = true;
      $scope.selfPosts = [];
      $scope.getSelfPosts();
    }

    $scope.payForAnswers = function(id, price, index){
      $scope.price = price;
      $ionicModal.fromTemplateUrl('views/app/showPayReminder.html',{
        scope: $scope,
        animation:'slide-in-right'
      }).then(function(modal){
        $scope.reminderModal = modal;
        $scope.closeModal = function(result) {
          $scope.reminderModal.remove();
          if (!result) return;
          $scope.selfPosts[index].isPaid = true;
          PostService.showAnswer(id);
          $state.go('post', {postId: id});
        };
        $scope.reminderModal.show();
      });
    };

    $scope.setAvatar = function(src){
      return PostService.setAvatar(src);
    };

    $scope.userLevel = function(){
      if($scope.user.score<1000) return $scope.user.level = 1;
      else if(1000<=$scope.user.score&&$scope.user.score<2000) return $scope.user.level = 2;
      else if(2000<=$scope.user.score&&$scope.user.score<2500) return $scope.user.level = 3;
      else return $scope.user.level = Math.ceil(($scope.user.score-2499)/1000) +3;
    }

    $scope.userLevel();
    $scope.integralIcon = 'data/v_' + $scope.user.level + '@3x.png';

    $scope.toReport = function(){
      $ionicModal.fromTemplateUrl('views/app/toReport.html',{
      scope: $scope,
      animation:'superScaleIn'
    }).then(function(modal){
      $scope.reminderModal = modal;
      $scope.closeModal = function(result,content) {
        $scope.reminderModal.remove();
        if (!result) return;
        var u_id = $scope.user._id;
        var reason = [];
        console.log(content);
        AuthService.feedback('3',reason,content,u_id).then(
          function(data){
            if (data.status == "ok") {
              $ionicLoading.show({ template: '我们已经收到你的举报', noBackdrop: true, duration: 1000 });
            }
            else $ionicLoading.show({ template: '举报失败,请不要重复举报', noBackdrop: true, duration: 1000 });
        });
      };
      $scope.reminderModal.show();
    });
    }
});

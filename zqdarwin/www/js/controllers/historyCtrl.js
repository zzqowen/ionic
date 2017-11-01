angular.module('darwin.historyCtrl', [])
.controller('HistoryCtrl',
  function($scope, $state, $ionicLoading, $interval, store, $stateParams, $timeout, $ionicHistory, $ionicScrollDelegate, PostService, AuthService, globals, $rootScope, $ionicSlideBoxDelegate, PkService, shareService, $ionicViewSwitcher) {
    $scope.type = parseInt($stateParams.type) || globals.myPosts.all;
    $scope.posts = [];
    $scope.lists = [];
    $scope.user = store.getUser();
    $scope.FollowPostList = [];
    $scope.data = {};
    $scope.data.getMore = false;
    $scope.slides = [];
    
    $scope.pushMessage = PostService.getPushMessage();
    $scope.pkObj = PkService.getPkObj();
    shareService.getCtrlScope($scope);

    $scope.goBack = function(){
      console.log('going back from history');
      $ionicViewSwitcher.nextDirection("back");
      $ionicHistory.goBack();
    };

    $scope.showUserAccount = function($event){
      $event.stopPropagation();
      $state.go('account');
    };

    $scope.ifUnread = function(postId){
      var ary = $scope.pushMessage.history.question.concat($scope.pushMessage.history.answer);
      return ary.indexOf(postId) + 1;
    }

    $scope.doRefresh = function(){
      $scope.nothing = false;
      var index = $ionicSlideBoxDelegate.$getByHandle('historySlideBox').currentIndex();
      var slide = $scope.slides[index];
      slide.timestamp = null;
      slide.list = [];
      $scope.choose = parseInt(slide.value);
      PostService.getMyLists($scope.choose , true, false, slide.timestamp).then(function(data){
          if(data.status == 'ok' && !data.list.length) $scope.nothing = true;
          $scope.slides[index].list = data.list;
          console.log($scope.slides[index].list)
          slide.loaded = true;
          slide.hasMore = true;
        }).finally(function(error) {
          $scope.$broadcast('scroll.infiniteScrollComplete');
          $scope.$broadcast('scroll.refreshComplete');
      });
    }

    $scope.slideChanged = function(index) {
      $ionicSlideBoxDelegate.$getByHandle('historySlideBox').slide(index);
      AuthService.setScrollViewIndex(index, 'history');
      $scope.currentIndex = index;
      var slide = $scope.slides[index];
      $scope.choose = parseInt(slide.value);
      if ($scope.slides[index].loaded) return;
      $scope.doRefresh();
    };

    $scope.slideDouble = function(index){
      console.log(index);
      AuthService.triggerScrollViewPullToRefresh(AuthService.getInstances(index, 'history').getScrollView());
    }

    $scope.pullLoad = function(){
      var index = $ionicSlideBoxDelegate.$getByHandle('historySlideBox').currentIndex();
      var slide = $scope.slides[index];
      slide.timestamp = slide.list[slide.list.length-1].timestamp;
      $scope.choose = parseInt(slide.value);
      PostService.getMyLists($scope.choose, false, false, slide.timestamp).then(function(data){
        (data.list.length > 0) ? slide.list = slide.list.concat(data.list) : slide.hasMore = false;
      }).finally(function(error) {
        $scope.$broadcast('scroll.infiniteScrollComplete');
        $scope.$broadcast('scroll.refreshComplete');
      });
    }

    $scope.isSelfPosted = function(post){
      return AuthService.isSelfPosted(post);
    };

    $scope.isSelfAnswered = function(post){
      return AuthService.isSelfAnswered(post);
    };

    $scope.text = function(post){
      if (post.content.length > 0) return post.content;
      var text = "";
      if (post.photoFiles.length > 0) text = post.photoFiles.length + "张图片 ";
      if (post.audioFiles.length > 0) text += post.audioFiles.length + "个语音";
      return text;
    };

    $scope.fileComplain = function($event, post){
      $event.stopPropagation();
    };

    $scope.isInvestigating = function(post){
      return (post.complain && post.complain.state == globals.complainState.investigating);
    };

    $scope.isResolved = function(post){
      return (post.complain && post.complain.state == globals.complainState.resolved);
    };

    $scope.avatar = function(post){
      return PostService.avatar(post);
    };

    $scope.$on("$ionicView.afterEnter", function(ev){
      console.log("entered history view");
      console.log($scope.pushMessage);
      // $scope.doRefresh();
      // var index = $ionicSlideBoxDelegate.$getByHandle('historySlideBox').currentIndex();
      // var slide = $scope.slides[index];
      // $scope.choose = parseInt(slide.value);
      // slide.list = PostService.getMyLists($scope.choose, false, true, slide.timestamp);
    });

    $scope.$on('$ionicView.loaded', function(ev){
      console.log("loaded history view");
      var historyList = PostService.getHistoryList();
      $scope.slides = historyList;
      $scope.currentIndex = 0;
      $scope.doRefresh();
    });

    $scope.deleteCare = function(){
      for (var i=0; i<$scope.lists.length; i++){
        if ($scope.lists[i]._id == window.localStorage.cancelCareId) {
          $scope.lists.splice(i,1);
          window.localStorage.cancelCareId = null;
        }
      }
    };

    $scope.canSwipe = function(isSwipe) {
      $ionicSlideBoxDelegate.enableSlide(isSwipe);
    };

    $scope.setAvatar = function(src){
      return PostService.setAvatar(src);
    };

    $scope.goPost = function(id, stopInertiaMove) {
      if (!$scope.user._id) {
        isGoPhoneLogin();
        return;
    }
      if ($scope.canGoPost) return;
      else $state.go('post', {postId: id});
    };
  }
);

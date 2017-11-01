angular.module('darwin.listCtrl', [])
.controller('ListCtrl',
  function($scope, $state, $ionicLoading, PkService, shareService, $stateParams, $ionicHistory, PostService, AuthService, globals) {
    $scope.type = parseInt($stateParams.type) || globals.myPosts.all;
    $scope.posts = [];
    $scope.unit = globals.currencyUnit;

    $scope.pkObj = PkService.getPkObj();
    shareService.getCtrlScope($scope);

    $scope.goBack = function(){
      console.log('going back from list');
      $ionicHistory.goBack();
    };

    $scope.showUserAccount = function($event){
      $event.stopPropagation();
      $state.go('account');
    };

    $scope.doRefresh = function() {
      console.log("refreshing list");
      $scope.posts = PostService.getMyPosts($scope.type, true, true);
    };

    $scope.isSelfPosted = function(post){
      return AuthService.isSelfPosted(post);
    };

    $scope.isSelfAnswered = function(post){
      return AuthService.isSelfAnswered(post);
    };

    $scope.isExpired = function(post){
      return PostService.isExpired(post);
    };

    $scope.isTicking = function(post){
      return PostService.isTicking(post);
    };

    $scope.isMine = function(post){
      return AuthService.isMine(post);
    };

    $scope.isWaiting = function(post) {
      if (!post) return false;
      if (post.status == globals.postState.active) return true;
      return false;
    };

    $scope.text = function(post){
      if (post.content.length > 0) return post.content;
      var text = "";
      if (post.photoFiles.length > 0) text = post.photoFiles.length + "张图片 ";
      if (post.audioFiles.length > 0) text += post.audioFiles.length + "个语音";
      return text;
    };

    $scope.avatar = function(post){
      return PostService.avatar(post);
    };

    $scope.doRefresh();
  }
);

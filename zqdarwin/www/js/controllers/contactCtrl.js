angular.module('darwin.contactCtrl', [])
.controller('contactCtrl',
  function($scope, $stateParams, $ionicHistory, $ionicLoading, AuthService, store, globals, PostService, shareService, $rootScope, $ionicViewSwitcher, $ionicModal, $state, $ionicPopup, $timeout, $interval, $ionicScrollDelegate, PkService, $ionicSlideBoxDelegate) {
    $scope.isPK = false;
    $scope.currentName = $state.current.name;
    $scope.user = store.getUser();
    $scope.isEmpty = false;
    $scope.pkObj = PkService.getPkObj();
    shareService.getCtrlScope($scope);

    $scope.showUserAccount = function($event){
      $event.stopPropagation();
      $ionicViewSwitcher.nextDirection("forward");
      $state.go('account');
    };
    
    $scope.goBack = function(){
      $ionicViewSwitcher.nextDirection("back");
      $ionicHistory.goBack();
    };

    $scope.$on('$ionicView.loaded', function(){
      console.log("loaded contactsList view");
      AuthService.getFriends(true).then(function(data) {
        $scope.isEmpty = (data == undefined);
        $scope.friendArr = data;
      });
    });

    $rootScope.$on("refreshFriendsList", function(event, data){
      console.log("refreshFriendsList done");
      AuthService.getFriends(true).then(function(data) {
        $scope.isEmpty = (data == undefined);
        $scope.friendArr = data;
      });
    });

    $scope.$on("$ionicView.afterEnter", function(ev){
      console.log("enter friendsList view");
      if ($stateParams.type) {
        $scope.img = ['data/darwin.png', 'data/debug.png', 'data/user1.png', 'data/user2.png', 'data/sports.png']
        $scope.pkFriends = function(info){
          console.log(info);
          console.log($stateParams.type);
          var obj = {type: $stateParams.type, _id: info._id};
          PkService.pkInviteFriends(obj).then(function(data){
            console.log(data);
            if (data.status == 'ok'){
              $scope.pkObj.invite = false;
              PkService.pkWaitingPopup($scope);
              $scope.pkObj.pkWaitingEnterAnimation = true;
              $scope.pkObj.ready = true;
            } else {
              PkService.closeBackButtonAction();
              $ionicLoading.show({template: data.status, noBackdrop: true, duration: 1000});
            }
          })
        };
      };
    });

});

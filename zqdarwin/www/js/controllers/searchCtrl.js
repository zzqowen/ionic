angular.module('darwin.searchCtrl', [])
.controller('searchCtrl',
  function($scope, $ionicHistory, $ionicViewSwitcher, PkService, shareService, $ionicLoading, AuthService, store, $rootScope, $ionicModal, $state, $ionicPopup, PostService) {
    $scope.currentName = $state.current.name;
    $scope.user = store.getUser();

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

    $scope.deleteFriend = function(item) {
      var confirmPopup = $ionicPopup.confirm({
        template: '你确定删除该好友?',
        cancelText: '取消',
        okText: '确认',
        cssClass: 'confirm'
      });
      confirmPopup.then(function(res) {
        if (res) {
          $scope.userFriends.splice($scope.userFriends.indexOf(item), 1);
          AuthService.delFriends(item._id).then(function(data){
            console.log(data);
            if (data.status && data.status == "ok"){
              $scope.doRefresh();
            }else{
              $ionicLoading.show({ template: '删除失败', noBackdrop: true, duration: 1000 });
            }
          })
        } else {
          console.log('cancel delete');
        }
      });
    };

    $scope.friendsSearchChange = function(){
      $scope.accountError = false;
    }

    $scope.friendsSearchKeyup = function($event, myValue){
      if ($event.keyCode == 13){
        AuthService.searchFriends(myValue).then(function(data){
          console.log(data);
          $scope.friendInfo = data;
          if (data.id == undefined){
            $scope.accountError = true;
          }else{
            $event.target.blur();
            $scope.item = data;
            $scope.item.level = data.score ? Math.ceil(data.score/1000) : 1;

            $scope.self_modal.hide();
            $ionicViewSwitcher.nextDirection("forward");
            $state.go('userInfo', {id : data._id})

            $scope.accountError = false;

          }
        });
      }
    };

    $ionicModal.fromTemplateUrl('views/common/informationSearch.html', {
      scope: $scope,
      animation: 'slide-in-right',
    }).then(function(modal) {
      $scope.self_modal = modal;
    });

    $scope.searchOpenModal = function() {
      $scope.self_modal.show();
      document.getElementById('id-search').value = "";
    };

    $scope.searchCloseModal = function() {
      $scope.self_modal.hide();
      $scope.showPersonInfo = false;
    };

})




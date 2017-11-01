angular.module('darwin.tabCtrl', [])
.controller('tabCtrl',
  function($scope, PostService, $state, store, $ionicPopup, AuthService, $ionicHistory, $timeout) {
    $scope.$on("$ionicView.afterEnter", function(ev){
        console.log("enter tab");
      });

      var isGoPhoneLogin = function() {
        $scope.isGoPhoneLogin = $ionicPopup.show({
         cssClass: 'confirm',
         scope: $scope,
         template: '请前往登录',
         buttons: [
           {
             text: '取消',
             type: 'button-default'
           },
           {
             text: '确认',
             type: 'button-positive',
             onTap: function(e) {
              $state.go('phoneLogin');
              $timeout(function(){
                AuthService.logOut();
                $ionicHistory.clearCache();
                $scope.isGoPhoneLogin.close();
              })
             }
           }
         ]
       });
     };

      $scope.goOthers = function(url) {
        var user = store.getUser();
        var isVisitor = !user._id;
        if (isVisitor) {
          isGoPhoneLogin();
          return;
        }
        switch(url) {
          case 'tab.friends': 
            $state.go('tab.friends');
            break;
          case 'tab.pk':
            $state.go('newpost');
            break;
          case 'tab.history':
            $state.go('tab.history');
            var historyIndex = AuthService.getScrollViewIndex().history;
            AuthService.triggerScrollViewPullToRefresh(AuthService.getInstances(historyIndex, 'history').getScrollView());
            break;
          case 'tab.account':
            $state.go('tab.account');
            break;
          default:
            $state.go('tab.home', {_id: '010101010101010101010101'});
            break;
        }

      }
    $scope.unreadMessages = PostService.getPushMessage();
  }
)




angular.module('darwin.friendsCtrl', [])
.controller('friendsCtrl',
  function($scope, $stateParams, $ionicHistory, $ionicLoading, AuthService, store, globals, PostService, shareService, $rootScope, $ionicViewSwitcher, $ionicModal, $state, $ionicPopup, $timeout, $interval, $ionicScrollDelegate, PkService, $ionicSlideBoxDelegate) {
    $scope.isPK = false;
    $scope.currentName = $state.current.name;
    $scope.user = store.getUser();
    $scope.isEmpty = false;
    $scope.theServe = globals.server.get();
    console.log($scope.user)

    $scope.pkObj = PkService.getPkObj();
    shareService.getCtrlScope($scope);
    $scope.slides = [];
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
      console.log("loaded friendsList view");
      $scope.currentIndex = 0;
      var friendsList = AuthService.getFriendsList();
      $scope.slides = friendsList;
      console.log($scope.slides);
      $scope.doRefresh($scope.currentIndex);
      AuthService.getFriends(true).then(function(data) {
        console.log(data);
        $scope.friendArr = data;
        console.log(data);
      });
      $scope.slideChanged(0);
    });

    $rootScope.$on("refreshFriendsList", function(event, data){
      console.log("refreshFriendsList done");
      $scope.doRefresh(0);
      $scope.doRefresh(1);
    });

    $scope.$on("$ionicView.afterEnter", function(ev){
      console.log("enter friendsList view");
      var slide = $scope.slides[$scope.currentIndex];
      if (slide.userFriends) {
        for (var key in slide.userFriends) {
          if (slide.userFriends.hasOwnProperty(key)) {
            if(slide.userFriends[key].peeks) slide.userFriends[key].isPaid = (slide.userFriends[key].peeks.indexOf($scope.user._id) != -1);
          };
        };
      };
      $ionicSlideBoxDelegate.enableSlide(false);
    });

    $scope.slideChanged = function(index) {
      $ionicSlideBoxDelegate.$getByHandle('friendsSlideBox').slide(index);
      AuthService.setScrollViewIndex(index, 'friends');
      $scope.currentIndex = index;
      if ($scope.slides[index].loaded) return;
      $scope.doRefresh(index);
    };

    $scope.getFriendsList = function(){
      var slide = $scope.slides[$scope.currentIndex];
      slide.loaded = true;
      if (slide.userFriends.length % globals.maxQuestions != 0 && !slide.hasMore) return;
      if (slide.isLoading) return;
      slide.isLoading = true;
      if (slide.userFriends.length != 0) slide.lastActTimeStamp = slide.userFriends[slide.userFriends.length - 1].date;
      AuthService.getFriendsActivity(slide.url, slide.lastActTimeStamp).then(
        function(data) {
          console.log(data);
          slide.hasMore = (data.length != 0 && data.length % globals.maxQuestions == 0);
          slide.userFriends = slide.userFriends.concat(data);
          console.log('load more')
          slide.isEmpty = (slide.userFriends.length != 0);

          for (var key in slide.userFriends) {
            if (slide.userFriends.hasOwnProperty(key)) {
              if(slide.userFriends[key].peeks) slide.userFriends[key].isPaid = (slide.userFriends[key].peeks.indexOf($scope.user._id) != -1);
            };
          };
        }
      ).finally(function(error) {
        slide.isLoading = false;
        $scope.$broadcast('scroll.infiniteScrollComplete');
        $scope.$broadcast('scroll.refreshComplete');
      });
    };

    $scope.doRefresh = function(index) {
      var slide = $scope.slides[index];
      slide.loaded = false;
      slide.lastActTimeStamp = 0;
      slide.userFriends = [];
      $scope.getFriendsList();
    };

    $scope.payForAnswers = function(id, price, index){
      var slide = $scope.slides[$scope.currentIndex];
      $scope.price = price;
      $ionicModal.fromTemplateUrl('views/app/showPayReminder.html',{
        scope: $scope,
        animation:'superScaleIn'
      }).then(function(modal){
        $scope.reminderModal = modal;
        $scope.closeModal = function(result) {
          $scope.reminderModal.remove();
          console.log(result);
          if (!result) return;
          PostService.showAnswer(id).then(function(data){
            console.log(data);
            if (data.status == "ok"){
              slide.userFriends[index].isPaid = true;
              $ionicViewSwitcher.nextDirection("forward");
              $state.go('post', {postId: id});
            }
          }).finally(function(error) {
            $scope.$broadcast('scroll.infiniteScrollComplete');
            $scope.$broadcast('scroll.refreshComplete');
          });
        };
        $scope.reminderModal.show();
      });
    };

    $scope.lookAnswers = function(id){
      $ionicViewSwitcher.nextDirection("forward");
      $state.go('post', {postId: id});
    };

    $scope.canSwipe = function(isSwipe) {
      $ionicSlideBoxDelegate.enableSlide(isSwipe);
    };
});


// angular.module('darwin.friendsCtrl', [])
// .controller('friendsCtrl',
//   function($scope, $stateParams, $ionicHistory, $ionicLoading, AuthService, store, globals, PostService, shareService, $rootScope, $ionicViewSwitcher, $ionicModal, $state, $ionicPopup, $timeout, $interval, $ionicScrollDelegate, PkService, $ionicSlideBoxDelegate) {
//     $scope.isPK = false;
//     $scope.currentName = $state.current.name;
//     $scope.user = store.getUser();
//     $scope.isEmpty = false;
//     $scope.theServe = globals.server.get();
//     $scope.pkObj = PkService.getPkObj();
//     shareService.getCtrlScope($scope);
//     $scope.showUserAccount = function($event){
//       $event.stopPropagation();
//       $ionicViewSwitcher.nextDirection("forward");
//       $state.go('account');
//     };
    
//     $scope.goBack = function(){
//       $ionicViewSwitcher.nextDirection("back");
//       $ionicHistory.goBack();
//     };

//     $scope.$on('$ionicView.loaded', function(){
//       console.log("loaded friendsList view");
//       AuthService.getFriendsActivity("/moments/stranger", 0).then(
//         function(data) {
//           $scope.seeSingle = data;
//           console.log($scope.seeSingle);
//         }
//       ).finally(function(error) {
//         slide.isLoading = false;
//         $scope.$broadcast('scroll.infiniteScrollComplete');
//         $scope.$broadcast('scroll.refreshComplete');
//       });
//     });

//     $rootScope.$on("refreshFriendsList", function(event, data){
//       console.log("refreshFriendsList done");
//     });

//     $scope.$on("$ionicView.afterEnter", function(ev){
//       console.log("enter friendsList view");
//       // var slide = $scope.slides[$scope.currentIndex];
//       // if (slide.userFriends) {
//       //   for (var key in slide.userFriends) {
//       //     if (slide.userFriends.hasOwnProperty(key)) {
//       //       slide.userFriends[key].isPaid = (slide.userFriends[key].peeks.indexOf($scope.user._id) != -1);
//       //     };
//       //   };
//       // };
//     });

//     $scope.getFriendsList = function(){
//       var slide = $scope.slides[$scope.currentIndex];
//       slide.loaded = true;
//       if (slide.userFriends.length % globals.maxQuestions != 0 && !slide.hasMore) return;
//       if (slide.isLoading) return;
//       slide.isLoading = true;
//       if (slide.userFriends.length != 0) slide.lastActTimeStamp = slide.userFriends[slide.userFriends.length - 1].date;
//       AuthService.getFriendsActivity(slide.url, slide.lastActTimeStamp).then(
//         function(data) {
//           slide.hasMore = (data.length != 0 && data.length % globals.maxQuestions == 0);
//           slide.userFriends = slide.userFriends.concat(data);
//           console.log('load more')
//           slide.isEmpty = (slide.userFriends.length != 0);

//           for (var key in slide.userFriends) {
//             if (slide.userFriends.hasOwnProperty(key)) {
//               slide.userFriends[key].isPaid = (slide.userFriends[key].peeks.indexOf($scope.user._id) != -1);
//             };
//           };
//         }
//       ).finally(function(error) {
//         slide.isLoading = false;
//         $scope.$broadcast('scroll.infiniteScrollComplete');
//         $scope.$broadcast('scroll.refreshComplete');
//       });
//     };

//     $scope.doRefresh = function(index) {
//       var slide = $scope.slides[index];
//       slide.loaded = false;
//       slide.lastActTimeStamp = 0;
//       slide.userFriends = [];
//       $scope.getFriendsList();
//     };

//     $scope.payForAnswers = function(id, price){
//       //var slide = $scope.slides[$scope.currentIndex];
//       $scope.price = price;
//       $ionicModal.fromTemplateUrl('views/app/showPayReminder.html',{
//         scope: $scope,
//         animation:'superScaleIn'
//       }).then(function(modal){
//         $scope.reminderModal = modal;
//         $scope.closeModal = function(result) {
//           $scope.reminderModal.remove();
//           if (!result) return;
//           //slide.userFriends[index].isPaid = true;
//           PostService.showAnswer(id);
//           $ionicViewSwitcher.nextDirection("forward");
//           $state.go('post', {postId: id});
//         };
//         $scope.reminderModal.show();
//       });
//     };

//     $scope.lookAnswers = function(id){
//       $ionicViewSwitcher.nextDirection("forward");
//       $state.go('post', {postId: id});
//     };

//     $scope.canSwipe = function(isSwipe) {
//       $ionicSlideBoxDelegate.enableSlide(isSwipe);
//     };
// });
angular.module('darwin.homeCtrl', [])
.controller('HomeCtrl',
  function($scope, $rootScope, $state, PkService, shareService, $ionicLoading, $ionicHistory, $timeout, PostService, AuthService, globals, store, $ionicViewSwitcher, $ionicSlideBoxDelegate, $ionicTabsDelegate, $ionicScrollDelegate, $stateParams, $ionicPopup, PushServer) {
    console.log('initializing home');
    $scope.user = store.getUser();
    $scope.unit = globals.currencyUnit;
    $scope.slides = [];
    $scope.imglist = [];
    $scope.showWaiting = false;

    $scope.pkObj = PkService.getPkObj();
    shareService.getCtrlScope($scope);

    $scope.updateCategory = function() {
      var index = $ionicSlideBoxDelegate.$getByHandle('homeSlideBox').currentIndex();
      var categoryName = $scope.slides[index];
      if (categoryName.name != '推荐') {
        window.localStorage.selectedCategoryName = categoryName.name;
        window.localStorage.selectedCategoryValue = categoryName.value;
      }
    }

    $scope.showUserAccount = function($event){
      $event.stopPropagation();
      $ionicViewSwitcher.nextDirection("forward");
      $state.go('account');
    };

    $scope.$on("$ionicView.loaded", function(ev){
      console.log("loaded home view");
      var postList = PostService.getPostsList();
      $scope.slides = postList;
      $scope.currentIndex = 0;
      $scope.showWaiting = true;
      $scope.getBanner();
      $scope.doRefresh();
      AuthService.getFriends(true).then(function(data) {
        $scope.friendArr = data;
      });
    });

    var viewVisible = true;
    $scope.$on("$ionicView.afterEnter", function(ev){
      console.log("enter home view");
      if ($scope.currentIndex == 0) {
        $ionicSlideBoxDelegate.$getByHandle('homeSlideBox').enableSlide(false);
      };
      viewVisible = true;
      var index = $ionicSlideBoxDelegate.$getByHandle('homeSlideBox').currentIndex();
      var slide = $scope.slides[index];
      if (slide.posts.length != 0) {
        for (var key in slide.posts) {
          if (slide.posts.hasOwnProperty(key)) {
            if (slide.posts[key].status != 0) slide.posts.splice(key, 1);
          };
        };
      };
      $ionicSlideBoxDelegate.$getByHandle('slideimgs').update();
      $ionicSlideBoxDelegate.$getByHandle('slideimgs').loop(true);
      $ionicHistory.clearHistory();
    });

    $scope.$on("$ionicView.afterLeave", function(ev){
      console.log("leave home view");
      viewVisible = false;
    });

    // $scope.getBanner = function() {
    //   return PostService.getSlideImg().then(function(data){
    //     console.log(data);
    //     $scope.imglist = data;
    //     console.log($scope.imglist.length);
    //     $scope.showBanner = ($scope.imglist.length == 0);
    //     $scope.showPager = ($scope.imglist.length == 1);
    //   });
    // };

    $scope.getBanner = function() {
      PostService.getBanner().then(function(data){
        $scope.imglist = data.banner;
        console.log($scope.imglist.length);
        $scope.showBanner = ($scope.imglist.length == 0);
        $scope.showPager = ($scope.imglist.length == 1);
      });
    };

    $scope.slideChanged = function(index) {
      $ionicSlideBoxDelegate.$getByHandle('homeSlideBox').slide(index);
      AuthService.setScrollViewIndex(index, 'home');
      $scope.currentIndex = index;
      if (index == 0) {
        $ionicSlideBoxDelegate.$getByHandle('homeSlideBox').enableSlide(false);
      };
      $scope.refresh = (index == 0);
      if ($scope.slides[index].loaded) return;
      $scope.showWaiting = true;
      $scope.doRefresh();
    };

    $scope.slideDouble = function(index){
      AuthService.triggerScrollViewPullToRefresh(AuthService.getInstances(index, 'home').getScrollView());
    }

    $scope.canSwipe = function(isSwipe, $event) {
      $ionicSlideBoxDelegate.$getByHandle('homeSlideBox').enableSlide(isSwipe);
      // var position = $ionicSlideBoxDelegate.$getByHandle('homeSlideBox').getScrollPosition();
      
    };
    $scope.onSwipe = function($event) {
      var el = $event.target,
      dx = $event.gesture.deltaX,
      dy = $event.gesture.deltaY;
    }

    $scope.loadMore = function() {
      var index = $ionicSlideBoxDelegate.$getByHandle('homeSlideBox').currentIndex();
      var slide = $scope.slides[index];
      var id = $stateParams._id;
      slide.loaded = true;
      if (slide.posts.length % globals.maxQuestions != 0 && !slide.hasMore) return;
      if (slide.isLoading) return;
      console.debug("loading more for tab", index);
      slide.isLoading = true;
      $scope.refresh = (slide.url == '/get_recent_posts/');
      if (slide.posts.length != 0) {
        slide.timestamp = slide.posts[slide.posts.length - 1].date;
        slide.from = slide.posts[slide.posts.length - 1].author.source;
      }
      $timeout(function() {
        PostService.getRecentPosts($scope.refresh, slide.url, slide.timestamp, slide.from, id).then(function(data) {
          slide.hasMore = (data.posts.length != 0 && data.posts.length % globals.maxQuestions == 0);
          slide.posts = slide.posts.concat(data.posts);
          console.log('load more');
          slide.isEmpty = (slide.posts.length != 0);
        }).finally(function(error) {
          $scope.showWaiting = false;
          slide.isLoading = false;
          $scope.$broadcast('scroll.infiniteScrollComplete');
          $scope.$broadcast('scroll.refreshComplete');
        });
      }, 500);
    };

    $scope.doRefresh = function() {
      if (!viewVisible) return console.log("doRefresh deferred");
      var index = $ionicSlideBoxDelegate.$getByHandle('homeSlideBox').currentIndex();
      var slide = $scope.slides[index];
      slide.loaded = false;
      slide.timestamp = null;
      slide.posts = [];
      slide.from = null;
      $scope.loadMore();
    }

    $scope.avatar = function(post){
      return PostService.avatar(post);
    };

    $rootScope.$on("refreshHomePage", function(event, data){
      console.log("refreshHomePage");
      $scope.doRefresh();
    });

    $scope.doubleHome = function(){
      console.log(10000);
      $scope.doRefresh();
    };

    $scope.goBanner = function(index){
      var url = $scope.imglist[index].url;
      AuthService.showAbout(url);
    };

    $scope.canGoPost = false;
    window.addEventListener('touchstart', function(e) {
      console.log(ionic.scroll.isScrolling);
      if (ionic.scroll.isScrolling) {
        $scope.canGoPost = true;
        ionic.scroll.isScrolling = false;
      } else {
        $scope.canGoPost = false;
      }
    });
    $scope.goBack = function() {
      $ionicHistory.goBack();
    };

    var isGoPhoneLogin = function() {
      $scope.isGoPhoneLogin = $ionicPopup.show({
       cssClass: 'confirm',
       scope: $scope,
       template: '请前往登录',
       buttons: [
         {
           text: '取消',
           type: 'button-default',
           onTap: function() {
             $scope.goBack();
           }
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

    $scope.goPost = function(id, stopInertiaMove) {
      if (!$scope.user._id) {
        isGoPhoneLogin();
        return;
    }
      if ($scope.canGoPost) return;
      else $state.go('post', {postId: id});
    };

    $scope.setAvatar = function(src){
      return PostService.setAvatar(src);
    };

  }
);

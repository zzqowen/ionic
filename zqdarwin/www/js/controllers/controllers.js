angular.module('darwin.controllers', ['darwin.services'])

// APP - RIGHT MENU
.controller('AppCtrl', function($scope, AuthService, store) {
  $scope.user = store.getUser();
})

// CATEGORIES MENU
.controller('PushMenuCtrl', function($scope, Categories) {

  var getItems = function(parents, categories){

    if(parents.length > 0){

      _.each(parents, function(parent){
        parent.name = parent.title;
        parent.link = parent.slug;

        var items = _.filter(categories, function(category){ return category.parent===parent.id; });

        if(items.length > 0){
          parent.menu = {
            title: parent.title,
            id: parent.id,
            items:items
          };
          getItems(parent.menu.items, categories);
        }
      });
    }
    return parents;
  };

  Categories.getCategories()
  .then(function(data){
    var sorted_categories = _.sortBy(data.categories, function(category){ return category.title; });
    var parents = _.filter(sorted_categories, function(category){ return category.parent===0; });
    var result = getItems(parents, sorted_categories);

    $scope.menu = {
      title: 'All Categories',
      id: '0',
      items: result
    };
  });
})


// BOOKMARKS
.controller('BookMarksCtrl', function($scope, $rootScope, BookMarkService) {

  $scope.bookmarks = BookMarkService.getBookmarks();

  // When a new post is bookmarked, we should update bookmarks list
  $rootScope.$on("new-bookmark", function(event, post_id){
    $scope.bookmarks = BookMarkService.getBookmarks();
  });

  $scope.remove = function(bookmarkId) {
    BookMarkService.remove(bookmarkId);
    $scope.bookmarks = BookMarkService.getBookmarks();
  };
})


//EMAIL SENDER
.controller('EmailSenderCtrl', function($scope, $cordovaEmailComposer) {

  $scope.sendFeedback = function(){
    cordova.plugins.email.isAvailable(
      function (isAvailable) {
        // alert('Service is not available') unless isAvailable;
        cordova.plugins.email.open({
          to:      'dev@aihuawen.com',
          cc:      '',
          subject: '用户反馈',
          body:    '专家问答真棒！'
        });
      }
    );
  };

  $scope.sendContactMail = function(){
    //Plugin documentation here: http://ngcordova.com/docs/plugins/emailComposer/

    $cordovaEmailComposer.isAvailable().then(function() {
      // is available
        $cordovaEmailComposer.open({
          to: 'dev@aihuawen.com',
          cc: '',
          subject: '分享联系人',
          body: '你好！'
        })
        .then(null, function () {
          // user cancelled email
        });
    }, function () {
      // not available
    });
  };

})


// RATE THIS APP
.controller('RateAppCtrl', function($scope) {

  $scope.rateApp = function(){
    if(ionic.Platform.isIOS()){
      AppRate.preferences.storeAppURL.ios = 'com.aihuawen.darwin';
      AppRate.promptForRating(true);
    }else if(ionic.Platform.isAndroid()){
      AppRate.preferences.storeAppURL.android = 'market://details?id=com.aihuawen.darwin';
      AppRate.promptForRating(true);
    }
  };
})


//ADMOB
.controller('AdmobCtrl', function($scope, $ionicActionSheet, AdMob) {

  $scope.manageAdMob = function() {

    // Show the action sheet
    var hideSheet = $ionicActionSheet.show({
      //Here you can add some more buttons
      buttons: [
      { text: 'Show AdMob Banner' },
      { text: 'Show AdMob Interstitial' }
      ],
      destructiveText: 'Remove Ads',
      titleText: 'Choose the ad to show',
      cancelText: 'Cancel',
      cancel: function() {
        // add cancel code..
      },
      destructiveButtonClicked: function() {
        console.log("removing ads");
        AdMob.removeAds();
        return true;
      },
      buttonClicked: function(index, button) {
        if(button.text == 'Show AdMob Banner')
        {
          console.log("show AdMob banner");
          AdMob.showBanner();
        }
        if(button.text == 'Show AdMob Interstitial')
        {
          console.log("show AdMob interstitial");
          AdMob.showInterstitial();
        }
        return true;
      }
    });
  };
})


//IAD
.controller('iAdCtrl', function($scope, $ionicActionSheet, iAd) {

  $scope.manageiAd = function() {

    // Show the action sheet
    var hideSheet = $ionicActionSheet.show({
      //Here you can add some more buttons
      buttons: [
      { text: 'Show iAd Banner' },
      { text: 'Show iAd Interstitial' }
      ],
      destructiveText: 'Remove Ads',
      titleText: 'Choose the ad to show - Interstitial only works in iPad',
      cancelText: 'Cancel',
      cancel: function() {
        // add cancel code..
      },
      destructiveButtonClicked: function() {
        console.log("removing ads");
        iAd.removeAds();
        return true;
      },
      buttonClicked: function(index, button) {
        if(button.text == 'Show iAd Banner')
        {
          console.log("show iAd banner");
          iAd.showBanner();
        }
        if(button.text == 'Show iAd Interstitial')
        {
          console.log("show iAd interstitial");
          iAd.showInterstitial();
        }
        return true;
      }
    });
  };
})

.controller('AboutCtrl', function($scope) {
})

;

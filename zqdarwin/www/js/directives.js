angular.module('darwin.directives', [])

.directive('recursiveMenu', function($compile) {
  return {
    restrict: 'EACM',
    priority: 100000,
    compile: function(tElement, tAttr) {
      var compiledContents, contents;
      contents = tElement.contents().remove();
      compiledContents = null;
      return function(scope, iElement, iAttr) {
        if (!compiledContents) {
          compiledContents = $compile(contents);
        }
        compiledContents(scope, function(clone, scope) {
          return iElement.append(clone);
        });
      };
    }
  };
})

.directive('pushMenu', function(){
  return {
    scope: {
      menu: '=',
      level: '='
    },
    controller: function($scope, $element, $attrs) {
      this.getMenu = function(){
        return $scope.menu;
      };
    },
    templateUrl: 'views/common/main-menu.html',
    restrict: 'E',
    replace: true,
    transclude: true
  };
})

.directive('menuLevel', function(_){
  return {
    scope: {
      menu: '=',
      level: '='
    },
    link: function(scope, element, attr, menuCtrl) {
      scope.original_menu = menuCtrl.getMenu();
      scope.childrenLevel = scope.level + 1;

      scope.openSubMenu = function(item_menu, parent_menu, $event) {
        // console.log("open sub menu from child directive");
        // Check if it has sub levels
        if(!_.isUndefined(item_menu) && !_.isUndefined(item_menu.items) && item_menu.items.length > 0)
        {
          // console.log("has sub menus, OPENING!");
          $event.preventDefault();

          // Open sub menu
          var sub_level = document.querySelector('.mp-level.level-id-'+item_menu.id);
          this.$parent._openMenu(sub_level);
        }
      };

      scope.backToPreviousMenu = function(menu, $event){
        $event.preventDefault();
        $event.stopPropagation();

        // Close current menu
        var current_level = document.querySelector('.mp-level.level-id-'+menu.id);
        this.$parent._closeMenu(current_level);
      };

      scope._setTransform = function(val, el){
        el.style.WebkitTransform = val;
        el.style.MozTransform = val;
        el.style.transform = val;
      };

      scope._openMenu = function(level){
        // console.log("opening menu!");
        this._setTransform('translate3d(0,0,0)', level);
      };

      scope._closeMenu = function(level){
        // console.log("closing menu!");
        this._setTransform('translate3d(100%,0,0)', level);
      };
    },
    templateUrl: 'views/app/search/menu-level.html',
    require: '^pushMenu',
    restrict: 'EA',
    replace: true,
    transclude: true
  };
})

.directive('search', function(_, SearchService, $q){
  return {
    scope: {
      // menu: '=',
      // shown: '='
    },
    controller: function($scope) {
      var utils = this;

      $scope.close_shown = false;

      this.showClose = function(){
        // Think i have to use apply because this function is not called from this controller ($scope)
        $scope.$apply(function () {
          $scope.close_shown = true;
        });
      };

      this.hideClose = function(){
        // This method is called from hideResultsPanel that is called from $scope.closeSearch,
        // which is triggered from within the directive so it doesn't need $scope.apply
        $scope.close_shown = false;
      };

      this.showResultsPanel = function(query){
        utils.showClose();
        // console.log("broadcast show-results-panel");
        var search_results_promise = null;
        if(!_.isUndefined(query))
        {
          // Then perform search, and returns a promise
          search_results_promise = SearchService.search(query);
        }
        $scope.$broadcast("show-results-panel", search_results_promise);
      };

      this.cleanResultsPanel = function(){
        // console.log("broadcast clean-results-panel");
        $scope.$broadcast("clean-results-panel");
      };

      this.hideResultsPanel = function(){
        // console.log("broadcast hide-results-panel");
        utils.hideClose();
        $scope.$broadcast("hide-results-panel", 1);
      };

      $scope.closeSearch = function($event) {
        $event.stopPropagation();
        $event.preventDefault();
        // console.log("close search, should hide panel");
        // console.log($event);
        utils.hideResultsPanel();
      };

      // $scope.closeSearch = function() {
      //   utils.hideResultsPanel();
      // };
    },
    templateUrl: 'views/app/search/search.html',
    restrict: 'E',
    replace: true,
    transclude: true
  };
})

.directive('searchInput', function($timeout, SearchService){
  return {
    require: '^search',
    link: function(scope, element, attr, searchCtrl) {
      var timeout = null;

      scope.$on("hide-results-panel", function(event, value){
        // console.log("Broadcast received, value: ", value);
        $timeout.cancel(timeout);
        // console.log("CANCEL because of hide panel");
        element[0].value = "";
      });

      element.on('focus', function(event) {
        // event.preventDefault();
        // event.stopPropagation();
        // console.log("FOCUS on (current target): ", event.currentTarget);
        // console.log("FOCUS on (target): ", event.target);
        // maybe emit event here so the serch results directive can update itself
        searchCtrl.showResultsPanel();
      });

      element.on('keyup', function(event) {
        event.preventDefault();
        event.stopPropagation();
        // console.log("KEYUP!");

        var target = this;

        if(timeout !== null)
        {
          // console.log("canceling search");
          $timeout.cancel(timeout);
        }

        var query = target.value;

        timeout = $timeout(function(){

          if(query.trim().length>0)
          {
            // Perform search
            searchCtrl.showResultsPanel(query);
            // console.log("searching for query: ", query);
          }
          else
          {
            // Clean previous search results
            searchCtrl.cleanResultsPanel();
          }
        }, 800);
      });

    },
    restrict: 'A'
  };
})

.directive('searchResults', function(_){
  return {
    require: '^search',
    link: function(scope, element, attr, searchCtrl) {
      var _setTransform = function(val, el){
            el.style.WebkitTransform = val;
            el.style.MozTransform = val;
            el.style.transform = val;
          };

      scope.$on("show-results-panel", function(event, search_results_promise){
        // console.log("Broadcast received, value: ", search_results_promise);

        _setTransform('translate3d(0,0,0)', element[0]);

        // search_results_promise is null when we the search query was empty
        if(search_results_promise)
        {
          // Then show search results in tabs
          search_results_promise.then(function(results){
            // console.log("promise DONE, search OK: ", results);
            scope.loadSearchResults(results);
          }, function(error){
            // console.log("search ERROR: ", error);
          });
        }
      });

      scope.$on("clean-results-panel", function(event, value){
        // Clean previous search results
        scope.cleanSearchResults();
      });

      scope.$on("hide-results-panel", function(event, value){
        // console.log("Broadcast received, value: ", value);
        _setTransform('translate3d(0,100%,0)', element[0]);
      });
    },
    controller: function($scope) {
      var tabs = $scope.tabs = [];
      $scope.query = "";

      $scope.select = function(tab) {
        angular.forEach(tabs, function(tab) {
          tab.selected = false;
        });
        tab.selected = true;
      };

      $scope.loadSearchResults = function(results){
        _.each(tabs, function(tab){
          var tab_search = _.findWhere(results, {_id : tab.tabid});
          tab.results = tab_search.results;
        });
      };

      $scope.cleanSearchResults = function(){
        _.each(tabs, function(tab){
          tab.results = [];
        });
      };

      this.addTab = function(tab) {
        if (tabs.length === 0) {
          $scope.select(tab);
        }
        tabs.push(tab);
      };
    },
    templateUrl: 'views/app/search/search-results.html',
    restrict: 'E',
    replace: true,
    transclude: true
  };
})

.directive('myTab', function($state, $ionicHistory) {
  return {
    require: '^searchResults',
    restrict: 'E',
    transclude: true,
    scope: {
      title: '@',
      tabid: '@',
      query: '@query',
    },
    link: function(scope, element, attrs, tabsCtrl) {
      // This helped me understand scope inheritance between directives in angular: https://github.com/angular/angular.js/wiki/Understanding-Scopes
      scope.results = [];
      tabsCtrl.addTab(scope);

      scope.goToPost = function(post){
        $ionicHistory.nextViewOptions({
          disableAnimate: true
        });
        $state.go('post', {postId: post.id});
      };
    },
    templateUrl: 'views/common/my-tab.html'
  };
})


.directive('postCard', function() {
  return {
    scope: true,
      link: function(scope, element, attrs){
      scope.previewPhoto = (attrs.preview != null);
      scope.showAction = (attrs.action != null);
      scope.showTimer = (attrs.timer != null);
    },
    templateUrl: 'views/app/post-card.html'
  };
})

.directive('rankCard', function() {
  return {
    scope: true,
      link: function(scope, element, attrs){
      scope.previewPhoto = (attrs.preview != null);
      scope.showAction = (attrs.action != null);
      scope.showTimer = (attrs.timer != null);
    },
    templateUrl: 'views/app/rank-card.html'
  };
})

.directive('historyCard', function(globals) {
  return {
    scope: true,
      link: function(scope, element, attrs){
      scope.previewPhoto = (attrs.preview != null);
      scope.showAction = (attrs.action != null);
      scope.showTimer = (attrs.timer != null);
      scope.enableListView = (attrs.list != null);
      if (attrs.questions != null) scope.type = globals.myPosts.questions;
      else if (attrs.replies != null) scope.type = globals.myPosts.replies;
      else scope.type = globals.myPosts.all;
      },
    templateUrl: 'views/app/history-card.html'
  };
})

.directive('showHideContainer', function(){
  return {
    scope: {

    },
    controller: function($scope, $element, $attrs) {
      $scope.show = false;

      $scope.toggleType = function($event){
        $event.stopPropagation();
        $event.preventDefault();

        $scope.show = !$scope.show;

        // Emit event
        $scope.$broadcast("toggle-type", $scope.show);
      };
    },
    templateUrl: 'views/common/show-hide-password.html',
    restrict: 'A',
    replace: false,
    transclude: true
  };
})


.directive('showHideInput', function(){
  return {
    scope: {

    },
    link: function(scope, element, attrs) {
      // listen to event
      scope.$on("toggle-type", function(event, show){
        var password_input = element[0],
            input_type = password_input.getAttribute('type');

        if(!show)
        {
          password_input.setAttribute('type', 'password');
        }

        if(show)
        {
          password_input.setAttribute('type', 'text');
        }
      });
    },
    require: '^showHideContainer',
    restrict: 'A',
    replace: false,
    transclude: false
  };
})


//Use this directive to open external links using inAppBrowser cordova plugin
.directive('dynamicAnchorFix', function($ionicGesture, $timeout, $cordovaInAppBrowser) {
  return {
    scope: {},
    link: function(scope, element, attrs) {
      $timeout(function(){
        var anchors = element.find('a');
        if(anchors.length > 0)
        {
          angular.forEach(anchors, function(a) {

            var anchor = angular.element(a);

            anchor.bind('click', function (event) {
              event.preventDefault();
              event.stopPropagation();

              var href = event.currentTarget.href;
              var  options = {};

              //inAppBrowser see documentation here: http://ngcordova.com/docs/plugins/inAppBrowser/

              $cordovaInAppBrowser.open(href, '_blank', options)
                .then(function(e) {
                  // success
                })
                .catch(function(e) {
                  // error
                });
            });

          });
        }
      }, 10);
    },
    restrict: 'A',
    replace: false,
    transclude: false
  };
})

.directive('preImg', function() {
  return {
    restrict: 'E',
    transclude: true,
    scope: {
      ratio:'@',
      helperClass: '@'
    },
    controller: function($scope) {
      $scope.loaded = false;

      this.hideSpinner = function(){
        // Think i have to use apply because this function is not called from this controller ($scope)
        $scope.$apply(function () {
          $scope.loaded = true;
        });
      };
    },
    templateUrl: 'views/common/pre-img.html'
  };
})

.directive('spinnerOnLoad', function() {
  return {
    restrict: 'A',
    require: '^preImg',
    scope: {
      ngSrc: '@'
    },
    link: function(scope, element, attr, preImgController) {
      element.on('load', function() {
        preImgController.hideSpinner();
      });
    }
  };
})

.directive('backgroundImg', function(util){
  return{
    link: function(scope, element, attrs){
    var size = "40px";
    if (attrs.huge != null) size = "80px";
    else if (attrs.big != null) size = "50px";
    else if (attrs.bigger != null) size = "65px";
    else if (attrs.small != null) size= "30px";
    else if (attrs.tiny != null) size= "15px";
    var radius = "0px";
    if (attrs.round != null) radius = "50%";
    else if (attrs.curve != null) radius = "10px";

    var setImg = function(){
      var srcUrl = attrs.src;
      if (attrs.thumbnail != null) srcUrl = util.getThumbnailUrl(attrs.src);
      element.css({
        'background-image': 'url(' + srcUrl +')',
        'background-repeat': 'no-repeat',
        'background-size': attrs.backgroundSize == null? "cover" : attrs.backgroundSize,
        'background-position': attrs.backgroundPosition == null ? 'center center' : attrs.backgroundPosition,
        'border-radius': attrs.radius == null ? radius : attrs.radius,
        'width': attrs.width == null ? size : attrs.width,
        'height': attrs.height == null ? size : attrs.height,
        'border': attrs.border == null ? '0' : attrs.border,
        'margin': attrs.margin == null ? '0' : attrs.margin,
        'opacity': attrs.opacity == null ? '1' : attrs.opacity,
        'z-index': attrs.zIndex == null ? '0' : attrs.zIndex,
        'position': attrs.position == null ? 'static' : attrs.position,
        'top': attrs.top == null ? '0' : attrs.top,
        'left': attrs.left == null ? '0' : attrs.left,
      });
    };
    setImg();

    scope.$watch(function () {
      return attrs.src;
    }, function (val) {
      setImg();
    });
    }
  };
})

.directive('voiceButton', function(AudioService, $timeout, $interval, globals){
  return{
    scope: true,
    link: function(scope, element, attrs){
      scope.noborder = (attrs.noborder != null);
      if (attrs.recording != null){
        scope.recording = true;
        scope.content = (attrs.recording == 'true') ? '松开 结束' : '按住 说话';
        element.css({
          'width': "150px",
        });
      }
      else if (attrs.seconds != null){
        scope.recording = false;
        scope.content = "";
        if (!attrs.seconds || attrs.seconds.length == 0) attrs.seconds = "0";
        if(attrs.seconds && attrs.seconds < 60) scope.content = attrs.seconds + "\"";
        if(attrs.seconds && attrs.seconds > 59 && attrs.seconds < 3600) scope.content = parseInt(attrs.seconds/60) + "\'" + attrs.seconds%60 + "\"";


        scope.flip = (attrs.flip == 'true');
        var file = attrs.file;
        scope.isPlaying = false;

        scope.playFile = function ($event) {
          $event.stopPropagation();
          if (!scope.isPlaying){
            scope.isPlaying = true;
            console.log(scope.isPlaying);
            scope.voiceProgressBarLenth = 0;
            var time = attrs.seconds*globals.timeConversionConstant;
            scope.timer = $interval(function(){ scope.voiceProgressBarLenth++; },time,100);
            AudioService.playFile(file, function () {
              console.log('voice-button playFile done');
              $timeout(function(){ 
                console.log(scope.isPlaying);
                console.log(time);
                return scope.isPlaying = false;});
            }, function (err) {
              console.log('voice-button playFile', err);
              $timeout(function(){ return scope.isPlaying = false;});
            })
          }
          else{
            console.log('voice-button stop playing');
            scope.isPlaying = false;
            $interval.cancel(scope.timer);
            AudioService.stop();
          }
        }
      }
    },
    templateUrl: 'views/common/voice-button.html',
    };
})

.directive('listenButton', function(AudioService, $timeout, $interval, globals){
    return{
    scope: true,
    link: function(scope, element, attrs){
        if (!attrs.seconds || attrs.seconds.length == 0) attrs.seconds = "0";
        console.log(attrs.seconds);
        if(attrs.seconds && attrs.seconds < 60) scope.content = attrs.seconds + "\'";
        if(attrs.seconds && attrs.seconds > 59 && attrs.seconds.length < 3600) scope.content = parseInt(attrs.seconds/60) + "\"" + attrs.seconds%60 + "\'";

        var file = attrs.file;
        scope.isPlaying = false;

        scope.playFile = function ($event) {
          $event.stopPropagation();
          if (!scope.isPlaying){
            scope.isPlaying = true;
            scope.voiceProgressBarLenth = 0;
            var time = attrs.seconds*globals.timeConversionConstant;
            scope.timer = $interval(function(){ scope.voiceProgressBarLenth++; },time,100);
            AudioService.playFile(file, function () {
              console.log('listen-button playFile done');
              $timeout(function(){ return scope.isPlaying = false; });
            }, function (err) {
              console.log('listen-button playFile', err);
              $timeout(function(){ return scope.isPlaying = false; });
            })
          }
          else{
            console.log('listen-button stop playing');
            scope.isPlaying = false;
            $interval.cancel(scope.timer);
            AudioService.stop();
          }
        }
      },
    templateUrl: 'views/common/listen-button.html',
    };
})

.directive('toggleButton', function(){
    return{
    scope: {
      category: '=',
    },
      link: function(scope, element, attrs){
      element.addClass("toggle-button");
      var update = function(){
        if (scope.category.selected) element.addClass("toggle-button-selected");
        else element.removeClass("toggle-button-selected");
      };
      update();
      scope.$watch('category.selected', function(){ update(); });
      },
    template: "{{category.name}}"
    };
})

.directive('confirmPwd', function($interpolate, $parse) {
  return {
    require: 'ngModel',
    link: function(scope, elem, attr, ngModelCtrl) {

      var pwdToMatch = $parse(attr.confirmPwd);
      var pwdFn = $interpolate(attr.confirmPwd)(scope);

      scope.$watch(pwdFn, function(newVal) {
          ngModelCtrl.$setValidity('password', ngModelCtrl.$viewValue == newVal);
      })

      ngModelCtrl.$validators.password = function(modelValue, viewValue) {
        var value = modelValue || viewValue;
        return value == pwdToMatch(scope);
      };

    }
  }
})

.directive('fontSize', function($window){
  return {
    link: function(scope, elem, attr){
      var changeFontsize = function(){
        elem.css({
          'font-size': (elem[0].offsetWidth/750)*100 + 'px'
        })
      }
      changeFontsize();
      angular.element($window).on('resize', function() {
        changeFontsize();
      })
    }
  }
})

.directive('textLength', function(){
  return {
    link: function(scope, elem, attr){
      elem[0].oninput = function(){
        var val = elem[0].value
        if(/[\u4e00-\u9fa5]{4,}/.test(val)){
          elem[0].value = val.slice(0, 7);
          elem.attr('maxLength', 7);
        }else{
          elem.attr('maxLength', 11);
        }
      }
    }
  }
})

.directive('closePopupBackDrop', ['$ionicGesture',function($ionicGesture) {
  return {  
    scope: false,
    restrict: 'A',
    replace: false,
    link: function(scope, element, attrs, controller) {
        var  $htmlEl= angular.element(document.querySelector('html'));
        $ionicGesture.on("touch", function(event) {
          if (event.target.nodeName === "HTML") {
            if (scope.alertPopup) {
              scope.alertPopup.close();
            } 
            else if (scope.confirmPopup) {
              scope.confirmPopup.close();
            }
            else if (scope.showSatisfy) {
              scope.showSatisfy.close();
            }
          }
        },$htmlEl);
    }
  };
}])

.directive('swipeSlide', function($ionicGesture) {
  return {
    link: function(scope, ele, attr){
      $ionicGesture.on('swipeup', function(event){
        console.log('swipe up');
        ele.css({'transform' : 'translate(0, -100%)', 'transition' : '500ms ease-out'});
      }, ele);

      $ionicGesture.on('swipedown', function(event){
        console.log('swipe down');
        ele.css({'transform' : 'translate(0, 0)', 'transition' : '500ms ease-out'});
      }, ele);
    }
  }
})

.directive('pkWaiting', function($rootScope, $interval){
  return {
    link: function(scope, ele, attr){
      scope.img = ['data/darwin.png', 'data/debug.png', 'data/user1.png', 'data/user2.png', 'data/sports.png'];
      var time = $interval(function(){
        scope.img.push(scope.img.shift());
        if (scope.pkObj.ready == false){
          $interval.cancel(time);
        }
      }, 500);
    }
  }
})

.directive('autoHeight', function($window) {
  return {
    restrict: 'A',
    scope: {},
    link: function(scope, elem, attrs) {
      var windowHeight = window.innerHeight;
      var headerHeight = angular.element(document.querySelector('ion-header-bar'))[0].clientHeight;
      var footerHeight = angular.element(document.querySelector('ion-tab'))[0].clientHeight;
      elem.css('min-height', 
              (windowHeight - headerHeight - footerHeight) + 'px');
    }
  };
})

.directive('tabRedPoint', function($compile, $timeout){
  return {
    restrict: 'A', 
    replace: false,
    link: function(scope, element, attrs, controller) {
        var key = attrs.tabRedPoint || false;
        var template ="<span ng-class={true:'tabs-red-point',false:''}["+key+"]></span>";
        var childClass = 'a.' + attrs.class;
        var html = $compile(template)(scope);
        $timeout(function() {
            angular.element(document.querySelector(childClass)).css({
              "position": 'relative',
            }).append(html);
        }, 100);
      }
  };
})

.directive('myFocus', function($timeout, $parse) {
    return {
      restrict: 'A', 
      link: function(scope, element, attrs) {
        var model = $parse(attrs.myfocus);
        console.log('a')
        scope.$watch(model, function(value) {
          if(value === true) {
            $timeout(function() {
              element[0].focus();
            }, 100);
          }else if(value === false){
            $timeout(function() {
              element[0].blur();
            }, 100);
          }
          });
      }
    };
})

.directive('ngFocus', function($timeout) {
  return {
    link: function(scope, element, attrs) {
      scope.$watch(attrs.ngFocus, function(val) {
        if (angular.isDefined(val) && val) {
          $timeout(function() {element[0].focus();});
        }
      }, true);
      element.bind('blur', function() {
        if (angular.isDefined(attrs.ngFocusLost)) {
          scope.$apply(attrs.ngFocusLost);
        }
      });
    }
  };
})

.directive('autoInputHeight', function($ionicScrollDelegate){
  return {
    link: function(scope, ele, attr) {
      ele.bind('keydown keyup input', function(event){
        var val = ele[0].scrollHeight + 120;
        $ionicScrollDelegate.scrollTo(0, val, true);
      })
    }
  }
})

.directive('tabDblclick', function($ionicGesture, $timeout, $rootScope, $ionicScrollDelegate, AuthService){
  return {
    link: function(scope, ele, attr){

      console.log(attr.title);
      $timeout(function(){
        $ionicGesture.on('doubletap', function(){
          switch(attr.num) {
            case '0':
              var homeIndex = AuthService.getScrollViewIndex().home;
              AuthService.triggerScrollViewPullToRefresh(AuthService.getInstances(homeIndex, 'home').getScrollView());
              break;
            case '1':
              var friendsIndex = AuthService.getScrollViewIndex().friends;
              AuthService.triggerScrollViewPullToRefresh(AuthService.getInstances(friendsIndex, 'friends').getScrollView());
              break;
            case '2':
              console.log('发问');
              break;
            case '3':
              // var historyIndex = AuthService.getScrollViewIndex().history;
              // AuthService.triggerScrollViewPullToRefresh(AuthService.getInstances(historyIndex, 'history').getScrollView());
              break;
            case '4':
              console.log('个人');
              break;

          }
        }, (ele.parent().find('a').eq(Number(attr.num))))
      });
    }
  }
})

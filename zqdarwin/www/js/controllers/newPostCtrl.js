angular.module('darwin.newPostCtrl', ['darwin.services'])
.controller('NewPostCtrl',
  function($scope,
    $ionicLoading,
    $rootScope,
    $state,
    $ionicModal,
    $q,
    $timeout,
    $stateParams,
    $ionicHistory,
    $ionicActionSheet,
    util,
    store,
    PkService,
    shareService,
    AuthService,
    HttpHelper,
    PostService,
    ImageSlider,
    $cordovaImagePicker,
    $ionicScrollDelegate,
    globals,
    $ionicViewSwitcher,
    $ionicPopup,
    wrongBounced) {
    $scope._id = $stateParams.postId;
    $scope.myScope = $scope;
    $scope.categories = globals.categories;
    $scope.selectedCategory = {selected: false};
    $scope.isInvite = ($stateParams.source == "phoneLogin" || $stateParams.source == "nickname");
    var user = store.getUser();

    $scope.price = {current: ""}; 
    $scope.isNumber = function() {
      if ($scope.price.current == "") {
        $scope.post.price = 1;
        return;
      }
      var regex = /^[1-9]\d{0,3}?$/;
      if (regex.test($scope.price.current)){
        $scope.post.price = parseFloat($scope.price.current/10);
        $scope.formerly = $scope.price.current;
      }
      else{
        $scope.price.current = $scope.formerly;
      }
    }

    $scope.changeNumber = function(){
      if($scope.price.current && $scope.price.current<10){
        $scope.price.current = parseInt($scope.price.current/1)*10;
        $scope.post.price = parseFloat($scope.price.current/10);
      }
      if($scope.price.current && $scope.price.current>10 && $scope.price.current%10){
        $scope.price.current = parseInt($scope.price.current/10)*10;
        $scope.post.price = parseFloat($scope.price.current/10);
      }
    }

    // $scope.placehoder = true;

    // $scope.blur = function() {$scope.placehoder = true; console.log($scope.placehoder);}

    // $scope.focus = function() {$scope.placehoder = false; console.log($scope.placehoder);}

    var recording = {
      name: 'cdvfile://localhost/persistent/recording.m4a',
      media: null,
      duration: 0
    };
    $scope.updateCategory = function(){
      if (window.localStorage.selectedCategoryValue){
        $scope.post.category = window.localStorage.selectedCategoryValue;
        $scope.categoryName = window.localStorage.selectedCategoryName;
      }
      else{
        $scope.post.category = "";
        $scope.categoryName = "";
      }
    };

    $scope.clearPost = function(){
      $scope.messageBoxText = 0 + "\"";
      $scope.price.current = 10;
      $scope.post = {
        title: "",
        content: "",
        price: 1,
        expire: globals.expire.default,
        comment_count: 0,
        comments: [],
        isQuestion: true,
        anonymous: false,
        status: globals.postState.active,
        expert: {},
        audioFiles: [],
        photoFiles: []
      };
      $scope.updateCategory();
    };

    $scope.clearPost();

    $scope.cancel = PostService.cancelNewPost;

    $scope.priceRange = globals.price.range;
    $scope.expireRange = globals.expire.range;

    $scope.prices = globals.prices;

    $scope.choosePrice = function(val){
      $scope.post.price = val;
      $scope.price.current = val*10;
    }

    $scope.choosePrice(1);

    $scope.goBack = function(){
      $ionicViewSwitcher.nextDirection("back");
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

    $scope.$on("$ionicView.enter", function(ev){
      if (!user._id) {
        isGoPhoneLogin();
      }
      $scope.clearPost();
      $scope.submitting = false;
      if ($stateParams.pkQuestion) $scope.post.content = $stateParams.pkQuestion;
      $timeout(function(){
        $scope.updateCategory();
        refreshCategories();
      });

    });

    $scope.canSubmit = function(){
      if ($scope.submitting) return false;
      return $scope.post.content && !!$scope.post.price && ($scope.categoryName != '');
    };

    $scope.isRecording = false;
    var recordingMedia;
    var recordingStart;

    $scope.messageBoxVisible = false;

    $scope.messageBoxText = 0 + "\"";

    var messageBoxShow = function (text, duration)  {
      $scope.messageBoxText = text;
      $scope.messageBoxVisible = true;

      if (duration > 0) {
        $timeout(function () {
          $scope.messageBoxVisible = false;
        }, duration);
      }
    };

    var messageBoxHide = function () {
      $scope.messageBoxVisible = false;
    };

    var messageBoxTimer = function () {
      if ($scope.isRecording) {
        var duration = Math.ceil((Date.now() - recordingStart)/1000);
        var text;
        if(duration && duration < 60) text = duration + "\"";
        if(duration && duration > 59 && duration < 3600) text = parseInt(duration/60) + "\'" + duration%60 + "\"";
        messageBoxShow(text, 0);
        $timeout(messageBoxTimer, 500);
      }
    }

    $scope.startRecord = function () {
      $scope.recordingName = util.getCdvTmpFilePath('m4a');
      console.log('startRecord: %s', $scope.recordingName);

      if ($scope.isRecording || $scope.post.audioFiles.length) {
        return;
      }

      $scope.isRecording = true;
      recordingStart = Date.now();
      messageBoxTimer();

      recordingMedia = new Media($scope.recordingName, function () {
        console.log('media success');
      },
      function (err) {
        console.log(err);
      });
      recordingMedia.startRecordWithCompression({SampleRate:16000});
    };

    $scope.delRecord = function() {
        $scope.post.audioFiles = [];
        $scope.messageBoxText = 0 + "\"";
    };

    $scope.stopRecord = function () {
      console.log('stopRecord: %s', $scope.recordingName);

      if ($scope.post.audioFiles.length) {
        $scope.post.audioFiles = [];
        return;
      }

      if (!$scope.isRecording) {
        return;
      }
      messageBoxHide();
      $scope.isRecording = false;
      recordingMedia.stopRecord();
      var duration = Math.ceil((Date.now() - recordingStart)/1000);

      var dur = (Date.now() - recordingStart)/1000;
      if (dur < 1)
        return $timeout(function(){
          $scope.messageBoxText = 0 + "\"";
          $ionicLoading.show({ 
            template: '录音时间过短', noBackdrop: true, duration: 1000 
          })
        }, 300);

      recording.duration = Math.ceil(dur);
      resolveLocalFileSystemURL($scope.recordingName,
        function(x) {
          var url = x.toURL();
          console.log('url=%s', url);
          $scope.$apply(function () {
            $scope.post.audioFiles = [{src:url, dur:duration}];
            console.log($scope.post.audioFiles);
          });
        }, function (err) {
          console.log(err);
        });
    };

    // $scope.checkText = function () {
    //     if ($scope.post.content.length > 150) {
    //         $scope.post.content = $scope.post.content.substr(0, 150);
    //     }
    // };

    $scope.addPhotoLocation = function(isCamera){
      var options = {
        maximumImagesCount: 9 - $scope.post.photoFiles.length,
        width: 0,
        height: 0,
        quality: 100
      };
      $cordovaImagePicker.getPictures(options).then(function(results){
        _.each(results, function(comment, i){
          $scope.post.photoFiles.push({src: comment});
          getCurrentPhoto($scope.post.photoFiles.length - 1);
        });
      });
    };

    var getCurrentPhoto = function(index){
      $scope.currentPhoto = {
        photo: $scope.post.photoFiles[index],
        index: index
      };
      console.log($scope.currentPhoto);
    }

    $scope.choosCurrentPhoto = function(index, event){
      event.stopPropagation();
      getCurrentPhoto(index);
    }

    $scope.addPhotoCamera = function(isCamera){
      navigator.camera.getPicture(
        function (path){
          $timeout(function(){
              $scope.post.photoFiles.push({src: path});
              getCurrentPhoto($scope.post.photoFiles.length - 1);
          });
        },
        function (error){
          console.log(error);
        },
        {
          quality: globals.photoQuality,
          targetWidth: globals.photoTargetWidth,
          targetHeight: globals.photoTargetHeight,
          destinationType: Camera.DestinationType.FILE_URI,
          sourceType: isCamera ? Camera.PictureSourceType.CAMERA : Camera.PictureSourceType.PHOTOLIBRARY,
          popoverOptions: new CameraPopoverOptions(300, 300, 100, 100, Camera.PopoverArrowDirection.ARROW_ANY)
        }
      );
    }

    $scope.removePhoto = function(index, event){
      if(index == $scope.post.photoFiles.length - 1) var last = true;
      event.stopPropagation();
      console.log(index);
      $scope.post.photoFiles.splice(index,1);
      (last) ? getCurrentPhoto(index - 1) : getCurrentPhoto(index);
    };

    $scope.previewPhoto = function (index, $event) {
      console.log(index);
      ImageSlider.show($scope.post.photoFiles.map(function (x) {
        return x.src;
      }), index, $scope, $event);
    }

    //choose photos or take photos
    $scope.showPhotoChoice = function($event) {
      $event.stopPropagation();
       var hideSheet= $ionicActionSheet.show({
           buttons:[
             {text:'拍照'},
           ],
           destructiveText: '本地照片',
           cancelText: '<div style="color:black;">取消</div>',
           
           buttonClicked: function() {
             $scope.addPhotoCamera(true);
             console.log("正在拍照");
             return true;
           },
           destructiveButtonClicked:function(){
             $scope.addPhotoLocation();
             return true;
           }
       });
   };
   
    $scope.submitNewPost = function(){
      $scope.changeNumber();
      var user = store.getUser();
      $scope.post.author = {
        _id: user._id,
        displayName: user.displayName,
        avatar: user.avatar
      };
      $scope.post.date = new Date();
      window.localStorage.defaultCategory = $scope.post.category;

      var filesToUpload = $scope.post.audioFiles.map(function(x){ return x.src; })
        .concat($scope.post.photoFiles.map(function(x){ return x.src; }).filter(function(x){ return !!x; }));

      var uploads = filesToUpload.map(function (x) {
        console.log('upload', x);
        return HttpHelper.upload(x);
      });

      $ionicLoading.show({
        template: '<ion-spinner class="spinner-energized" icon="spiral">正在上传...</ion-spinner>',
        hideOnStateChange: true
      });

      $q.all(uploads).then(
        function (list) {
          var newPost = JSON.parse(JSON.stringify($scope.post));
          var returnFiles = list.map(function(x){ return x.response; }).map(function(x){ return util.getFileName(x); });
          newPost.audioFiles = returnFiles.filter(function(x){ return x.endsWith('.m4a'); }).map(function(x,i){ return {src: x, dur:$scope.post.audioFiles[i].dur}; });
          newPost.photoFiles = returnFiles.filter(function(x){ return !x.endsWith('.m4a'); }).map(function(x){ return {src: x}; });
          PostService.addNewPost(newPost).then(
            function(data){
              if (data.status == globals.ok){
                $ionicLoading.show({ template: "提问成功！", noBackdrop: true, duration: 1000 });
                $scope.clearPost();
                $scope.submitting = true;
                $scope.goBack();
              }
              else {
                if (data.status == globals.knownErrors.lowFund)
                  $ionicLoading.show({
                    templateUrl: 'views/common/hint.html',
                    noBackdrop: true,
                    hideOnStateChange: true,
                    duration: 3000
                  });
                else
                  $ionicLoading.show({ template: data.status, noBackdrop: true, duration: 1000 });
                $scope.submitting = false;
              }
            },
            function(err){
              $ionicLoading.show({ template: err, noBackdrop: true, duration: 1000 });
              $scope.submitting = false;
            }
          );
        },
        function (err) {
          console.log(err);
          $ionicLoading.show({ template: err, noBackdrop: true, duration: 1000 });
          $scope.submitting = false;
        }
      );
    };

  var refreshCategories = function(){
    $scope.categories.forEach(function(list){
      list.forEach(function(category){
        category.selected = false;
        if(category.name == window.localStorage.selectedCategoryName) category.selected = true;
      });
    });
  };

  $scope.save = function(Categorie){
        user.newPostCategory = Categorie.value;
        window.localStorage.selectedCategoryValue = Categorie.value;
        window.localStorage.selectedCategoryName = Categorie.name;
        $scope.post.category = window.localStorage.selectedCategoryValue;
        $scope.categoryName = window.localStorage.selectedCategoryName;
  };
  
  $scope.selectionChanged = function(value){
    value.selected = !value.selected;
    $scope.save(value);
    refreshCategories();
  }

  $scope.data = {detail: ""};

  $scope.feedback = '投诉';
  $scope.feedbackBtn = '投诉';
  if ($stateParams.source == "account"){
    $scope.feedback = '意见反馈';
    $scope.feedbackBtn = '反馈';
  }

  $scope.complaintsOrFeedback = function(){
    var arr=[];
    $scope.post.photoFiles.forEach(function(item){
      HttpHelper.upload(item.src).then(function(data){
        arr.push(data.response);
        return arr;
      });
    });
    var post_id = window.localStorage.currentPostId;
    if ($stateParams.source == "account") $scope.toFeedback('0',arr,$scope.data.detail,post_id);
    else $scope.toFeedback('1',arr,$scope.data.detail,post_id);
  }

  $scope.toFeedback = function(type,reason,content,post_id){
    AuthService.feedback(type,reason,content,post_id).then(
      function(data){
        if (data.status == "ok") {
          $stateParams.source == "account" ? wrongBounced.toRemind('提交成功',"tab.account") : wrongBounced.toRemind('提交成功',"chatDetails");
        }
        else wrongBounced.toRemind('您的投诉正在受理中，无需重复投诉');
    })
  }
		autosize(document.querySelector('.input'));

    $scope.$on("$ionicView.afterLeave", function(){
      $ionicScrollDelegate.scrollTop(true);
      angular.element(document.querySelector('.input')).css({
        'height': '51px'
      })
    });
});

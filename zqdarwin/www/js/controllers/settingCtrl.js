angular.module('darwin.settingCtrl', [])
.controller('SettingCtrl',
  function($scope, $rootScope, $interval, $ionicActionSheet, $ionicModal, $ionicHistory, $ionicLoading, $state, $timeout, $ionicSideMenuDelegate, $ionicPopover, AuthService, HttpHelper, store, globals, $sce, $ionicPopup, $ionicPlatform, util, $ionicViewSwitcher, $stateParams, wrongBounced, PkService, shareService, $ionicBackdrop, PostService, PostServer, remindBounced, $cordovaClipboard) {
    $scope.currentName = $state.current.name;
    $scope.notifications = true;
    $scope.currencyUnit = globals.currencyUnit;
    $scope.user = store.getUser();
    console.log($scope.user);
    $scope.redHistory = shareService.returnRedHistory();
    //$scope.user.level = $scope.user.score ? Math.ceil($scope.user.score/1000) : 1;
    $scope.userLevel = function(){
      console.log($scope.user.score)
      if(0<=$scope.user.score&&$scope.user.score<1000) {
        $scope.user.level = 1;
        $scope.theLength = $scope.user.score/50 + 10;
        $scope.theLength = $scope.theLength + '%';
        $scope.theAbsolutely = Math.floor(Math.random()*20+10) + '%';
      }else if(1000<=$scope.user.score&&$scope.user.score<2000) {
        $scope.user.level = 2;
        $scope.theLength = ($scope.user.score-1000)/50 + 30;
        $scope.theLength = $scope.theLength + '%';
        $scope.theAbsolutely = Math.floor(Math.random()*20+20) + '%';
      }else if(2000<=$scope.user.score&&$scope.user.score<2500) {
        $scope.user.level = 3;
        $scope.theLength = ($scope.user.score-2000)/25 + 50;
        $scope.theLength = $scope.theLength + '%';
        $scope.theAbsolutely = Math.floor(Math.random()*20+30) + '%';
      }else if(2500<=$scope.user.score&&$scope.user.score<3500){
        $scope.user.level = 4;
        $scope.theLength = ($scope.user.score-2500)/50 + 70;
        $scope.theLength = $scope.theLength + '%';
        $scope.theAbsolutely = Math.floor(Math.random()*20+40) + '%';
      }else if(3500<=$scope.user.score&&$scope.user.score<4500){
        $scope.user.level = 5;
        $scope.theLength = ($scope.user.score-3500)/50 + 80;
        $scope.theLength = $scope.theLength + '%';
        $scope.theAbsolutely = Math.floor(Math.random()*20+60) + '%';
      }else{
        $scope.user.level = 5;
        $scope.theLength = "100%";
        $scope.theAbsolutely = Math.floor(Math.random()*20+70) + '%';
      }
    }
    $scope.userLevel();
    $scope.purchaseOptions = ['6', '12', '18' ,'50'];
    // $scope.purchaseOptions = ['0.01', '1', '18' ,'50'];
    // $scope.typeOfProblem = [{"text" : "为什么我提的问题审核没通过?", checked: false},
    //                         {"text" : "提的问题审核没通过咋不退钱?", checked: false},
    //                         {"text" : "为什么查看不了我的提问?", checked: false},
    //                         {"text" : "有人接了我的单,却不回答,该如何处理?", checked: false}];
    $scope.hasSettingChange = false;
    $scope.hasSettingSave = false;
    $scope.toBeModifiedPassword = {};
    $scope.config = store.getConfig();
    $scope.isIOS = ionic.Platform.isIOS();
    $scope.isWxPay = globals.settings.get().enableWxPay ? true : false;
    $scope.isIOSPay = globals.settings.get().enableIOSPay ? true : false;
    $scope.isPay = globals.settings.get().enableIsPay ? true : false;
    $scope.accountError = false;
    $scope.friendInfo = null;

    $scope.numberSize = function(){
      var x, xLen, log=[],total=0;
      for (x in window.localStorage){
       xLen =  ((window.localStorage[x].toString().length * 2 + x.toString().length * 2)/1024);
       log.push(x.substr(0,30) + " = " +  xLen.toFixed(2) + " KB");
       total+= xLen}; 
       if (total > 1024){
         log.unshift("Total = " + (total/1024).toFixed(2)+ " M");
         $scope.theCacheSize = (total/1024).toFixed(2)+ " M";
        }else{
          log.unshift("Total = " + total.toFixed(2)+ " K");
          $scope.theCacheSize = total.toFixed(2)+ " K";
        };
    }

    $scope.$on("$ionicView.beforeEnter",function(){
      $scope.user.credit = Math.round($scope.user.credit*10)/10;
      $ionicViewSwitcher.nextDirection("forward");
      $scope.numberSize();
      // AuthService.getFriends(true).then(function(data) {
      //   $scope.friendArr = data;
      //   var number = 0;
      //   $scope.friendArr.forEach(function(item){
      //     number+=item.value.length;
      //   })
      //   $scope.friendNumber = number;
      // });
    });

    $scope.close = function(){
      shareService.closeRedPacket();
    }

    $scope.$on("$ionicView.afterEnter",function(){
      if ($state.current.name == "redPacket"){
        shareService.getScope($scope);
        AuthService.redPacketHistory().then(function(data){
          shareService.updateRedHistory(data);
          data.details ? $scope.redHistory.details =  data.details : $scope.redHistory.details = [];
          $scope.redHistory.sumMoney.sum = data.sumMoney;
          Math.floor($scope.redHistory.sumMoney.sum*100)/100 >0 ? $scope.redHistory.sumMoney.sum = Math.floor($scope.redHistory.sumMoney.sum*100)/100 : $scope.redHistory.sumMoney.sum = 0;
        });
      }
      PostService.getMyLists('2' , true, false, null,999999999999).then(function(data){
        $scope.payAttentionToTheNumber = data.list.length;
        console.log(data.list.length);
        console.log(data);
        }).finally(function(error) {
          $scope.$broadcast('scroll.infiniteScrollComplete');
          $scope.$broadcast('scroll.refreshComplete');
      });
    });

    if($scope.user.gender == "M") $scope.user.sex = "男" ;
    if($scope.user.gender == "F") $scope.user.sex = "女" ;

    $scope.changeGender = function(x){
      // if ($scope.user.sex == '男') {
      //   $scope.user.sex = '女';
      //   $scope.gender = "F";
      // }else{
      //   $scope.user.sex = '男';
      //   $scope.gender = "M";
      // }
      $scope.gender = x; 
      $scope.remindContent = '你只有一次修改性别的机会哟';
      $scope.theBtn = '确定';
      remindBounced.toRemind($scope,$scope.confirmGender);
    }
    
    $scope.confirmGender = function(){
      AuthService.changeUserInfo({gender: $scope.gender});
      store.updateUser({gender: $scope.gender}, false);
      $scope.user.gender == 'M' ? $scope.user.sex = "男" : $scope.user.sex = "女";
      console.log($scope.user);
      AuthService.changeUserInfo({score: $scope.user.score + 20});
      store.updateUser({score: $scope.user.score + 20}, false);
    }
    console.debug($scope.user);

    cordova.getAppVersion(function(version) {
      $timeout(function () {
        $scope.appVersion = version;
      })
    });

    $scope.showUserAccount = function($event){
      $event.stopPropagation();
      $ionicViewSwitcher.nextDirection("forward");
      $state.go('account');
    };

    $scope.pkObj = PkService.getPkObj();
    shareService.getCtrlScope($scope);

    $scope.goBack = function(){
      console.log('going back from settings');
      window.localStorage.currentPostId = null;
      $ionicViewSwitcher.nextDirection("back");
      $ionicHistory.goBack();
      $scope.saveOriginal();
    };

    $scope.showTerms = function(){
      $state.go('terms');
    }

    $scope.showTerms1 = function() {
      if (!$scope.terms_modal){
        $ionicModal.fromTemplateUrl('views/common/terms.html', {
          scope: $scope,
          animation: 'slide-in-up'
        }).then(function(modal) {
          $scope.terms_modal = modal;
          $scope.terms_modal.show();
        });
      }
      else{
        $scope.terms_modal.show();
      }
    };

    $scope.showFAQS = function() {
      if (!$scope.faqs_modal){
        $ionicModal.fromTemplateUrl('views/common/faqs.html', {
          scope: $scope,
          animation: 'slide-in-up'
        }).then(function(modal) {
          $scope.faqs_modal = modal;
          $scope.faqs_modal.show();
        });
      }
      else{
        $scope.faqs_modal.show();
      }
    };

    $ionicPopover.fromTemplateUrl('views/app/membership.html',{
      scope: $scope
    }).then(function(popover){
      $scope.popover = popover;
    });

    $scope.openPopover = function($event){
      $scope.popover.show($event);
    };

    $scope.closePopover = function(){
      $scope.popover.hide();
    };

    $scope.$on('$destroy', function(){
      $scope.popover && $scope.popover.remove();
    });

    $scope.$on('popover.hidden', function(){
    });

    $scope.$on('popover.removed', function(){
    });

    $scope.showMySettings = function(){
      $ionicViewSwitcher.nextDirection("forward");
      $state.go('settings');
    }
    // Triggered on a the logOut button click
    // $scope.showLogOutMenu = function() {

    //   // Show the action sheet
    //   var hideSheet = $ionicActionSheet.show({
    //     //Here you can add some more buttons
    //     // buttons: [
    //     // { text: '<b>Share</b> This' },
    //     // { text: 'Move' }
    //     // ],
    //     destructiveText: '退出登录',
    //     titleText: '确定要退出吗？',
    //     cancelText: '<div style="color:black;">取消</div>',
    //     cancel: function() {
    //       // add cancel code..
    //     },
    //     buttonClicked: function(index) {
    //       //Called when one of the non-destructive buttons is clicked,
    //       //with the index of the button that was clicked and the button object.
    //       //Return true to close the action sheet, or false to keep it opened.
    //       return true;
    //     },
    //     destructiveButtonClicked: function(){
    //       //Called when the destructive button is clicked.
    //       //Return true to close the action sheet, or false to keep it opened.
    //       AuthService.logOut();
    //       $ionicHistory.clearCache();
    //       $state.go('phoneLogin');
    //     }
    //   });
    // };

    $scope.showLogOutMenu = function(){
      $scope.remindContent = '你真要退出当前帐号吗?';
      $scope.theBtn = '确定';
      remindBounced.toRemind($scope, $scope.logOut);
    }
    $scope.logOut = function(){
      $state.go('phoneLogin');
      $timeout(function(){
        AuthService.logOut();
        $ionicHistory.clearCache();
      });
    }

    $scope.clearCache = function(){
      $scope.cacheClear = '正在清除缓存...';
      $scope.cacheBoolean = true;
      $ionicHistory.clearCache();
      PostServer.clear();
      $timeout(function(){$scope.cacheClear = '成功清除缓存 !'; $scope.cacheBoolean = false;$scope.theCacheSize = "0";},2500);
      $ionicLoading.show({ template: '<div style="display:flex;flex-direction:row;jusitify-content:center;align-item:center;"><ion-spinner icon="spiral" class="spinner-energized" style="position: relative;height:24px;" ng-if="cacheBoolean"></ion-spinner><span style="height:24px;line-height:24px;">{{cacheClear}}</span></div>', noBackdrop: true, duration: 3500, scope: $scope});
    }

    function chooseImage(isCamera){
      navigator.camera.getPicture(
        function (path){
          plugins.crop(
            function(croppedPath) {
              console.log(croppedPath);
              $timeout(function(){
                $scope.user.avatar = croppedPath;
                console.log(croppedPath)
                changeAvatar(croppedPath);
              });
            },
            function(err) { console.log(err); },
            path,
            {
              quality: 100,
              targetWidth: 300,
              targetHeight: 300
            }
          );
        },
        function (error){ console.log(error); },
        {
          quality: globals.photoQuality,
          targetWidth: globals.photoTargetWidth,
          targetHeight: globals.photoTargetHeight,
          destinationType: Camera.DestinationType.FILE_URI,
          sourceType: isCamera ? Camera.PictureSourceType.CAMERA : Camera.PictureSourceType.PHOTOLIBRARY,
          popoverOptions: new CameraPopoverOptions(300, 300, 100, 100, Camera.PopoverArrowDirection.ARROW_ANY),
          saveToPhotoAlbum: true
        }
      );
    }
    
    $scope.changeAvatarImg = function() {
        var hideSheet= $ionicActionSheet.show({
            buttons:[
              {text:'拍照'},
            ],
            destructiveText: '本地照片',
            cancelText: '<div style="color:black;">取消</div>',
            cancel: function() {
                  // add cancel code..
            },
            buttonClicked: function(index) {
              if (index==0){
                chooseImage(true);
              }
              return true;
            },
            destructiveButtonClicked: function(){
              chooseImage(false);
              return true;
            }
        });
    };  

    $scope.doSelectCategories = function(){
      window.localStorage.categories = JSON.stringify($scope.categories);
      if ($state.current.name == "home") $rootScope.$emit('refreshHomePage');
      else $rootScope.$emit('refreshQuestions');
      $ionicSideMenuDelegate.toggleRight(false);
    };

    function addCreditApple(opt) {
      $ionicLoading.show({ template: '正在加载,请稍等...', noBackdrop: true, duration: 6000 });
      return inAppPurchase.getProducts($scope.purchaseOptions)
      .then(function (products) {
        if (!products.length) {
          throw '无法获取产品信息';
        }
        $scope.products = products;
        console.log(products);
        return inAppPurchase.buy(opt);
      })
      .then(function (data) {
        console.log(JSON.stringify(data));

        return AuthService.addCredit({
          credit: parseInt(opt),
          receipt:data
        });
      });
    }

    function addCreditWx(opt) {
      return HttpHelper.get(util.getApiUrl('/user/get_prepay?opt=' + opt))
      .then(function (result) {
        return new Promise(function (resolve, reject) {
          Wechat.sendPaymentRequest(result, function (result) {
            console.log(result);
            resolve(result);
          }, function (err) {
            reject(err);
          });
        });
      })
      .then(function (result) {
        return AuthService.addCredit({
          credit: parseInt(opt),
          receipt: result
        })
      });
    }
    
    $scope.enablePay = true;
    $scope.payMoney = function(item){
      $scope.moneyValue = item;
      $scope.enablePay = false;
    };

    $scope.addCredit = function(opt, source){
      console.log(opt, source);
      $scope.enablePay = true;
      if (source == 'wx' && !$scope.config.isWxInstalled){
        $ionicLoading.show({ template: '请先安装微信', noBackdrop: true, duration: 1000 });
        $scope.enablePay = false;
        return;
      }
      (source == 'wx' ? addCreditWx(opt) : addCreditApple(opt))
      .then(function (data) {
        data = Math.floor(data*10);
        $ionicLoading.show({ template: '操作成功，账户余额 ' + data + '金币', noBackdrop: true, duration: 1000 });
        // AuthService.changeUserInfo({score: $scope.user.score + data});
        store.updateUser({score: $scope.user.score + Number(opt)}, false);
        $scope.enablePay = false;
        $ionicHistory.goBack();
      })
      .catch(function (err) {
        var message = err.message || (_.isString(err) ? err : '操作失败');
        $scope.enablePay = false;
        $ionicLoading.show({ template: message, noBackdrop: true, duration: 1000 });
      });
    };

    $scope.theClickColor1 = '#ABABAB';
    $scope.theClickColor2 = '#ABABAB';
    $scope.originalName = $scope.user.displayName;
    $scope.originalProfile = $scope.user.myProfile;
    
    $scope.findSettingChange = function(){
      $scope.hasSettingChange = true;;
    };

    $scope.saveOriginal = function(){
       if(!$scope.hasSettingSave){
         $scope.user.displayName = $scope.originalName;
         $scope.user.myProfile = $scope.originalProfile;
       }
        $scope.hasSettingChange = false;
        $scope.hasSettingSave == true;
        $scope.theClickColor1 = '#ABABAB';
        $scope.theClickColor2 = '#ABABAB';
    }

    $ionicPlatform.onHardwareBackButton(function(){
      $scope.saveOriginal()
    })

    $scope.submitSettingChanges = function(){
      if ($scope.user.displayName == '') return wrongBounced.toRemind('请按要求修改昵称!');
        //store.updateUser($scope.user, false);
        $scope.originalName = $scope.user.displayName;
        $scope.originalProfile = $scope.user.myProfile;
        AuthService.changeUserInfo({displayName : $scope.user.displayName});
        AuthService.changeUserInfo({myProfile : $scope.user.myProfile});
        store.updateUser($scope.user, false);
        // store.updateUser({myProfile : $scope.user.myProfile}, false);
        $scope.hasSettingChange = false;
        $scope.hasSettingSave == true;
        $scope.theClickColor1 = '#ABABAB';
        $scope.theClickColor2 = '#ABABAB';
        $ionicViewSwitcher.nextDirection("back");
        $state.go("tab.account");
       console.log($scope.user);
    };

    $scope.changeColor = function(x){
      x == 1 ? $scope.theClickColor1 = '#242624' : $scope.theClickColor2 = '#242624' ;
    }

    $scope.modifyPassword = function(){
      $state.go('change_password');
    };

    $scope.modifyUserPassword = function(){
      AuthService.changeUserInfo({ password: $scope.toBeModifiedPassword.newPassword }).then(
        function(result){
          console.log(result);
          if (result.status != "ok")
            return $ionicLoading.show({ template: "密码更改失败，请稍后重试", noBackdrop: true, duration: 1000 });
          $scope.user.password = $scope.toBeModifiedPassword.newPassword;
          $ionicLoading.show({ template: "密码更改成功", noBackdrop: true, duration: 1000 });
          $state.go('settings');
        }
      )
    };

    var changeAvatar = function(filePath){
      HttpHelper.upload(filePath).then(
        function(result){
          console.log(result);
          AuthService.changeUserInfo({ avatar: util.getMediaUrl(util.getFileName(result.response)) }).then(
            function(data){
              console.log(data);
              if (data.status != "ok")
                return $ionicLoading.show({ template: "头像更改失败，请稍后重试", noBackdrop: true, duration: 1000 });
              $scope.user.avatar = result.response;
              console.log($scope.user.avatar)
            }
          )
        },
        function(error) { 
          console.log('avatar upload failed', error);
          $ionicLoading.show({ template: "头像更改失败，请稍后重试", noBackdrop: true, duration: 1000 });
        }
      );
    };

    $scope.showAbout = function(url){
      AuthService.showAbout(url);
    }

    $scope.$on("$stateChangeSuccess", function(){
      if ($state.current.name == "CircleOfFriends"){
        $scope.getFirendsList();
      }
    });

    // $scope.data = {detail: ""};

    // $scope.feedback = '投诉';
    // $scope.feedbackBtn = '投诉';
    // if ($stateParams.source == "account"){
    //   $scope.feedback = '问题反馈';
    //   $scope.feedbackBtn = '反馈';
    //   $scope.typeOfProblem = [{"text" : "如何提现？", checked: false},
    //                           {"text" : "被封号了怎么办？", checked: false},
    //                           {"text" : "如何增加我的信用积分", checked: false},
    //                           {"text" : "打开APP为什么会闪退？", checked: false}];
    // }

    // $scope.complaintsOrFeedback = function(){
    //   var arr =[];
    //   var post_id = window.localStorage.currentPostId;
    //   $scope.typeOfProblem.forEach(function(item){
    //     if(item.checked == true){
    //       arr.push(item.text);
    //     }
    //   });
    //   if($scope.data.detail.length == 0) wrongBounced.toRemind('请输入完整信息');
    //   else {
    //     if ($stateParams.source == "account") $scope.toFeedback('0',arr,$scope.data.detail,post_id);
    //     else $scope.toFeedback('1',arr,$scope.data.detail,post_id);
    //   }
    // }

    // $scope.toFeedback = function(type,reason,content,post_id){
    //   AuthService.feedback(type,reason,content,post_id).then(
    //     function(data){
    //       if (data.status == "ok") {
    //         $stateParams.source == "account" ? wrongBounced.toRemind('提交成功',"tab.account") : wrongBounced.toRemind('提交成功',"chatDetails");
    //       }
    //       else wrongBounced.toRemind('您的投诉正在受理中，无需重复投诉');
    //   })
    // }

    $scope.share = function(){
      shareService.showShareTargets($scope, 'getCash', $scope.post);
    }

    $scope.shareMyself = function(item){
      shareService.showShareTargets($scope, 'user', $scope.user);
    };

    $scope.redRecord = 5;
    $scope.hasMore = true;
    $scope.envelopeHistory = function(){
      AuthService.redPacketHistory().then(function(data){
        if (data.details && (data.details.length > $scope.redRecord)) {
          $timeout(function(){
            $scope.hasMore = true;
          }, 2000);
          $scope.redRecord = $scope.redRecord + 10;
          $scope.hasMore = false;
        }
        else {
          $scope.hasMore = false;
          $scope.rankNotMore = true;
        }
      }).finally(function(error) {
        $scope.$broadcast('scroll.infiniteScrollComplete');
        $scope.$broadcast('scroll.refreshComplete');
      });
      console.log($scope.redRecord);
    } 

    $scope.toGetCash = function(){
      wrongBounced.toRemind('分享成功立即返回答尔文有红包',"redPacket");
    }

    $scope.withdrawal = function(){
      wrongBounced.toRemind('抱歉，你现在不满足提现条件<br>(信用积分达≥2500分)');
    }

    $scope.contactUs = function(){
      $scope.remindContent = '请联系QQ 137266276';
      $scope.theBtn = '复制';
      remindBounced.toRemind($scope,$scope.purpose);
    }

    $scope.purpose = function(){
      //window.location.href = "tel:" + '075523774370';
      $cordovaClipboard.copy('137266276').then(function () {
        $ionicLoading.show({ template: '成功复制QQ号', noBackdrop: true, duration: 1000 });
      }, function () {
        $ionicLoading.show({ template: '复制QQ号失败', noBackdrop: true, duration: 1000 });
      });
    }

    $scope.goToTheWebsite = function(){
      window.open('http://www.aihuawen.com', '_system', 'location=yes');
    }
    
    $scope.integralIcon = 'data/v_' + $scope.user.level + '@3x.png';

    $scope.creditInstructions = [{title:'信用积分说明',value:[{number:'3500-4500',level:'优秀',content:'达到4500以后不再增加积分，用户提现减少10%的手续费'},
                                                            {number:'2500-3499',level:'良好',content:'回答问题获得积分和金币，获取提现功能'},
                                                            {number:'2000-2499',level:'一般',content:'回答问题获得积分和金币'},
                                                            {number:'1000-1999',level:'差',content:'回答问题只有积分，没有金币收益'},
                                                            {number:'1000以下',level:'极差',content:'不能回答问题，发表问题100金币起步'}]}];
    $scope.toScore = function(){
      if (ionic.Platform.isIOS()) {
        window.open('https://itunes.apple.com/cn/app/qq/id1202605978', '_system', 'location=yes');
      } else if (ionic.Platform.isAndroid()) {
        window.open('market://details?id=com.aihuawen.darwin', '_system', 'location=yes');
      }
    }

    $scope.toUpdate = function(){
      AuthService.theLatestVersion().then(function(data){
        if (data.indexOf($scope.appVersion) == "-1") {
          var confirmPopup = $ionicPopup.confirm({
            template: "你的版本太低，请更新!",
            cancelText: '取消',
            okText: '确认',
            cssClass: 'confirm'
          });
          confirmPopup.then(function(res) {
            if (res) window.open('http://www.aihuawen.com', '_system', 'location=yes');
          });
        }else{
          var confirmPopup = $ionicPopup.alert({
            template: "你的已经是最新版本!",
            okText: '确认',
            cssClass: 'confirm'
          });
        }
      })
    }

  //   $scope.toGetG = function(){
  //     PostService.getMyLists('1' , true, false, null).then(function(data){
  //       console.log(data);
  //       }).finally(function(error) {
  //         $scope.$broadcast('scroll.infiniteScrollComplete');
  //         $scope.$broadcast('scroll.refreshComplete');
  //     });
  //   }
  // $scope.toGetG();
  }
);

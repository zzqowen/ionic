angular.module('darwin.pushServer', [])

.factory('PushServer', function ($rootScope, $cordovaPushV5, $state, $ionicPlatform, $timeout, globals, HttpHelper, util){
  var options = {
  	android: {
  	  senderID: "961405905276"
  	},
    ios: {
      alert: "true",
      badge: "true",
      sound: "true"
    },
    windows: {}
  };

  $rootScope.$on('$cordovaPushV5:notificationReceived', function(event, data){
    console.log("push received", event, data.additionalData.foreground, data.additionalData.id);
    $timeout(function(){
      $rootScope.$emit('newPostMessage', data.additionalData.id, data.additionalData.message);
      if (!data.additionalData.foreground){
        //$state.go("tab.home");
        $timeout(function(){
          $state.go('post', {postId: data.additionalData.id});
        }, 500);
      }
      if (ionic.Platform.isIOS()){
        $cordovaPushV5.setBadgeNumber(0);
        $cordovaPushV5.finish();
      }
    });
  });

  $rootScope.$on('$cordovaPushV5:errorOcurred', function(event, e){
    console.log("push error", event, e.message);
  });

  var socket = null;
  var registerSocket = function(user){
    socket = io(globals.server.get());

    socket.on("online", function (data) {
      globals.settings.set(data.userSettings);
      console.log('registering socket.io');
      socket.emit(globals.message.register, { cookie: user.cookie });
    });

    socket.on("push", function (data) {
      console.log(data);
      if (data.type == 7){
        $rootScope.$emit('newPkMessage', data);
      } else{
        $rootScope.$emit('newPostMessage', data._id, data.message);
      }
    });

    socket.on("disconnect", function () {
      console.log('socket.io disconnected');
    });
  };

  var unregisterSocket = function(user){
    console.log('unregistering socket.io');
    if (socket) socket.close();
  };

  var getRegistrationSource = function(){
    if (ionic.Platform.isIOS()) return "apn";
    return globals.push.get();
  };

  var source = getRegistrationSource();
  var pushRegistered = false;

  var registerHuawei = function(user){
    $ionicPlatform.ready(function(){
      cordova.plugins.huaweipush.init();
      pushRegistered = true;
    });
    document.addEventListener('huaweipush.receiveRegisterResult', function (event) {
        console.log(event) // You can get the token value by `event.token`
        HttpHelper.get(util.getApiUrl('/user/register_device/?registration_id=' + event.token + '&source=huawei')).then(
          function(data){
            console.log((data.status == globals.ok) ? "huawei push registered" : data.status);
          }
        );
    }.bind(this), false);
    document.addEventListener('huaweipush.notificationOpened', function (event) {
        console.log(event) // the event will contain a extras key, which contain the data what you send
    }.bind(this), false);
    document.addEventListener('huaweipush.pushMsgReceived', function (event) {
        console.log(event) // the event will contain a extras key, which contain the data what you send
    }.bind(this), false);
  };

  var registerXiaomi = function(user){
    $ionicPlatform.ready(function(){
      try {
        console.log("registering xiaomi push");
        window.plugins.MiPushPlugin.init();
        pushRegistered = true;
      } catch (exception) {
          console.log("xiaomi push " + exception);
      }
    });
    document.addEventListener("mipush.receiveRegisterResult", function(data){
      console.log("mipush.receiveRegisterResult " + data.regId);
      HttpHelper.get(util.getApiUrl('/user/register_device/?registration_id=' + data.regId + '&source=xiaomi')).then(
        function(data){
          console.log((data.status == globals.ok) ? "xiaomi push registered" : data.status);
        }
      );
    }, false);
    document.addEventListener("mipush.notificationMessageArrived", function(data){
      console.log("mipush.notificationMessageArrived", data);
    }, false);
    document.addEventListener("mipush.notificationMessageClicked", function(data){
      console.log("mipush.notificationMessageClicked", data);
      $timeout(function(){
        $rootScope.$emit('newPostMessage', data._id, parseInt(data.message));
        //$state.go("tab.home");
        $timeout(function(){
          $state.go('post', {postId: data._id});
        }, 500);
      });
    }, false);
  };

  var registerDefault = function(user){
    $ionicPlatform.ready(function(){
      console.log("registering cordova push")
      $cordovaPushV5.initialize(options).then(function() {
        if (ionic.Platform.isIOS()) $cordovaPushV5.setBadgeNumber(0);
        $cordovaPushV5.onNotification();
        $cordovaPushV5.onError();
        $cordovaPushV5.register().then(function(registrationId) {
          HttpHelper.get(util.getApiUrl('/user/register_device/?registration_id=' + registrationId + '&source=' + getRegistrationSource())).then(
            function(data){
              console.log((data.status == globals.ok) ? "device registered" : data.status);
            }
          );
        })
        pushRegistered = true;
      });
    });
  };

  var register = function(user) {
    if (!user) return;
    registerSocket(user);
    if (source == "huawei") registerHuawei(user);
    else if (source == "xiaomi") registerXiaomi(user);
    else if (ionic.Platform.isIOS() || ionic.Platform.isAndroid()) registerDefault(user);
  };

  var unregister = function(user) {
    if (!user) return;
    unregisterSocket(user);
    if (pushRegistered){
      console.log("unregistering device from push");
      pushRegistered = false;
      if (source == "huawei"){
        cordova.plugins.huaweipush.stop();
      }
      else if (source == "xiaomi"){
        // nothing to do
      }
      else if (ionic.Platform.isIOS() || ionic.Platform.isAndroid()){
        if (ionic.Platform.isIOS()) $cordovaPushV5.setBadgeNumber(0);
        $cordovaPushV5.unregister();
      }
      HttpHelper.get(util.getApiUrl('/user/unregister_device/')).then(
        function(data){
          console.log((data.status == globals.ok) ? "device unregistered" : data.status);
        }
      );
    }
  };

  return {
    register: register,
    unregister: unregister,
  }
})

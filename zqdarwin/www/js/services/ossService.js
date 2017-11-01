angular.module('darwin.ossService', [])
.service('OSSService',
  function ($rootScope, $http, $q, $ionicPlatform, PushServer, HttpHelper, globals, util, store){
    var client = new OSS.Wrapper({
      region: 'oss-cn-shanghai',
      accessKeyId: 'LTAIE4IM3ugdWw7A',
      accessKeySecret: '7EFFIRKdqKzY1TMj6LUY7PrZhv7qu3',
      bucket: 'hmwmedia'
    });
    client.list({
      'max-keys': 10
    }).then(function (result) {
      console.log(result);
    }).catch(function (err) {
      console.log(err);
    });

    this.share = function(content){
      console.assert(currentUser && currentUser.from != 'phone' && content);
      if (currentUser.from == 'wx') return shareWx(content);
      else return shareQQ(content);
    };
  }
)

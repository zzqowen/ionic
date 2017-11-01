angular.module('darwin.postService', ['darwin.services'])
.service('PostService',
  function ($rootScope, $q, AuthService, HttpHelper, PostServer, $ionicModal, globals, util, store){
    var self = this;
    var currentUser = store.getUser();

    var pushMessage = {
      history : {
        question: [],
        answer : []
      }
    };

    this.getPushMessage = function(){
      console.log('pushMessage');
      return pushMessage;
    };

    this.getUnread = function(){
      console.log(pushMessage.history.question, pushMessage.history.answer);
      var unreadMessages = 0;
      if (pushMessage.history.question && pushMessage.history.answer) {
        unreadMessages = pushMessage.history.question.length + pushMessage.history.answer.length;
      };
      return unreadMessages;
    };

    this.getSlideImg = function() {
      var preUrl = globals.server.get();
      return this.getRecentPosts(true, '/get_recent_posts_new/').then(function(data) {
        var imgUrl = data.banner;
        for (var key in imgUrl) {
          if (imgUrl.hasOwnProperty(key)) {
            imgUrl[key].img = preUrl + '/file/' + imgUrl[key].img;
          };
        };
        return imgUrl;
      })
    };

    this.getBanner = function() {
      var preUrl = globals.server.get();
      var deferral = $q.defer();
      HttpHelper.post(util.getOpenUrl('/banner/get')).then(
        function(data){
          if(data.status == globals.ok) {
            var imgUrl = data.banner;
            for (var key in imgUrl) {
              if (imgUrl.hasOwnProperty(key)) {
                imgUrl[key].img = preUrl + '/file/' + imgUrl[key].img;
              };
            };
            console.log(data);
            deferral.resolve(data);
          }
        }
      )
      return deferral.promise;
    };

    this.getPostsList = function() {
      return [
        {name: '推荐', url: '/get_recent_posts_new/', posts: [], loaded: false, hasMore: true, isLoading: false, timestamp: 0, isEmpty: true},
        {name: '生活', value: '/life', url: '/getPosts_new/life', posts: [], loaded: false, hasMore: true, isLoading: false, timestamp: 0, isEmpty: true},
        {name: '情感', value: '/emotion', url: '/getPosts_new/emotion', posts: [], loaded: false, hasMore: true, isLoading: false, timestamp: 0, isEmpty: true},
        {name: '就业', value: '/sports', url: '/getPosts_new/sports', posts: [], loaded: false, hasMore: true, isLoading: false, timestamp: 0, isEmpty: true},
        {name: '娱乐', value: '/entertainment', url: '/getPosts_new/entertainment', posts: [], loaded: false, hasMore: true, isLoading: false, timestamp: 0, isEmpty: true},
        {name: '教育', value: '/edu', url: '/getPosts_new/edu', posts: [], loaded: false, hasMore: true, isLoading: false, timestamp: 0, isEmpty: true},
      ];
    };

    this.getHistoryList = function() {
      return [
        {name: '关注', value: '2', list: [], hasMore: true, loaded:false, isLoading: false, timestamp: null, isEmpty: true},
        {name: '回答', value: '1', list: [], hasMore: true, loaded:false, isLoading: false, timestamp: null, isEmpty: true},
        {name: '提问', value: '0', list: [], hasMore: true, loaded:false, isLoading: false, timestamp: null, isEmpty: true}
      ];
    };

    this.setAvatar = function(src){
      var index = src.lastIndexOf('/') + 1;
      if (src.slice(index) == 'darwin.png' || src.indexOf('https') != 0) return src;
      return src.slice(0,index) + 'thumb_' + src.slice(index);
    };

    this.getRecentPosts = function(refresh, url, lastPostTimeStamp, from, id, cache) {
      if (cache) return PostServer.getRecentPosts(currentUser._id, category);
      var content = {
        date: lastPostTimeStamp,
        refresh: refresh,
        _id: '010101010101010101010101',
        from: from
      };
      var deferral = $q.defer();
      HttpHelper.post(util.getApiUrl(url), content).then(
        function(data){
          if (data.status == globals.ok) data.posts = PostServer.set(data.posts);
          deferral.resolve(data);
        },
        function(error){
          console.error(error);
          deferral.reject(error);
        }
      )
      return deferral.promise;
    };

    this.getMyPosts = function(type, active, cache) {
      if (cache) return PostServer.getPostsForUser(currentUser._id, type, active);
      var content = {};
      content.page = 1;
      content.type = 1;
      content.refresh = true;
      content.active = active;
      var deferral = $q.defer();
      HttpHelper.post(util.getApiUrl('/get_my_posts/'), content).then(
        function(data){
          if (data.status == globals.ok){
            data.posts = PostServer.set(data.posts);
          }
          deferral.resolve(data);
        }
      )
      return deferral.promise;
    };

    this.getMyLists = function(choose, refresh, cache, timestamp, all){
      if (cache) return PostServer.getPostsForChoose(currentUser._id, choose);
      var content = {};
      content.type = choose;
      content.refresh = refresh;
      content.timestamp = timestamp;
      content.all = all;
      var deferral = $q.defer();
      HttpHelper.post(util.getApiUrl('/getHistory'), content).then(
        function(data){
          if (data.status == globals.ok){
            setLists(data.list, choose, currentUser);
            data.list = PostServer.set(data.list);
          }
          deferral.resolve(data);
        }
      )
      return deferral.promise;
    };

    var setLists = function(list, choose, user){
      for(var i=0; i<list.length; i++){
        switch(choose){
          case 0:
            list[i].author = {
              '_id' : user._id,
              'displayName' : user.displayName,
              'avatar' : user.avatar,
            };
            list[i].status-= globals.postState.stateTransform;
            // if(pushMessage.history.question.indexOf(list[i]._id)+1) list[i].unreadMessages = true;
            if(list[i].status < 0) list[i].status = globals.postState.closed;
            break;
          case 1:
            list[i].expert = {};
            list[i].expert._id = user._id;
            // if(pushMessage.history.answer.indexOf(list[i]._id)+1) list[i].unreadMessages = true;
            if(list[i].status == 0) list[i].status = globals.postState.closed;
            break;
          case 2:
            var care = {
              'care':'true',
              'careId':user._id
            }
            list[i].myCare = care;
            break;
        }
      }
    }

    this.getPostsGrab = function(postId, isGrab, message){
      var deferral = $q.defer();
      var content = {};
      content.post_id = postId;
      HttpHelper.post(util.getApiUrl('/getPostsGrab'),content).then(
        function(data){
          console.log(data)
          if(data.status == globals.ok) {
            PostServer.addCandidates(postId, data.grabs);
            // self.getPost(postId, true, message).then(function(data) {
            //   if (isGrab) data.post.unreadMessages = true;
            // });
            if(message == globals.message.grab) $rootScope.$emit('refreshPost', postId, message, data);
          }
          deferral.resolve(data);
        }
      );
      return deferral.promise;
    };

    this.increaseUnreadMessages = function(post){
      console.log(post.unreadMessages)
      if (!post) return;
      if (!post.unreadMessages) post.unreadMessages = 1;
      else post.unreadMessages++;
    };

    this.clearUnreadMessages = function(post){
      if (post && post.unreadMessages) delete post.unreadMessages;
    };

    var messagesPush = { 
      unreadMessages: false,
      isMyPost: false
    };
    this.getPost = function(postId, reload, message) {
      if (!reload) return PostServer.getPost(postId);
      console.log('getposttoservice');
      var deferral = $q.defer();
      HttpHelper.get(util.getApiUrl('/get_post/?post_id=' + postId)).then(
        function(data){
          if (data.status == globals.ok){
            var post = PostServer.getPost(data.post._id);
            if (!post || data.post.lastUpdated > post.lastUpdated){
              data.post.unreadMessages = 1;
              messagesPush.isMyPost = (data.post.author._id == currentUser._id);
              messagesPush.unreadMessages = true;
            };
            data.post = PostServer.setPost(data.post);
            $rootScope.$emit('refreshPost', data.post._id, message, data);
          }
          deferral.resolve(data);
        }
      );
      return deferral.promise;
    };

    this.getMessagesPush = function() {
      return messagesPush;
    };

    var historyPush = { unreadMessages: false };
    $rootScope.$on("newPostMessage", function(event, postId, message){
      var post = PostServer.getPost(postId);
      var isMine = AuthService.isMine(post);
      if (message == 8 || (message == 3 && isMine) || message == 4 || (message == globals.message.comment && isMine)) {
        if(!(pushMessage.history.question.indexOf(postId)+1)) {
          pushMessage.history.question.push(postId.toString());
          PostServer.addUnreadMessages(postId);
        };
      }
      if (message == 2 || (message == globals.message.comment && !isMine) || (message == 3 && !isMine)) {
        if(!(pushMessage.history.answer.indexOf(postId)+1)) {
          pushMessage.history.answer.push(postId.toString());
          PostServer.addUnreadMessages(postId);
        }
      }
      if (message == globals.message.grab || message == globals.message.comment || message == 3 || message == 2) self.getPost(postId, true, message);
      if (message == 10) {
        self.getPost(postId, true, message);
        var indexQue = pushMessage.history.question.indexOf(postId);
        var indexAns = pushMessage.history.answer.indexOf(postId);
        if(indexQue + 1) {
          pushMessage.history.question.splice(indexQue,1);
        };
        if(indexAns + 1) {
          pushMessage.history.question.splice(indexAns,1);
        }
      }
      console.log(pushMessage);
      console.log("推送");
    });

    this.getHistoryPush = function(){
      return historyPush;
    }

    this.isExpired = function(post){
      if (!post) return true;
      if (!post.expireDate) return false;
      return post.expireDate <= new Date().toJSON();
    };

    this.isTicking = function(post){
      if (!post) return false;
      return post.status == globals.postState.answering && !self.isExpired(post);
    };

    this.avatar = function(post){
      if (!post) return null;
      if (AuthService.isSelfPosted(post) && post.expert.avatar) return post.expert.avatar;
      return post.author.avatar;
    };

    this.canDelete = function(post){
      if (!post) return false;
      if (post.status == globals.postState.answering || post.status == globals.postState.answered) return false;
      if (!AuthService.isSelfPosted(post) && !AuthService.isSelfAnswered(post)) return false;
      if (!self.isExpired(post) && post.status == globals.postState.active){
        var postDate = new Date(post.date);
        postDate.setMinutes(postDate.getMinutes() + globals.gracePeriodInMinutes);
        if (postDate < new Date()) return false;
      }
      return true;
    }

    this.canGrab = function(post){
      if (!post || AuthService.isSelfPosted(post)) return false;
      return (post.status == globals.postState.active);
    };

    this.deletePost = function(postId){
      return HttpHelper.get(util.getApiUrl('/user/delete_post/?post_id=' + postId));
    };

    this.bookmarkPost = function(post){
      BookMarkService.bookmarkPost(post);
      $rootScope.$broadcast("new-bookmark", post);
    };

    this.addNewPost = function(post){
      var deferral = $q.defer();
      HttpHelper.post(util.getApiUrl('/user/new_post/'), post).then(
        function(data){
          if (data.status == globals.ok){
            data.post = PostServer.setPost(data.post);
            $rootScope.$emit('refreshPost', data.post._id, globals.message.post);
            AuthService.updateUser();
          }
          deferral.resolve(data);
        }
      );
      return deferral.promise;
    };

    this.startGrab = function(post_id, author_id, deadLine){
      var deferral = $q.defer();
      var content = {};
      content.post_id = post_id;
      content.author_id = author_id;
      content.deadLine = deadLine;
      HttpHelper.post(util.getApiUrl('/grabPost'),content).then(
        function(data){
          if(data.status == globals.ok){
            var candidates = [currentUser._id];
            PostServer.addCandidates(post_id, candidates);
          }
          deferral.resolve(data);
        }
      );
      return deferral.promise;
    };

    this.newGrab = function(post_id, author_id){
      var deferral = $q.defer();
      var content = {};
      content.post_id = post_id;
      content.author_id = author_id;
      HttpHelper.post(util.getApiUrl('/autoGrabPost'),content).then(
        function(data){
          console.log(data);
          if(data.status == globals.ok){
            console.log(data);
            data.post = PostServer.setPost(data.post);
          }
          deferral.resolve(data);
        }
      );
      return deferral.promise;
    };


    this.chooseRespondent = function(post_id, answer_id){
      var deferral = $q.defer();
      var content = {};
      content.post_id = post_id;
      content.answer_id = answer_id;
      HttpHelper.post(util.getApiUrl('/chooseAnswer'),content).then(
        function(data){
          deferral.resolve(data);
        }
      );
      return deferral.promise;
      };

    this.startAnswer = function(postId){
      var deferral = $q.defer();
      HttpHelper.get(util.getApiUrl('/user/start_answer/?post_id=' + postId)).then(
        function(data){
          if (data.status == globals.ok){
            data.post = PostServer.setPost(data.post);
            $rootScope.$emit('refreshPost', data.post._id, globals.message.grab);
          }
          deferral.resolve(data);
        }
      );
      return deferral.promise;
    };

    this.acceptAnswer = function(postId){
      var deferral = $q.defer();
      HttpHelper.get(util.getApiUrl('/user/accept_answer/?post_id=' + postId)).then(
        function(data){
          if (data.status == globals.ok){
            data.post = PostServer.setPost(data.post);
          }
          deferral.resolve(data);
        }
      );
      return deferral.promise;
    };

    this.submitComment = function(comment) {
      return HttpHelper.post(util.getApiUrl('/user/post_comment/'), comment);
    };

    this.updateStatus = function(postId, status){
      return HttpHelper.get(util.getApiUrl('/update_post_status/?post_id=' + postId + '&status=' + status));
    };

    this.submitReview = function(review){
      return HttpHelper.post(util.getApiUrl('/user/post_review/'), review);
    };

    this.getNewPost = function(){
      return PostServer.newPost;
    };

    this.getFollowPostIds = function(){
      var deferral = $q.defer();
      var content ;
      HttpHelper.post(util.getApiUrl('/getFollowPostIds'),content).then(
        function(data){
          deferral.resolve(data);
        }
      )
      return deferral.promise;
    };

    this.postSupplement = function(post_id, postUser_id, text, qid){
      var deferral = $q.defer();
      var content = {};
      content.post_id = post_id;
      content.content = text;
      content.qid = qid;
      if(qid){
        HttpHelper.post(util.getApiUrl('/discuss/answer'),content).then(
          function(data){
            deferral.resolve(data);
          }
        );
      }else{
        content.postUser_id = postUser_id;
        HttpHelper.post(util.getApiUrl('/discuss/add'),content).then(
          function(data){
            deferral.resolve(data);
          }
        );
      }
      return deferral.promise;
    }

    this.getSupplement = function(post_id){
      var deferral = $q.defer();
      var content = {};
      content.post_id = post_id;
      HttpHelper.post(util.getApiUrl('/discuss/get'),content).then(
        function(data){
          deferral.resolve(data);
        }
      )
      return deferral.promise;
    }

    this.postMyCareChange =function(post_id){
      var content = {};
      content.post_id = post_id;
      PostServer.changeCareStatus(post_id);
      HttpHelper.post(util.getApiUrl('/toggleFollowPosts'),content);
    };

    this.canRead = function(post_id){
      var content = {};
      content.post_id = post_id;
      HttpHelper.post(util.getApiUrl('/peek/accept'),content).then(
        function(data){
          if (data.status == globals.ok){
            console.log(status);
          }
        });
    };

    this.cancelGrab = function(post_id, author_id){
      var content = {};
      content.post_id = post_id;
      content.author_id = author_id;
      HttpHelper.post(util.getApiUrl('/grab/cancel'),content).then(
        function(data){
          if (data.status == globals.ok){
            console.log(data);
          }
        });
    };

    this.showAnswer = function(post_id){
      var content = {};
      content.post_id = post_id;
      var deferral = $q.defer();
      HttpHelper.post(util.getApiUrl('/peek/post'),content).then(
        function(data){
          console.log(data);
          if (data.status == globals.ok){
            var post = PostServer.getPost(post_id);
            var user = store.getUser();
            post.peeks = [user._id];
            data.post = post;
            store.updateUser({credit: user.credit - Math.floor(Number(post.price)*100)/1000}, false);
            console.log(store.getUser());
            console.log(data);
            
          }
          deferral.resolve(data);
        });
      return deferral.promise;
    };
  }
);

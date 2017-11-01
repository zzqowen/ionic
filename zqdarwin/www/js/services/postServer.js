angular.module('darwin.postServer', [])
.factory('PostServer', function(globals, $timeout){
  function roundInteger(num) {
    if (num < 10) return 10;
    var result = 1;
    while (num > 9){ num /= 10; result *= 10; }
    return (num + 1) * result;
  };

  function roundSummary(summary) {
    if (!summary) return summary;
    summary.asked = roundInteger(summary.asked);
    summary.answered = roundInteger(summary.answered);
    summary.spent = roundInteger(summary.spent);
    summary.earned = roundInteger(summary.earned);
    return summary;
  };

  function scrambleAnonymousComments(post){
    if (!post || !post.anonymous || !post.author || !post.comments) return post;
    var authorId = post.author._id;
    _.each(post.comments, function(comment, i){
      if (comment && comment.author && comment.author._id == authorId)
        post.comments[i].author = post.author;
    });
    return post;
  };

  function scrambleAnonymousPost(post){
    if (!post || !post.anonymous || !post.author) return post;
    post.author.displayName = "匿名用户";
    post.author.avatar = "data/anonymous.png";
    post.author.id = "****";
    post.author.score = roundInteger(post.author.score);
    post.author.summary = roundSummary(post.author.summary);

    scrambleAnonymousComments(post);
    return post;
  };

  const postPrefix = 'post-';
  var posts = load();
  var totalPages = 0;
  var newPost = {};

  function get(){
    return posts;
  };

  function set(posts){
    var result = [];
    _.each(posts, function(post){ if (post) result.push(setPost(post)); });
    return result;
  };

  function getPost(postId) {
    return posts[postId];
  };

  function getRecentPosts(userId, category) {
    var result = [];
    var now = new Date().toJSON();
    _.each(posts, function(post){
      if (!post) return;
      if (post.author && post.author._id == userId) return;
      if (post.status !== globals.postState.active || post.expireDate > now) return;
      if (category != undefined && post.category != category) return;
      result.push(post);
    });
    return result; 
  };

  function getSelfPosts(id) {
    var result = [];
    _.each(posts, function(post) {
      if (!post) return;
      if (post.author && post.author._id != id) return;
      result.push(post); 
    });
    return result;
  };

  function getPostsForUser(userId, type, active) {
    var now = new Date().toJSON();
    return _.filter(posts, function(post){
      if (!post) return false;
      if (active && post.status != globals.postState.active && post.status != globals.postState.answering) return false;
      if (!active && (post.status != globals.postState.closed && post.status != globals.postState.answering || post.expireDate > now)) return false;
      if ((type & globals.myPosts.questions) && post.author && post.author._id == userId) return true;
      if ((type & globals.myPosts.replies) && post.expert && post.expert._id == userId) return true;
      return false;
    });
  };

  function getPostsForChoose(userId, choose){
    var result = [];
    var now = new Date().toJSON();
    _.each(posts, function(post){
      switch(choose){
        case 0:
          if(post.author && post.author._id == userId) result.push(post);
          break;
        case 1:
          if(post.expert && post.expert._id == userId) result.push(post);
          break;
        case 2:
          if(post.myCare && post.myCare.care && post.myCare.careId == userId) result.push(post);;
          break;
      }
    });
    return result;
  }

  function changeCareStatus(postId, userId){
    (posts[postId].myCare) ? posts[postId].myCare = !posts[postId].myCare : posts[postId].myCare = true;
  }

  function deleteUnreadMessages(postId){
    if(posts[postId].unreadMessages) delete posts[postId].unreadMessages;
  }

  function addUnreadMessages(postId){
    posts[postId].unreadMessages = true;
  }

  function addCandidates(postId, candidates){
    posts[postId].candidates = candidates;
  }

  function setPost(post) {
    if (!post) return null;
    post = scrambleAnonymousPost(post);
    if (post._id in posts) post = globals.copy(post, posts[post._id], false);
    else posts[post._id] = post;
    $timeout(function(){
      window.localStorage[postPrefix + post._id] = JSON.stringify(post);
    });
    return post;
  };

  function load(){
    var result = {};
    for (var i = 0; i < window.localStorage.length; i++){
      var key = window.localStorage.key(i);
      if (!(key.slice(0, postPrefix.length) == postPrefix)) continue;
      result[key.slice(postPrefix.length)] = JSON.parse(window.localStorage[key]);
    }
    return result;
  };

  function clear(){
    posts = {};
    for(var i in window.localStorage){
      if (i.slice(0, postPrefix.length) == postPrefix) window.localStorage.removeItem(i);
    }
  };

  return {
    totalPages: totalPages,
    newPost: newPost,
    get: get,
    set: set,
    getPost: getPost,
    getRecentPosts: getRecentPosts,
    getSelfPosts: getSelfPosts,
    addCandidates: addCandidates,
    getPostsForUser: getPostsForUser,
    getPostsForChoose: getPostsForChoose,
    changeCareStatus: changeCareStatus,
    deleteUnreadMessages: deleteUnreadMessages,
    addUnreadMessages: addUnreadMessages,
    setPost: setPost,
    clear: clear,
  }
})
;

angular.module('darwin.categoryCtrl', [])
.controller('CategoryCtrl', function($scope, PkService, shareService, $rootScope, $ionicHistory, $timeout, $state, $stateParams, AuthService, store, globals)
{
  $scope.categories = globals.categories;
  $scope.selectedCategory = {selected: false};
  $scope.isInvite = ($stateParams.source == "phoneLogin" || $stateParams.source == "nickname");
  var user = store.getUser();

  $scope.pkObj = PkService.getPkObj();
  shareService.getCtrlScope($scope);

  $scope.goBack = function(){
    $ionicHistory.goBack();
  };

  $scope.accept = function(){
    var previousUserInterests = user.interests.slice(0);
    $scope.save();
    var changed = $scope.userInterestsChanged(previousUserInterests);
    if (changed) $rootScope.$emit('refreshHomePage');
    if ($stateParams.source == "phoneLogin" || $stateParams.source == "nickname") $state.go('invite');
    else $scope.goBack();
  };

  $scope.load = function(){
    $scope.categories.forEach(function(list){
      list.forEach(function(category){
        if ( $stateParams.source == "newpost"){
          category.selected = (user.newPostCategory == category.value);
          if (category.selected) $scope.selectedCategory = category;
        }
        else {
          if (user.interests){
            if (user.interests.indexOf($scope.selectedCategory) == -1)
              category.selected = false;
            if (user.interests.length > 0){
              user.interests.forEach(function(value){
                if (value == category.value) category.selected = true;
              });
            }
          };
        }
      });
    });
  };
  $scope.load();

  $scope.save = function(){
    if ($stateParams.source == "newpost"){
      if($scope.selectedCategory.value) {
        user.newPostCategory = $scope.selectedCategory.value;
        window.localStorage.selectedCategoryValue = $scope.selectedCategory.value;
        window.localStorage.selectedCategoryName = $scope.selectedCategory.name;
      } 
      else {
        user.newPostCategory = '';
        window.localStorage.selectedCategoryValue ='';
        window.localStorage.selectedCategoryName = '';
      } 
    }
    else{
      user.interests = [];
      $scope.categories.forEach(function(list){
        list.forEach(function(category){
          if (category.selected) user.interests.push(category.value);
          });
      });
      AuthService.changeUserInfo({interests: user.interests});
    }
  };
  
  $scope.selectionChanged = function(value){
    value.selected = !value.selected;
    if ($stateParams.source == "newpost"){
      if (value.selected && $scope.selectedCategory.selected)
        $scope.selectedCategory.selected = false;
      if (value.selected) $scope.selectedCategory = value;
      else $scope.selectedCategory = {selected: false};
    }
  }

  $scope.userInterestsChanged = function(previousUserInterests) {
    return !(previousUserInterests.toString() == user.interests.toString())};
})

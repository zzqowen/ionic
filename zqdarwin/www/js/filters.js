angular.module('darwin.filters', [])

.filter('rawHtml', ['$sce', function($sce){
  return function(val) {
    return $sce.trustAsHtml(val);
  };
}])
.filter('textOverflow', function(){
  return function(val, char){
    var width = angular.element(document.querySelector('ion-nav-view'))[0].offsetWidth;
    var num = 0;
    var str = val;
    str = str.replace(/[\u4E00-\u9FA5]/g, "nb");
    var en = val.length*2 - str.length;
    if (char == 1){
        num = Math.floor((width-30)/15)*3 - 8;
        num = num + Math.floor(en*0.1);
    }else if(char == 2){
      num = Math.floor(width/25);
    }else if(char == 3){
      num = Math.floor(width/15);
    }else if(char == 4){
      num = Math.floor((width-20)/15);
      num = 3*num;
    }else if(char == 5){
      num = 11;
    }
    if (val.length >= num){
      return val.substr(0, num-1) + "...";
    }else{
      return val;
    }
  }
})
.filter('displayName', function() {
		return function(str) {
      var num = 6;
			(str.length > num) ? str = str.substr(0 , num) + '...': str;
      return str;
		}
})
.filter('fontChinese', function(){
  return function(val, char){
    if (char == 0){
      var num =["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十", "二十一"];
      return num[val-1];
    } else if (char == 1){
      var character = ["A","B","C","D"];
      return character[val];
    }
  }
})
.filter('scoreLevel', function(){
  return function(val){
    return Math.ceil(val/1000);
  }
})

.filter('typeChange', function(globals){
  return function(val){
    var name;
    globals.pkType.forEach(function(item){
      if (item.value == val) name = item.name;
    })
    return name;
  }
})

.filter('categoryName', function(globals){
  return function(value){
    for (var i = 0; i < globals.categories.length; i++){
      var list = globals.categories[i];
      for (var j = 0; j < list.length; j++){
        var category = list[j];
        if (category.value == value) return category.name;
      }
    }
    return value;
  };
})

.filter('pkRankSort', function(){
  return function(data){
    var arr = [];
    for (var i in data){
      for (var j in data){
        if (data[j].score > data[i].score){
          arr.push(data[j]);
        }
      }
      data[i].rank = arr.length + 1;
      arr = [];
    }
    return data;
  }
})

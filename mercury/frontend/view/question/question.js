var app = angular.module('myApp', []);

app.controller('myCtrl', function ($scope, $http) {
    var showPage = function () {
        $http.get("/question/list/" + $scope.curpage + "/" + $scope.pageSize).success(function (datas) {
            var startIndex = ($scope.curpage - 1) * $scope.pageSize + 1;
            var questions = [];
            for (var i = 0; i < datas.length; i++) {
                datas[i].index = startIndex;
                questions.push(datas[i]);
                startIndex++;
            }
            $scope.questions = questions;
        });
    }
    $scope.curpage = 1;
    $scope.pageSize = 50;
    $scope.sendToAddPage = function () {
        window.location.href = "/question/view/add.html";
    };
    $scope.deleteQuestion = function (_id) {
        if(confirm("是否要删除该条记录")) {
            $http.post("/question/delete",{_id: _id}).success(function (datas) {
                showPage();
            }).error(function (deleteError){
                alert("deleteError");
            });
        }
    }
    $scope.showDetail = function (_id) {
        window.location.href = "/question/view/detail.html#/" + _id;
    }
    showPage();
    
});
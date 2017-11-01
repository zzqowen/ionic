var app = angular.module("detailapp", []);
app.controller("detailcontroller", function($scope, $http, $location) {
        var _id = $location.url().substring(1);
        $http.get("/question/detail/" + _id).success(function(datas) {
            $scope.content = datas.content;
            $scope.feedback = datas.feedback;
            $scope.multi = datas.multi;
            var created_date = new Date(datas.created_date);
            $scope.created_date = created_date.getFullYear() + "-" + (created_date.getMonth() + 1) + "-" + created_date.getDate() + " " + created_date.getHours() + ":" + created_date.getMinutes() + ":" + created_date.getSeconds();
            $scope.ans = datas.ans;
            $scope.correct = datas.correct;
        });
    }
);
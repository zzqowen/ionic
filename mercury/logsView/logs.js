var app = angular.module('myApp', []);

function makePage($scope, page, pageSize, $http) {
    $http.get("/logs/list/" + page + "/" + pageSize).then(function (callback) {
        var data = callback.data;
        console.log(data);
        $scope.files = data.data;
        $scope.totalPage = data.total;
        $scope.curpage = page;

        $scope.pages = pageGenerate(page, data.total);
    });
}

function pageGenerate(curPage, totalPage) {
    var page = [];
    if (curPage <= 5) {
        for (var i = 0; i <= 10 && i < totalPage; i++) {
            page.push(i + 1);
        }
        return page;
    }
    else if (totalPage - curPage <= 5) {
        var beginPage = totalPage - 11 >= 0 ? totalPage - 11 : 0;
        for (var i = beginPage; i < totalPage; i++) {
            page.push(i + 1);
        }
        return page;
    }
    else {
        for (var i = curPage - 5, j = 0; j < 11 && i < totalPage; j++ , i++) {
            page.push(i + 1);
        }
        return page;
    }
}

app.controller('myCtrl', function ($scope, $http) {
    $scope.pageSize = 10;
    $http.get("/logs/list/1/10").then(function (callback) {
        var data = callback.data;
        console.log(data);
        $scope.files = data.data;
        $scope.totalPage = data.total;
        $scope.curpage = 1;
        $scope.pages = pageGenerate(1, data.total);

        $scope.bindClick = function (page, pageSize) {
            makePage($scope, page, pageSize, $http);
        }

        $scope.prePage = function () {
            var prePage = $scope.curpage - 1;
            if (prePage <= 0) return;
            makePage($scope, prePage, $scope.pageSize, $http);
        }

        $scope.nextPage = function () {
            var nextPage = $scope.curpage + 1;
            if (nextPage > $scope.totalPage) return;
            makePage($scope, nextPage, $scope.pageSize, $http);
        }
    });
});
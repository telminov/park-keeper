angular.module('parkKeeper').run(['$templateCache', function($templateCache) {
    $templateCache.put('controllers/main.html',
        "<h1>Hello!</h1>");
}]);
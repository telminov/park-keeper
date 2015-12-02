angular.module('parkKeeper')
.controller 'WorkTaskDetailCtrl', ($scope, $routeParams, $log, WorkTask) ->
    WorkTask.get($routeParams.id).then (task) ->
        $scope.task = task
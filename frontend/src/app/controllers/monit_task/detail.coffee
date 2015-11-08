angular.module('parkKeeper')
.controller 'MonitTaskDetailCtrl', ($scope, $routeParams, $log, MonitTask) ->
    MonitTask.get($routeParams.id).then (task) ->
        $scope.task = task
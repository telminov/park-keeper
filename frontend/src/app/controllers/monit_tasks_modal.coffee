angular.module('parkKeeper')
.controller 'MonitTasksModalCtrl', ($scope, $uibModalInstance, tasks) ->
    $scope.tasks = tasks

    $scope.cancel = ->
        $uibModalInstance.dismiss('cancel')
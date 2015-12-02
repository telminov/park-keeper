angular.module('parkKeeper')
.controller 'WorkScheduleLatestResultsCtrl', ($scope, $routeParams, $log,
                                                WorkSchedule, WORK_STATUS_UPDATE) ->
    $scope.schedule = WorkSchedule.load($routeParams.id)

    statusListener = $scope.$on(WORK_STATUS_UPDATE, ->
        $scope.schedule.updateHostsStatus()
    )
    $scope.$on('$destroy', statusListener)

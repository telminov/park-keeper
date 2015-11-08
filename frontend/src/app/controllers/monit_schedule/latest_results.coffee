angular.module('parkKeeper')
.controller 'MonitScheduleLatestResultsCtrl', ($scope, $routeParams, $log,
                                                MonitSchedule, MONIT_STATUS_UPDATE) ->
    $scope.schedule = MonitSchedule.load($routeParams.id)

    statusListener = $scope.$on(MONIT_STATUS_UPDATE, ->
        $scope.schedule.updateHostsStatus()
    )
    $scope.$on('$destroy', statusListener)

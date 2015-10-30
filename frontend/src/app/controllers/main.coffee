angular.module('parkKeeper')
.controller 'MainCtrl', ($scope, $log, $timeout, swWebSocket,
                         monitStatus, MONIT_STATUS_UPDATE, MonitSchedule) ->
    $scope.monitSchedules = MonitSchedule.GetAll()

    monitStatusListener = $scope.$on(MONIT_STATUS_UPDATE, (e, statuses) ->
        for schedule in $scope.monitSchedules
            schedule.updateHostsStatus(statuses)
    )
    $scope.$on('$destroy', monitStatusListener)

    $scope.waitingTasks = monitStatus.getWaiting()
    $scope.monitWorkers = monitStatus.getWorkers()

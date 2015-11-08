angular.module('parkKeeper')
.controller 'MainCtrl', ($scope, $log, $timeout, $uibModal, swWebSocket,
                         monitStatus, MONIT_STATUS_UPDATE, MONIT_SCHEDULE_UPDATE, MonitScheduleCollection) ->

    scheduleCollection = new MonitScheduleCollection()
    scheduleCollection.loadAll()
    scheduleCollection.startWatch()
    $scope.$on('$destroy', scheduleCollection.stopWatch)
    $scope.monitSchedules = scheduleCollection.schedules

    $scope.waitingTasks = monitStatus.getWaiting()
    $scope.monitWorkers = monitStatus.getWorkers()


    $scope.openTask = (tasks) ->
        if not tasks.length
            return
        $uibModal.open({
            templateUrl: 'controllers/monit_tasks_modal.html',
            controller: 'MonitTasksModalCtrl',
            size: 'lg',
            resolve:
                tasks: -> tasks
        })
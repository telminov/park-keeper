angular.module('parkKeeper')
.controller 'MainCtrl', ($scope, $log, $uibModal, monitStatus, MonitScheduleCollection, workStatus, WorkScheduleCollection) ->

    monitScheduleCollection = new MonitScheduleCollection()
    monitScheduleCollection.loadAll()
    monitScheduleCollection.startWatch()
    $scope.$on('$destroy', monitScheduleCollection.stopWatch)
    $scope.monitSchedules = monitScheduleCollection.schedules

    workScheduleCollection = new WorkScheduleCollection()
    workScheduleCollection.loadAll()
    workScheduleCollection.startWatch()
    $scope.$on('$destroy', workScheduleCollection.stopWatch)
    $scope.workSchedules = workScheduleCollection.schedules

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
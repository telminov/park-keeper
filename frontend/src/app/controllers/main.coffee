angular.module('parkKeeper')
.controller 'MainCtrl', ($scope, $log, $timeout, $uibModal, swWebSocket,
                         monitStatus, MONIT_STATUS_UPDATE, MONIT_SCHEDULE_UPDATE, MonitSchedule) ->
    $scope.monitSchedules = MonitSchedule.GetAll()

    updateMonitSchedule = (scheduleData) ->
        # try update exists
        for schedule in $scope.monitSchedules
            if schedule.id == scheduleData.id
                schedule.update(scheduleData)
                return

        # add new
        new_schedule = new MonitSchedule(scheduleData)
        $scope.monitSchedules.push(new_schedule)

    deleteMonitSchedule = (scheduleData) ->
        for schedule, i in $scope.monitSchedules
            if schedule.id == scheduleData.id
                $scope.monitSchedules.splice(i, 1)
                return

    updateMonitSchedulesStatuses = ->
        for schedule in $scope.monitSchedules
            schedule.updateHostsStatus(monitStatus.getStatus())
    $timeout(
        updateMonitSchedulesStatuses,
        1000
    )

    monitStatusListener = $scope.$on(MONIT_STATUS_UPDATE, updateMonitSchedulesStatuses)

    monitScheduleListener = $scope.$on(MONIT_SCHEDULE_UPDATE, (e, data) ->
        if data.event == 'create' or data.event == 'update'
            updateMonitSchedule(data.instance)
        else if data.event == 'delete'
            deleteMonitSchedule(data.instance)
        else
            $log.error('Unexpected monitScheduleListener data', data)

        updateMonitSchedulesStatuses()
    )

    $scope.$on('$destroy', ->
        monitStatusListener()
        monitScheduleListener()
    )

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
angular.module('parkKeeper')

.constant('MONIT_STATUS_UPDATE', 'MONIT_STATUS_UPDATE')
.constant('WAITING_TASKS_UPDATE', 'WAITING_TASKS_UPDATE')
.constant('STARTED_TASKS_UPDATE', 'STARTED_TASKS_UPDATE')

.service 'monitStatus', (
        $log, $rootScope, swHttpHelper, swWebSocket, config,
        MONIT_STATUS_UPDATE, WAITING_TASKS_UPDATE, STARTED_TASKS_UPDATE) ->
    status = []
    waiting = []
    started = []

    updateStatus = (statusItem) ->
        for item, i in status
            if item.monit_name == statusItem.monit_name and item.host_address == statusItem.host_address
                status[i] = statusItem
                return
        status.push(statusItem)

    updateWaiting = (waitingTasks) ->
        waiting.length = 0
        for task in waitingTasks
            waiting.push(task)

    updateStarted = (startedTasks) ->
        started.length = 0
        for task in startedTasks
            started.push(task)

    subscribeMonitStatus = ->
        socket = new swWebSocket("#{ config.wsServerAddress }/monits")

        socket.onMessage (msg) ->
            statusItem = JSON.parse(msg)
            updateStatus(statusItem)
#            $log.debug(statusItem)
            $rootScope.$broadcast(MONIT_STATUS_UPDATE, status)

        durable = true
        socket.start(durable)
#        $log.debug('start subscribeMonitStatus')


    subscribeWaitingTasks = ->
        socket = new swWebSocket("#{ config.wsServerAddress }/waiting_tasks")

        socket.onMessage (msg) ->
            waitingTasks = JSON.parse(msg).waiting_tasks
            updateWaiting(waitingTasks)
#            $log.debug('subscribeWaitingTasks', waitingTasks)
            $rootScope.$broadcast(WAITING_TASKS_UPDATE, waiting)

        durable = true
        socket.start(durable)


    subscribeStartedTasks = ->
        socket = new swWebSocket("#{ config.wsServerAddress }/started_tasks")

        socket.onMessage (msg) ->
            startedTasks = JSON.parse(msg).started_tasks
            updateStarted(startedTasks)
#            $log.debug('subscribeStartedTasks', startedTasks)
            $rootScope.$broadcast(STARTED_TASKS_UPDATE, started)

        durable = true
        socket.start(durable)


    this.start = ->
#        $log.info 'start MonitStatus'
        this.getLatest().then subscribeMonitStatus
        subscribeWaitingTasks()
        subscribeStartedTasks()

    this.getLatest = ->
        return swHttpHelper.get("#{ config.serverAddress }/monit_status_latest/").then (response) ->
            status.length = 0
            for item in response.data.monit_status_latest
                status.push(item)

            $rootScope.$broadcast(MONIT_STATUS_UPDATE, status)

            return status

    this.getStatus = ->
        return status

    this.getWaiting = ->
        return waiting

    return this
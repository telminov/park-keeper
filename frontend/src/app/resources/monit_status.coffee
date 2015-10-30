angular.module('parkKeeper')

.constant('MONIT_STATUS_UPDATE', 'MONIT_STATUS_UPDATE')
.constant('WAITING_TASKS_UPDATE', 'WAITING_TASKS_UPDATE')
.constant('STARTED_TASKS_UPDATE', 'STARTED_TASKS_UPDATE')

.service 'monitStatus', (
        $log, $rootScope, swHttpHelper, swWebSocket, config,
        MONIT_STATUS_UPDATE, WAITING_TASKS_UPDATE, STARTED_TASKS_UPDATE) ->
    status = []
    waiting = []
    workers = []

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

    updateWorkers = (currentWorkers) ->
        workers.length = 0
        for worker in currentWorkers
            workers.push(worker)

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


    subscribeWorkersTasks = ->
        socket = new swWebSocket("#{ config.wsServerAddress }/current_workers")

        socket.onMessage (msg) ->
            currentWorkers = JSON.parse(msg).current_workers
            updateWorkers(currentWorkers)
#            $log.debug('subscribeWorkersTasks', currentWorkers)
            $rootScope.$broadcast(STARTED_TASKS_UPDATE, workers)

        durable = true
        socket.start(durable)


    this.start = ->
#        $log.info 'start MonitStatus'
        this.getLatest().then subscribeMonitStatus
        subscribeWaitingTasks()
        subscribeWorkersTasks()

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

    this.getWorkers = ->
        return workers

    return this
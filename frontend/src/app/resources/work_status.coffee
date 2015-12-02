angular.module('parkKeeper')

.constant('WORK_SCHEDULE_UPDATE', 'WORK_SCHEDULE_UPDATE')
.constant('WORK_STATUS_UPDATE', 'WORK_STATUS_UPDATE')


.service 'workStatus', (
        $log, $rootScope, swHttpHelper, swWebSocket, config,
        WORK_SCHEDULE_UPDATE, WORK_STATUS_UPDATE) ->
    status = []

    updateStatus = (statusItem) ->
        for item, i in status
            if item.work_name == statusItem.work_name \
                and item.host_address == statusItem.host_address \
                and item.schedule_id == statusItem.schedule_id
                    status[i] = statusItem
                    return
        status.push(statusItem)

    subscribeWorkStatus = ->
        socket = new swWebSocket("#{ config.wsServerAddress }/works")

        socket.onMessage (msg) ->
            statusItem = JSON.parse(msg)
            updateStatus(statusItem)
#            $log.debug(statusItem)
            $rootScope.$broadcast(WORK_STATUS_UPDATE, status)

        durable = true
        socket.start(durable)
#        $log.debug('start subscribeWorkStatus')


    subscribeWorkSchedule = ->
        socket = new swWebSocket("#{ config.wsServerAddress }/work_schedules")

        socket.onMessage (msg) ->
            workSchedule = JSON.parse(msg)
#            $log.debug('subscribeWorkSchedule', workSchedule)
            $rootScope.$broadcast(WORK_SCHEDULE_UPDATE, workSchedule)

        durable = true
        socket.start(durable)


    this.start = ->
#        $log.info 'start WorkStatus'
        this.getLatest().then(subscribeWorkStatus)
        subscribeWorkSchedule()

    this.getLatest = ->
        return swHttpHelper.get("#{ config.serverAddress }/work_status_latest/").then (response) ->
            status.length = 0
            for item in response.data.work_status_latest
                status.push(item)

            $rootScope.$broadcast(WORK_STATUS_UPDATE, status)

            return status

    this.getStatus = ->
        return status

    return this
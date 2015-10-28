angular.module('parkKeeper')

.constant('MONIT_STATUS_UPDATE', 'MONIT_STATUS_UPDATE')

.service 'monitStatus', ($log, $rootScope, swHttpHelper, swWebSocket, config, MONIT_STATUS_UPDATE) ->
    status = []

    updateStatus = (statusItem) ->
        for item, i in status
            if item.monit_name == statusItem.monit_name and item.host_address == statusItem.host_address
                status[i] = statusItem
                return
        status.push(statusItem)

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


    this.start = ->
#        $log.info 'start MonitStatus'
        this.getLatest().then subscribeMonitStatus

    this.getLatest = ->
        return swHttpHelper.get("#{ config.serverAddress }/monit_status_latest/").then (response) ->
            status.length = 0
            for item in response.data.monit_status_latest
                status.push(item)

            $rootScope.$broadcast(MONIT_STATUS_UPDATE, status)

            return status

    this.getStatus = ->
        return status

    return this
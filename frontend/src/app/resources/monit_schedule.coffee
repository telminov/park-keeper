angular.module('parkKeeper')

.factory 'MonitScheduleResource', ($resource, config) ->
    url = "#{ config.serverAddress }/monit_schedule/:id/"
    return $resource(url)


.factory 'MonitSchedule', (MonitScheduleResource) ->
    class MonitSchedule
        constructor: (data) ->
            this.latestStatusDt = undefined
            angular.extend(this, data or {})

        isOk: ->
            for host in this.all_hosts
                if host.status != undefined and not host.status.level == 1
                    return false
            return true

        updateHostsStatus: (statuses) ->
            for statusItem in statuses
                if statusItem.schedule_id != this.id
                    continue

                host = this.getHost(statusItem.host_address)
                if not host
                    continue

                host.status = statusItem
                host.status.result_dt = moment(statusItem.result_dt).toDate()
                if not this.latestStatusDt or host.status.result_dt > this.latestStatusDt
                    this.latestStatusDt = host.status.result_dt

        getHost: (hostAddress) ->
            for host in this.all_hosts
                if host.address == hostAddress
                    return host

        @GetAll: ->
            schedules = []

            schedulesData = MonitScheduleResource.query ->
                for itemData in schedulesData
                    schedule = new MonitSchedule(itemData)
                    schedules.push(schedule)

            return schedules

    return MonitSchedule
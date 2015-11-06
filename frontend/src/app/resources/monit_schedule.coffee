angular.module('parkKeeper')

.factory 'MonitScheduleResource', ($resource, config) ->
    url = "#{ config.serverAddress }/monit_schedule/:id/"
    return $resource(url)


.factory 'MonitSchedule', (MonitScheduleResource) ->
    class MonitSchedule

        constructor: (data) ->
            this.latestStatusDt = undefined
            this.latestStatusLevel = undefined
            angular.extend(this, data or {})

        @GetAll: ->
            schedules = []

            schedulesData = MonitScheduleResource.query ->
                for itemData in schedulesData
                    schedule = new MonitSchedule(itemData)
                    schedules.push(schedule)

            return schedules

        getLabel: ->
            return this.name or this.monit.name

        update: (data) ->
            angular.extend(this, data or {})

        updateHostsStatus: (statuses) ->
            for statusItem in statuses
                if statusItem.schedule_id != this.id
                    continue

                host = this.getHost(statusItem.host_address)
                if not host
                    continue

                this.latestStatusLevel = undefined

                host.status = statusItem
                host.status.result_dt = moment(statusItem.result_dt).toDate()
                if not this.latestStatusDt or host.status.result_dt > this.latestStatusDt
                    this.latestStatusDt = host.status.result_dt

                if not this.latestStatusLevel or this.latestStatusLevel < host.status.level
                    this.latestStatusLevel = host.status.level

                if not this.latestStatusDt or this.latestStatusDt < host.status.result_dt
                    this.latestStatusDt = host.status.result_dt

        getHost: (hostAddress) ->
            for host in this.all_hosts
                if host.address == hostAddress
                    return host

        isUndefined: ->
            return this.latestStatusLevel == undefined
        isOk: ->
            return this.latestStatusLevel == 1
        isWarning: ->
            return this.latestStatusLevel == 2
        isFail: ->
            return this.latestStatusLevel == 3

        isFresh: ->
            deadline = moment().subtract(this.period * 2, 'seconds').toDate()
            return this.latestStatusDt > deadline

    return MonitSchedule
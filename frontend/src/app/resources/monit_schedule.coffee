angular.module('parkKeeper')

.factory 'MonitScheduleResource', ($resource, config) ->
    url = "#{ config.serverAddress }/monit_schedule/:id/"
    return $resource(url)


.factory 'MonitSchedule', ($log, monitStatus, MonitScheduleResource) ->
    class MonitSchedule

        @load: (id) ->
            schedule = new MonitSchedule()
            scheduleData = MonitScheduleResource.get {id: id}, ->
                schedule = schedule.update(scheduleData)
                schedule.updateHostsStatus()
            return schedule

        constructor: (data) ->
            this.latestStatusDt = undefined
            this.latestStatusLevel = undefined
            angular.extend(this, data or {})

        getLabel: ->
            return this.name or this.monit?.name

        update: (data) ->
            angular.extend(this, data or {})

        updateHostsStatus: ->
            for statusItem in monitStatus.getStatus()
                if statusItem.schedule_id != this.id
                    continue

                host = this.getHost(statusItem.host_address)
                if not host
                    continue

                this.latestStatusLevel = undefined

                if statusItem.result_dt
                    statusItem.result_dt = moment(statusItem.result_dt).toDate()

                host.status = statusItem
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
            
        getLevelLabel: ->
            if this.isUndefined()
                return 'Undefined'
            else if this.isOk()
                return 'Ok'
            else if this.isWarning()
                return 'Warning'
            else if this.isFail()
                return 'Fail'

        isFresh: ->
            deadline = moment().subtract(this.period * 2, 'seconds').toDate()
            return this.latestStatusDt > deadline

    return MonitSchedule


.factory 'MonitScheduleCollection', ($log, $rootScope, MonitSchedule, MonitScheduleResource,
                                    MONIT_STATUS_UPDATE, MONIT_SCHEDULE_UPDATE) ->
    class MonitScheduleCollection

        constructor: ->
            this.schedules = []
            this.statusListener = undefined
            this.scheduleListener = undefined

        loadAll: ->
            this.schedules.length = 0
            schedulesData = MonitScheduleResource.query =>
                for itemData in schedulesData
                    schedule = new MonitSchedule(itemData)
                    this.schedules.push(schedule)
                this._updateStatuses()

        startWatch: ->
            this.statusListener = $rootScope.$on(MONIT_STATUS_UPDATE, => this._updateStatuses())
            this.scheduleListener = $rootScope.$on(MONIT_SCHEDULE_UPDATE, (e, data) => this._processScheduleEvent(e, data))

        stopWatch: ->
            if this.statusListener
                this.statusListener()
                this.statusListener = undefined

            if this.scheduleListener
                this.scheduleListener()
                this.scheduleListener = undefined

        getIndex: (scheduleId) ->
            for schedule, i in this.schedules
                if schedule.id == scheduleId
                    return i

        getSchedule: (scheduleId) ->
            index = this.getIndex(scheduleId)
            schedule = this.schedules[index]
            return schedule

        _updateStatuses: ->
            for schedule in this.schedules
                schedule.updateHostsStatus()

        _processScheduleEvent: (e, data) ->
            if data.event == 'create' or data.event == 'update'
                this._updateSchedule(data.instance)
            else if data.event == 'delete'
                this._deleteSchedule(data.instance)
            else
                $log.error('Unexpected monitScheduleListener data', data)
            this._updateStatuses()

        _updateSchedule: (scheduleData) ->
            schedule = this.getSchedule(scheduleData.id)
            if schedule
                schedule.update(scheduleData)
            else
                new_schedule = new MonitSchedule(scheduleData)
                this.schedules.push(new_schedule)
            $log.debug('_updateSchedule')

        _deleteSchedule: (scheduleData) ->
            index = this.getIndex(scheduleData.id)
            if index
                this.schedules.splice(index, 1)
            $log.debug('_deleteSchedule')

    return MonitScheduleCollection

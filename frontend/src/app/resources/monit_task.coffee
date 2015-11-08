angular.module('parkKeeper')

.factory 'MonitTask', (config, swHttpHelper) ->
    class MonitTask

        constructor: (data) ->
            angular.extend(this, data or {})

        @get: (taskId) ->
            return swHttpHelper.get("#{ config.serverAddress }/monit_task/#{ taskId }").then (response) ->
                task = new MonitTask(response.data)
                return task

    return MonitTask


angular.module('parkKeeper')

.factory 'WorkTask', (config, swHttpHelper) ->
    class WorkTask

        constructor: (data) ->
            angular.extend(this, data or {})

        @get: (taskId) ->
            return swHttpHelper.get("#{ config.serverAddress }/work_task/#{ taskId }").then (response) ->
                task = new WorkTask(response.data)
                return task

    return WorkTask


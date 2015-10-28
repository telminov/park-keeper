angular.module('parkKeeper')

.factory 'MonitSchedule', ($resource, config) ->
    url = "#{ config.serverAddress }/monit_schedule/:id/"
    return $resource(url)
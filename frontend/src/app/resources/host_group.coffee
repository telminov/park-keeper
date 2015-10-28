angular.module('parkKeeper')

.factory 'HostGroup', ($resource, config) ->
    url = "#{ config.serverAddress }/host_group/:id/"
    return $resource(url)
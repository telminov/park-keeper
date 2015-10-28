angular.module('parkKeeper')

.factory 'HostGroupResource', ($resource, config) ->
    url = "#{ config.serverAddress }/host_group/:id/"
    return $resource(url)
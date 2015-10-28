angular.module('parkKeeper')

.factory 'Host', ($resource, config) ->
    url = "#{ config.serverAddress }/host/:id/"
    return $resource(url)
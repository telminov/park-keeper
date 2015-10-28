angular.module('parkKeeper')

.factory 'HostResource', ($resource, config) ->
    url = "#{ config.serverAddress }/host/:id/"
    return $resource(url)


#.factory 'HostStatus', ->
#    class HostStatus
#        monitName: undefined
#        dt: undefined
#        extra: undefined
#        isSuccess: undefined
#
#        constructor: (data) ->
#            angular.extend(this, data or {})
#
#    return HostStatus
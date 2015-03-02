angular.module('parkKeeper')

.factory 'State', ($resource) ->
    # TODO: move out server address to config
    return $resource('http://127.0.0.1:8000/state/:id/')


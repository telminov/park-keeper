angular.module('swUtils', [])
    .filter 'reverse', ->
        return (items) ->
            return items.slice().reverse()

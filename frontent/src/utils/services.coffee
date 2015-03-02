angular.module('swUtils')

.service 'swTitle', ->
    titleBase = ''
    titleStart = ''
    titleEnd = ''

    this.setTitleBase = (value) ->
        titleBase = value
    this.setTitleStart = (value) ->
        titleStart = value
    this.setTitleEnd = (value) ->
        titleEnd = value

    this.getTitle = ->
        return "#{ titleStart } #{ titleBase } #{ titleEnd }"

    return
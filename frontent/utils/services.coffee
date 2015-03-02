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


.service 'swHttpHelper', ($http) ->

    this.encodeQueryData = (data) ->
        ret = []
        for d of data
            if data[d] instanceof Array
                for el in data[d]
                    ret.push encodeURIComponent(d) + "=" + encodeURIComponent(el)
            else
                ret.push encodeURIComponent(d) + "=" + encodeURIComponent(data[d])
        return ret.join("&")

    this.get = (url, params) =>
        encodeParams = this.encodeQueryData(params)
        urlWithParams = "#{ url }?#{encodeParams}"
        return $http.get(urlWithParams)

    this.post = (url, params) ->
        encodedParams = undefined
        if params
            encodedParams = $.param(params)
        return $http.post(url, encodedParams)

    this.postJson = (url, object) ->
        return $http.post(url, object)

    return
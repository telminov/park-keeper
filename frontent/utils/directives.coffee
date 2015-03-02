angular.module('swUtils')

.directive 'swFocus', ($timeout, $parse) ->
    return {
        restrict: 'A'
        link: (scope, element, attrs) ->
            model = $parse(attrs.swFocus)

            scope.$watch(model, (value) ->
                if value == true
                    $timeout(
                        ->
                            element.focus()
                    )
            )

            element.bind('blur', ->
                scope.$apply(model.assign(scope, false))
            )
    }

.directive 'swLoading', ->
    return {
        restrict: 'A'
        scope: false
        link: (scope, element, attrs) ->
            loadingLayer = $('<div class="loading"></div>').appendTo(element)
            $(element).addClass('sw-loading-container')
            scope.$watch attrs.swLoading, (value) ->
                loadingLayer.toggle(value)
    }
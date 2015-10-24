angular.module('parkKeeper', [
    'ngResource'
    'ngSanitize'
    'ngRoute'
    'ngAnimate'

    'ui.bootstrap'

    'swUtils'
    'swWebSocket'
])

.config ($routeProvider) ->
    $routeProvider
    .when('/',
      templateUrl: 'controllers/main.html'
      controller: 'MainCtrl'
      label: ''
    )

.run ($location, $rootScope, swTitle) ->
    $rootScope.swTitle = swTitle
    $rootScope.$on '$routeChangeSuccess', (event, current, previous) ->
        baseTitle = current.$$route?.label or ''
        swTitle.setTitleBase(baseTitle)
        swTitle.setTitleStart('')
        swTitle.setTitleEnd('')
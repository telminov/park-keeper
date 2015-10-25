angular.module('parkKeeper', [
    'ngResource'
    'ngSanitize'
    'ngRoute'
    'ngAnimate'

    'ui.bootstrap'

    'swUtils'
    'swWebSocket'
    'swAuth'
])

.config ($routeProvider) ->
    $routeProvider
    .when('/',
      templateUrl: 'controllers/main.html'
      controller: 'MainCtrl'
      label: ''
    )

    .when('/login/',
        templateUrl: 'controllers/login.html'
        controller: 'AuthLoginCtrl'
        label: 'Login'
    )
    .when('/logout/',
        templateUrl: 'controllers/logout.html'
        controller: 'AuthLogoutCtrl'
        label: 'Logout'
    )

.run ($location, $rootScope, swTitle) ->
    $rootScope.swTitle = swTitle
    $rootScope.$on '$routeChangeSuccess', (event, current, previous) ->
        baseTitle = current.$$route?.label or ''
        swTitle.setTitleBase(baseTitle)
        swTitle.setTitleStart('')
        swTitle.setTitleEnd('')

.config (authConfigProvider, config) ->
    authConfigProvider.setSystemLabel('parkKeeper')
    authConfigProvider.setServerAddress(config.serverAddress)
    authConfigProvider.setFreeUrls([])
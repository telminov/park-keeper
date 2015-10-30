angular.module('parkKeeper', [
    'ngResource'
    'ngSanitize'
    'ngRoute'
    'ngAnimate'

    'angular.filter'
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

.run (monitStatus) ->
    monitStatus.start()

.config (authConfigProvider, config) ->
    authConfigProvider.setSystemLabel('parkKeeper')
    authConfigProvider.setServerAddress(config.serverAddress)
    authConfigProvider.setFreeUrls([])

.config ($httpProvider) ->
    $httpProvider.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded'
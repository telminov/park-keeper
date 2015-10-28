(function() {
  angular.module('parkKeeper', ['ngResource', 'ngSanitize', 'ngRoute', 'ngAnimate', 'ui.bootstrap', 'swUtils', 'swWebSocket', 'swAuth']).config(function($routeProvider) {
    return $routeProvider.when('/', {
      templateUrl: 'controllers/main.html',
      controller: 'MainCtrl',
      label: ''
    }).when('/login/', {
      templateUrl: 'controllers/login.html',
      controller: 'AuthLoginCtrl',
      label: 'Login'
    }).when('/logout/', {
      templateUrl: 'controllers/logout.html',
      controller: 'AuthLogoutCtrl',
      label: 'Logout'
    });
  }).run(function($location, $rootScope, swTitle) {
    $rootScope.swTitle = swTitle;
    return $rootScope.$on('$routeChangeSuccess', function(event, current, previous) {
      var baseTitle, ref;
      baseTitle = ((ref = current.$$route) != null ? ref.label : void 0) || '';
      swTitle.setTitleBase(baseTitle);
      swTitle.setTitleStart('');
      return swTitle.setTitleEnd('');
    });
  }).config(function(authConfigProvider, config) {
    authConfigProvider.setSystemLabel('parkKeeper');
    authConfigProvider.setServerAddress(config.serverAddress);
    return authConfigProvider.setFreeUrls([]);
  }).config(function($httpProvider) {
    return $httpProvider.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';
  });

}).call(this);

(function() {
  angular.module('parkKeeper').constant('config', {
    serverAddress: 'http://127.0.0.1:8000'
  });

}).call(this);

(function() {
  angular.module('parkKeeper').config(function($httpProvider) {
    return $httpProvider.interceptors.push('serverErrorInterceptor');
  }).factory('serverErrorInterceptor', function($location, $q, $log) {
    return {
      responseError: function(response) {
        if (response.status === 0 || (response.status >= 500 && response.status <= 600)) {
          $log.error(response);
        }
        return $q.reject(response);
      }
    };
  });

}).call(this);

(function() {
  angular.module('parkKeeper').controller('MainCtrl', function($scope, $log, $timeout, swWebSocket, Host, HostGroup, MonitSchedule) {
    var socket;
    $log.info('MainCtrl ready!');
    socket = new swWebSocket('ws://127.0.0.1:8080/monits');
    socket.onMessage(function(msg) {
      return $log.info('WS', JSON.parse(msg));
    });
    socket.start();
    socket.send('ping');
    socket.send('ping2');
    return $timeout(function() {
      return socket.send('close_ws');
    }, 10000);
  });

}).call(this);

(function() {
  angular.module('parkKeeper').factory('Host', function($resource, config) {
    var url;
    url = config.serverAddress + "/host/:id/";
    return $resource(url);
  });

}).call(this);

(function() {
  angular.module('parkKeeper').factory('HostGroup', function($resource, config) {
    var url;
    url = config.serverAddress + "/host_group/:id/";
    return $resource(url);
  });

}).call(this);

(function() {
  angular.module('parkKeeper').factory('MonitSchedule', function($resource, config) {
    var url;
    url = config.serverAddress + "/monit_schedule/:id/";
    return $resource(url);
  });

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9hcHAuY29mZmVlIiwiYXBwL2NvbmZpZy5jb2ZmZWUiLCJhcHAvaW50ZXJjZXB0b3JzLmNvZmZlZSIsImFwcC9jb250cm9sbGVycy9tYWluLmNvZmZlZSIsImFwcC9yZXNvdXJjZXMvaG9zdC5jb2ZmZWUiLCJhcHAvcmVzb3VyY2VzL2hvc3RfZ3JvdXAuY29mZmVlIiwiYXBwL3Jlc291cmNlcy9tb25pdF9zY2hlZHVsZS5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7RUFBQSxPQUFPLENBQUMsTUFBUixDQUFlLFlBQWYsRUFBNkIsQ0FDekIsWUFEeUIsRUFFekIsWUFGeUIsRUFHekIsU0FIeUIsRUFJekIsV0FKeUIsRUFNekIsY0FOeUIsRUFRekIsU0FSeUIsRUFTekIsYUFUeUIsRUFVekIsUUFWeUIsQ0FBN0IsQ0FhQSxDQUFDLE1BYkQsQ0FhUSxTQUFDLGNBQUQ7V0FDSixjQUNBLENBQUMsSUFERCxDQUNNLEdBRE4sRUFFRTtNQUFBLFdBQUEsRUFBYSx1QkFBYjtNQUNBLFVBQUEsRUFBWSxVQURaO01BRUEsS0FBQSxFQUFPLEVBRlA7S0FGRixDQU9BLENBQUMsSUFQRCxDQU9NLFNBUE4sRUFRSTtNQUFBLFdBQUEsRUFBYSx3QkFBYjtNQUNBLFVBQUEsRUFBWSxlQURaO01BRUEsS0FBQSxFQUFPLE9BRlA7S0FSSixDQVlBLENBQUMsSUFaRCxDQVlNLFVBWk4sRUFhSTtNQUFBLFdBQUEsRUFBYSx5QkFBYjtNQUNBLFVBQUEsRUFBWSxnQkFEWjtNQUVBLEtBQUEsRUFBTyxRQUZQO0tBYko7RUFESSxDQWJSLENBZ0NBLENBQUMsR0FoQ0QsQ0FnQ0ssU0FBQyxTQUFELEVBQVksVUFBWixFQUF3QixPQUF4QjtJQUNELFVBQVUsQ0FBQyxPQUFYLEdBQXFCO1dBQ3JCLFVBQVUsQ0FBQyxHQUFYLENBQWUscUJBQWYsRUFBc0MsU0FBQyxLQUFELEVBQVEsT0FBUixFQUFpQixRQUFqQjtBQUNsQyxVQUFBO01BQUEsU0FBQSx5Q0FBMkIsQ0FB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O0VBRlcsQ0FGdEI7QUFBQTs7O0FDQUE7RUFBQSxPQUFPLENBQUMsTUFBUixDQUFlLFlBQWYsQ0FFQSxDQUFDLE9BRkQsQ0FFUyxlQUZULEVBRTBCLFNBQUMsU0FBRCxFQUFZLE1BQVo7QUFDdEIsUUFBQTtJQUFBLEdBQUEsR0FBVSxNQUFNLENBQUMsYUFBVCxHQUF3QjtBQUNoQyxXQUFPLFNBQUEsQ0FBVSxHQUFWO0VBRmUsQ0FGMUI7QUFBQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicsIFtcbiAgICAnbmdSZXNvdXJjZSdcbiAgICAnbmdTYW5pdGl6ZSdcbiAgICAnbmdSb3V0ZSdcbiAgICAnbmdBbmltYXRlJ1xuXG4gICAgJ3VpLmJvb3RzdHJhcCdcblxuICAgICdzd1V0aWxzJ1xuICAgICdzd1dlYlNvY2tldCdcbiAgICAnc3dBdXRoJ1xuXSlcblxuLmNvbmZpZyAoJHJvdXRlUHJvdmlkZXIpIC0+XG4gICAgJHJvdXRlUHJvdmlkZXJcbiAgICAud2hlbignLycsXG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbnRyb2xsZXJzL21haW4uaHRtbCdcbiAgICAgIGNvbnRyb2xsZXI6ICdNYWluQ3RybCdcbiAgICAgIGxhYmVsOiAnJ1xuICAgIClcblxuICAgIC53aGVuKCcvbG9naW4vJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdjb250cm9sbGVycy9sb2dpbi5odG1sJ1xuICAgICAgICBjb250cm9sbGVyOiAnQXV0aExvZ2luQ3RybCdcbiAgICAgICAgbGFiZWw6ICdMb2dpbidcbiAgICApXG4gICAgLndoZW4oJy9sb2dvdXQvJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdjb250cm9sbGVycy9sb2dvdXQuaHRtbCdcbiAgICAgICAgY29udHJvbGxlcjogJ0F1dGhMb2dvdXRDdHJsJ1xuICAgICAgICBsYWJlbDogJ0xvZ291dCdcbiAgICApXG5cbi5ydW4gKCRsb2NhdGlvbiwgJHJvb3RTY29wZSwgc3dUaXRsZSkgLT5cbiAgICAkcm9vdFNjb3BlLnN3VGl0bGUgPSBzd1RpdGxlXG4gICAgJHJvb3RTY29wZS4kb24gJyRyb3V0ZUNoYW5nZVN1Y2Nlc3MnLCAoZXZlbnQsIGN1cnJlbnQsIHByZXZpb3VzKSAtPlxuICAgICAgICBiYXNlVGl0bGUgPSBjdXJyZW50LiQkcm91dGU/LmxhYmVsIG9yICcnXG4gICAgICAgIHN3VGl0bGUuc2V0VGl0bGVCYXNlKGJhc2VUaXRsZSlcbiAgICAgICAgc3dUaXRsZS5zZXRUaXRsZVN0YXJ0KCcnKVxuICAgICAgICBzd1RpdGxlLnNldFRpdGxlRW5kKCcnKVxuXG4uY29uZmlnIChhdXRoQ29uZmlnUHJvdmlkZXIsIGNvbmZpZykgLT5cbiAgICBhdXRoQ29uZmlnUHJvdmlkZXIuc2V0U3lzdGVtTGFiZWwoJ3BhcmtLZWVwZXInKVxuICAgIGF1dGhDb25maWdQcm92aWRlci5zZXRTZXJ2ZXJBZGRyZXNzKGNvbmZpZy5zZXJ2ZXJBZGRyZXNzKVxuICAgIGF1dGhDb25maWdQcm92aWRlci5zZXRGcmVlVXJscyhbXSlcblxuLmNvbmZpZyAoJGh0dHBQcm92aWRlcikgLT5cbiAgICAkaHR0cFByb3ZpZGVyLmRlZmF1bHRzLmhlYWRlcnMucG9zdFsnQ29udGVudC1UeXBlJ10gPSAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJyIsImFuZ3VsYXIubW9kdWxlKCdwYXJrS2VlcGVyJylcbiAgICAuY29uc3RhbnQoJ2NvbmZpZycsIHtcbiAgICAgICAgc2VydmVyQWRkcmVzczogJ2h0dHA6Ly8xMjcuMC4wLjE6ODAwMCcsXG4gICAgfSkiLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG5cbiMgaW50ZXJjZXB0b3IgNTAwIHN0YXR1cyBlcnJvclxuLmNvbmZpZyAoJGh0dHBQcm92aWRlcikgLT5cbiAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKCdzZXJ2ZXJFcnJvckludGVyY2VwdG9yJylcblxuLmZhY3RvcnkgJ3NlcnZlckVycm9ySW50ZXJjZXB0b3InLCAoJGxvY2F0aW9uLCAkcSwgJGxvZykgLT5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3BvbnNlRXJyb3I6IChyZXNwb25zZSkgLT5cbiAgICAgICAgICAgICAgICBpZiByZXNwb25zZS5zdGF0dXMgPT0gMCBvciAocmVzcG9uc2Uuc3RhdHVzID49IDUwMCBhbmQgcmVzcG9uc2Uuc3RhdHVzIDw9IDYwMClcbiAgICAgICAgICAgICAgICAgICAgJGxvZy5lcnJvcihyZXNwb25zZSlcbiMgICAgICAgICAgICAgICAgICAgIGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLnN0YXR1c1RleHQgb3IgJydcbiMgICAgICAgICAgICAgICAgICAgIHRvYXN0ZXIucG9wKCdlcnJvcicsICfQntGI0LjQsdC60LAg0YHQtdGA0LLQtdGA0LAnLCBlcnJvck1lc3NhZ2UpXG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChyZXNwb25zZSlcblxuICAgICAgICB9IiwiYW5ndWxhci5tb2R1bGUoJ3BhcmtLZWVwZXInKVxuLmNvbnRyb2xsZXIgJ01haW5DdHJsJywgKCRzY29wZSwgJGxvZywgJHRpbWVvdXQsIHN3V2ViU29ja2V0LCBIb3N0LCBIb3N0R3JvdXAsIE1vbml0U2NoZWR1bGUpIC0+XG4gICAgJGxvZy5pbmZvICdNYWluQ3RybCByZWFkeSEnXG5cbiAgICBzb2NrZXQgPSBuZXcgc3dXZWJTb2NrZXQoJ3dzOi8vMTI3LjAuMC4xOjgwODAvbW9uaXRzJylcbiAgICBzb2NrZXQub25NZXNzYWdlIChtc2cpIC0+XG4gICAgICAgICRsb2cuaW5mbyAnV1MnLCBKU09OLnBhcnNlKG1zZylcbiAgICBzb2NrZXQuc3RhcnQoKVxuICAgIHNvY2tldC5zZW5kKCdwaW5nJylcbiAgICBzb2NrZXQuc2VuZCgncGluZzInKVxuICAgICR0aW1lb3V0KFxuICAgICAgICAtPnNvY2tldC5zZW5kKCdjbG9zZV93cycpLFxuICAgICAgICAxMDAwMFxuICAgIClcblxuIyAgICBob3N0cyA9IEhvc3QucXVlcnkgLT5cbiMgICAgICAgICRsb2cuaW5mbyBob3N0c1swXVxuI1xuIyAgICBncm91cHMgPSBIb3N0R3JvdXAucXVlcnkgLT5cbiMgICAgICAgICRsb2cuaW5mbyBncm91cHNbMF1cbiNcbiMgICAgc2NoZWR1bGUgPSBNb25pdFNjaGVkdWxlLnF1ZXJ5IC0+XG4jICAgICAgICAkbG9nLmluZm8gc2NoZWR1bGVbMF0iLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG5cbi5mYWN0b3J5ICdIb3N0JywgKCRyZXNvdXJjZSwgY29uZmlnKSAtPlxuICAgIHVybCA9IFwiI3sgY29uZmlnLnNlcnZlckFkZHJlc3MgfS9ob3N0LzppZC9cIlxuICAgIHJldHVybiAkcmVzb3VyY2UodXJsKSIsImFuZ3VsYXIubW9kdWxlKCdwYXJrS2VlcGVyJylcblxuLmZhY3RvcnkgJ0hvc3RHcm91cCcsICgkcmVzb3VyY2UsIGNvbmZpZykgLT5cbiAgICB1cmwgPSBcIiN7IGNvbmZpZy5zZXJ2ZXJBZGRyZXNzIH0vaG9zdF9ncm91cC86aWQvXCJcbiAgICByZXR1cm4gJHJlc291cmNlKHVybCkiLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG5cbi5mYWN0b3J5ICdNb25pdFNjaGVkdWxlJywgKCRyZXNvdXJjZSwgY29uZmlnKSAtPlxuICAgIHVybCA9IFwiI3sgY29uZmlnLnNlcnZlckFkZHJlc3MgfS9tb25pdF9zY2hlZHVsZS86aWQvXCJcbiAgICByZXR1cm4gJHJlc291cmNlKHVybCkiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=

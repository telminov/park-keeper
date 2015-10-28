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
  angular.module('parkKeeper').controller('MainCtrl', function($scope, $log, swWebSocket, Host, HostGroup, MonitSchedule) {
    var groups, hosts, schedule;
    $log.info('MainCtrl ready!');
    hosts = Host.query(function() {
      return $log.info(hosts[0]);
    });
    groups = HostGroup.query(function() {
      return $log.info(groups[0]);
    });
    return schedule = MonitSchedule.query(function() {
      return $log.info(schedule[0]);
    });
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9hcHAuY29mZmVlIiwiYXBwL2NvbmZpZy5jb2ZmZWUiLCJhcHAvaW50ZXJjZXB0b3JzLmNvZmZlZSIsImFwcC9jb250cm9sbGVycy9tYWluLmNvZmZlZSIsImFwcC9yZXNvdXJjZXMvaG9zdC5jb2ZmZWUiLCJhcHAvcmVzb3VyY2VzL2hvc3RfZ3JvdXAuY29mZmVlIiwiYXBwL3Jlc291cmNlcy9tb25pdF9zY2hlZHVsZS5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7RUFBQSxPQUFPLENBQUMsTUFBUixDQUFlLFlBQWYsRUFBNkIsQ0FDekIsWUFEeUIsRUFFekIsWUFGeUIsRUFHekIsU0FIeUIsRUFJekIsV0FKeUIsRUFNekIsY0FOeUIsRUFRekIsU0FSeUIsRUFTekIsYUFUeUIsRUFVekIsUUFWeUIsQ0FBN0IsQ0FhQSxDQUFDLE1BYkQsQ0FhUSxTQUFDLGNBQUQ7V0FDSixjQUNBLENBQUMsSUFERCxDQUNNLEdBRE4sRUFFRTtNQUFBLFdBQUEsRUFBYSx1QkFBYjtNQUNBLFVBQUEsRUFBWSxVQURaO01BRUEsS0FBQSxFQUFPLEVBRlA7S0FGRixDQU9BLENBQUMsSUFQRCxDQU9NLFNBUE4sRUFRSTtNQUFBLFdBQUEsRUFBYSx3QkFBYjtNQUNBLFVBQUEsRUFBWSxlQURaO01BRUEsS0FBQSxFQUFPLE9BRlA7S0FSSixDQVlBLENBQUMsSUFaRCxDQVlNLFVBWk4sRUFhSTtNQUFBLFdBQUEsRUFBYSx5QkFBYjtNQUNBLFVBQUEsRUFBWSxnQkFEWjtNQUVBLEtBQUEsRUFBTyxRQUZQO0tBYko7RUFESSxDQWJSLENBZ0NBLENBQUMsR0FoQ0QsQ0FnQ0ssU0FBQyxTQUFELEVBQVksVUFBWixFQUF3QixPQUF4QjtJQUNELFVBQVUsQ0FBQyxPQUFYLEdBQXFCO1dBQ3JCLFVBQVUsQ0FBQyxHQUFYLENBQWUscUJBQWYsRUFBc0MsU0FBQyxLQUFELEVBQVEsT0FBUixFQUFpQixRQUFqQjtBQUNsQyxVQUFBO01BQUEsU0FBQSx5Q0FBMkIsQ0FB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QTtFQUFBLE9BQU8sQ0FBQyxNQUFSLENBQWUsWUFBZixDQUVBLENBQUMsT0FGRCxDQUVTLGVBRlQsRUFFMEIsU0FBQyxTQUFELEVBQVksTUFBWjtBQUN0QixRQUFBO0lBQUEsR0FBQSxHQUFVLE1BQU0sQ0FBQyxhQUFULEdBQXdCO0FBQ2hDLFdBQU8sU0FBQSxDQUFVLEdBQVY7RUFGZSxDQUYxQjtBQUFBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbImFuZ3VsYXIubW9kdWxlKCdwYXJrS2VlcGVyJywgW1xuICAgICduZ1Jlc291cmNlJ1xuICAgICduZ1Nhbml0aXplJ1xuICAgICduZ1JvdXRlJ1xuICAgICduZ0FuaW1hdGUnXG5cbiAgICAndWkuYm9vdHN0cmFwJ1xuXG4gICAgJ3N3VXRpbHMnXG4gICAgJ3N3V2ViU29ja2V0J1xuICAgICdzd0F1dGgnXG5dKVxuXG4uY29uZmlnICgkcm91dGVQcm92aWRlcikgLT5cbiAgICAkcm91dGVQcm92aWRlclxuICAgIC53aGVuKCcvJyxcbiAgICAgIHRlbXBsYXRlVXJsOiAnY29udHJvbGxlcnMvbWFpbi5odG1sJ1xuICAgICAgY29udHJvbGxlcjogJ01haW5DdHJsJ1xuICAgICAgbGFiZWw6ICcnXG4gICAgKVxuXG4gICAgLndoZW4oJy9sb2dpbi8nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2NvbnRyb2xsZXJzL2xvZ2luLmh0bWwnXG4gICAgICAgIGNvbnRyb2xsZXI6ICdBdXRoTG9naW5DdHJsJ1xuICAgICAgICBsYWJlbDogJ0xvZ2luJ1xuICAgIClcbiAgICAud2hlbignL2xvZ291dC8nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2NvbnRyb2xsZXJzL2xvZ291dC5odG1sJ1xuICAgICAgICBjb250cm9sbGVyOiAnQXV0aExvZ291dEN0cmwnXG4gICAgICAgIGxhYmVsOiAnTG9nb3V0J1xuICAgIClcblxuLnJ1biAoJGxvY2F0aW9uLCAkcm9vdFNjb3BlLCBzd1RpdGxlKSAtPlxuICAgICRyb290U2NvcGUuc3dUaXRsZSA9IHN3VGl0bGVcbiAgICAkcm9vdFNjb3BlLiRvbiAnJHJvdXRlQ2hhbmdlU3VjY2VzcycsIChldmVudCwgY3VycmVudCwgcHJldmlvdXMpIC0+XG4gICAgICAgIGJhc2VUaXRsZSA9IGN1cnJlbnQuJCRyb3V0ZT8ubGFiZWwgb3IgJydcbiAgICAgICAgc3dUaXRsZS5zZXRUaXRsZUJhc2UoYmFzZVRpdGxlKVxuICAgICAgICBzd1RpdGxlLnNldFRpdGxlU3RhcnQoJycpXG4gICAgICAgIHN3VGl0bGUuc2V0VGl0bGVFbmQoJycpXG5cbi5jb25maWcgKGF1dGhDb25maWdQcm92aWRlciwgY29uZmlnKSAtPlxuICAgIGF1dGhDb25maWdQcm92aWRlci5zZXRTeXN0ZW1MYWJlbCgncGFya0tlZXBlcicpXG4gICAgYXV0aENvbmZpZ1Byb3ZpZGVyLnNldFNlcnZlckFkZHJlc3MoY29uZmlnLnNlcnZlckFkZHJlc3MpXG4gICAgYXV0aENvbmZpZ1Byb3ZpZGVyLnNldEZyZWVVcmxzKFtdKVxuXG4uY29uZmlnICgkaHR0cFByb3ZpZGVyKSAtPlxuICAgICRodHRwUHJvdmlkZXIuZGVmYXVsdHMuaGVhZGVycy5wb3N0WydDb250ZW50LVR5cGUnXSA9ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnIiwiYW5ndWxhci5tb2R1bGUoJ3BhcmtLZWVwZXInKVxuICAgIC5jb25zdGFudCgnY29uZmlnJywge1xuICAgICAgICBzZXJ2ZXJBZGRyZXNzOiAnaHR0cDovLzEyNy4wLjAuMTo4MDAwJyxcbiAgICB9KSIsImFuZ3VsYXIubW9kdWxlKCdwYXJrS2VlcGVyJylcblxuIyBpbnRlcmNlcHRvciA1MDAgc3RhdHVzIGVycm9yXG4uY29uZmlnICgkaHR0cFByb3ZpZGVyKSAtPlxuICAgICRodHRwUHJvdmlkZXIuaW50ZXJjZXB0b3JzLnB1c2goJ3NlcnZlckVycm9ySW50ZXJjZXB0b3InKVxuXG4uZmFjdG9yeSAnc2VydmVyRXJyb3JJbnRlcmNlcHRvcicsICgkbG9jYXRpb24sICRxLCAkbG9nKSAtPlxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzcG9uc2VFcnJvcjogKHJlc3BvbnNlKSAtPlxuICAgICAgICAgICAgICAgIGlmIHJlc3BvbnNlLnN0YXR1cyA9PSAwIG9yIChyZXNwb25zZS5zdGF0dXMgPj0gNTAwIGFuZCByZXNwb25zZS5zdGF0dXMgPD0gNjAwKVxuICAgICAgICAgICAgICAgICAgICAkbG9nLmVycm9yKHJlc3BvbnNlKVxuIyAgICAgICAgICAgICAgICAgICAgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2Uuc3RhdHVzVGV4dCBvciAnJ1xuIyAgICAgICAgICAgICAgICAgICAgdG9hc3Rlci5wb3AoJ2Vycm9yJywgJ9Ce0YjQuNCx0LrQsCDRgdC10YDQstC10YDQsCcsIGVycm9yTWVzc2FnZSlcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlKVxuXG4gICAgICAgIH0iLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG4uY29udHJvbGxlciAnTWFpbkN0cmwnLCAoJHNjb3BlLCAkbG9nLCBzd1dlYlNvY2tldCwgSG9zdCwgSG9zdEdyb3VwLCBNb25pdFNjaGVkdWxlKSAtPlxuICAgICRsb2cuaW5mbyAnTWFpbkN0cmwgcmVhZHkhJ1xuXG4jICAgIHNvY2tldCA9IG5ldyBzd1dlYlNvY2tldCgnd3M6Ly8xMjcuMC4wLjE6ODA4MC9tb25pdHMnKVxuIyAgICBzb2NrZXQub25NZXNzYWdlIChtc2cpIC0+XG4jICAgICAgICAkbG9nLmluZm8gJ1dTJywgbXNnXG4jICAgIHNvY2tldC5zdGFydCgpXG4jICAgIHNvY2tldC5zZW5kKCdwaW5nJylcblxuICAgIGhvc3RzID0gSG9zdC5xdWVyeSAtPlxuICAgICAgICAkbG9nLmluZm8gaG9zdHNbMF1cblxuICAgIGdyb3VwcyA9IEhvc3RHcm91cC5xdWVyeSAtPlxuICAgICAgICAkbG9nLmluZm8gZ3JvdXBzWzBdXG5cbiAgICBzY2hlZHVsZSA9IE1vbml0U2NoZWR1bGUucXVlcnkgLT5cbiAgICAgICAgJGxvZy5pbmZvIHNjaGVkdWxlWzBdIiwiYW5ndWxhci5tb2R1bGUoJ3BhcmtLZWVwZXInKVxuXG4uZmFjdG9yeSAnSG9zdCcsICgkcmVzb3VyY2UsIGNvbmZpZykgLT5cbiAgICB1cmwgPSBcIiN7IGNvbmZpZy5zZXJ2ZXJBZGRyZXNzIH0vaG9zdC86aWQvXCJcbiAgICByZXR1cm4gJHJlc291cmNlKHVybCkiLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG5cbi5mYWN0b3J5ICdIb3N0R3JvdXAnLCAoJHJlc291cmNlLCBjb25maWcpIC0+XG4gICAgdXJsID0gXCIjeyBjb25maWcuc2VydmVyQWRkcmVzcyB9L2hvc3RfZ3JvdXAvOmlkL1wiXG4gICAgcmV0dXJuICRyZXNvdXJjZSh1cmwpIiwiYW5ndWxhci5tb2R1bGUoJ3BhcmtLZWVwZXInKVxuXG4uZmFjdG9yeSAnTW9uaXRTY2hlZHVsZScsICgkcmVzb3VyY2UsIGNvbmZpZykgLT5cbiAgICB1cmwgPSBcIiN7IGNvbmZpZy5zZXJ2ZXJBZGRyZXNzIH0vbW9uaXRfc2NoZWR1bGUvOmlkL1wiXG4gICAgcmV0dXJuICRyZXNvdXJjZSh1cmwpIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9

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
  }).run(function(monitStatus) {
    return monitStatus.start();
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
    serverAddress: 'http://127.0.0.1:8000',
    wsServerAddress: 'ws://127.0.0.1:8080'
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
  angular.module('parkKeeper').controller('MainCtrl', function($scope, $log, $timeout, swWebSocket, monitStatus, MONIT_STATUS_UPDATE, MonitSchedule) {
    var monitStatusListener;
    $scope.monitSchedules = MonitSchedule.GetAll();
    monitStatusListener = $scope.$on(MONIT_STATUS_UPDATE, function(e, statuses) {
      var i, len, ref, results, schedule;
      ref = $scope.monitSchedules;
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        schedule = ref[i];
        results.push(schedule.updateHostsStatus(statuses));
      }
      return results;
    });
    return $scope.$on('$destroy', monitStatusListener);
  });

}).call(this);

(function() {
  angular.module('parkKeeper').factory('HostResource', function($resource, config) {
    var url;
    url = config.serverAddress + "/host/:id/";
    return $resource(url);
  });

}).call(this);

(function() {
  angular.module('parkKeeper').factory('HostGroupResource', function($resource, config) {
    var url;
    url = config.serverAddress + "/host_group/:id/";
    return $resource(url);
  });

}).call(this);

(function() {
  angular.module('parkKeeper').factory('MonitScheduleResource', function($resource, config) {
    var url;
    url = config.serverAddress + "/monit_schedule/:id/";
    return $resource(url);
  }).factory('MonitSchedule', function(MonitScheduleResource) {
    var MonitSchedule;
    MonitSchedule = (function() {
      function MonitSchedule(data) {
        this.latestStatusDt = void 0;
        angular.extend(this, data || {});
      }

      MonitSchedule.prototype.isOk = function() {
        var host, i, len, ref;
        ref = this.all_hosts;
        for (i = 0, len = ref.length; i < len; i++) {
          host = ref[i];
          if (host.status !== void 0 && !host.status.is_success) {
            return false;
          }
        }
        return true;
      };

      MonitSchedule.prototype.updateHostsStatus = function(statuses) {
        var host, i, len, results, statusItem;
        results = [];
        for (i = 0, len = statuses.length; i < len; i++) {
          statusItem = statuses[i];
          if (statusItem.schedule_id !== this.id) {
            continue;
          }
          host = this.getHost(statusItem.host_address);
          if (!host) {
            continue;
          }
          host.status = statusItem;
          host.status.result_dt = moment(statusItem.result_dt).toDate();
          if (!this.latestStatusDt || host.status.result_dt > this.latestStatusDt) {
            results.push(this.latestStatusDt = host.status.result_dt);
          } else {
            results.push(void 0);
          }
        }
        return results;
      };

      MonitSchedule.prototype.getHost = function(hostAddress) {
        var host, i, len, ref;
        ref = this.all_hosts;
        for (i = 0, len = ref.length; i < len; i++) {
          host = ref[i];
          if (host.address === hostAddress) {
            return host;
          }
        }
      };

      MonitSchedule.GetAll = function() {
        var schedules, schedulesData;
        schedules = [];
        schedulesData = MonitScheduleResource.query(function() {
          var i, itemData, len, results, schedule;
          results = [];
          for (i = 0, len = schedulesData.length; i < len; i++) {
            itemData = schedulesData[i];
            schedule = new MonitSchedule(itemData);
            results.push(schedules.push(schedule));
          }
          return results;
        });
        return schedules;
      };

      return MonitSchedule;

    })();
    return MonitSchedule;
  });

}).call(this);

(function() {
  angular.module('parkKeeper').constant('MONIT_STATUS_UPDATE', 'MONIT_STATUS_UPDATE').service('monitStatus', function($log, $rootScope, swHttpHelper, swWebSocket, config, MONIT_STATUS_UPDATE) {
    var status, subscribeMonitStatus, updateStatus;
    status = [];
    updateStatus = function(statusItem) {
      var i, item, j, len;
      for (i = j = 0, len = status.length; j < len; i = ++j) {
        item = status[i];
        if (item.monit_name === statusItem.monit_name && item.host_address === statusItem.host_address) {
          status[i] = statusItem;
          return;
        }
      }
      return status.push(statusItem);
    };
    subscribeMonitStatus = function() {
      var durable, socket;
      socket = new swWebSocket(config.wsServerAddress + "/monits");
      socket.onMessage(function(msg) {
        var statusItem;
        statusItem = JSON.parse(msg);
        updateStatus(statusItem);
        return $rootScope.$broadcast(MONIT_STATUS_UPDATE, status);
      });
      durable = true;
      return socket.start(durable);
    };
    this.start = function() {
      return this.getLatest().then(subscribeMonitStatus);
    };
    this.getLatest = function() {
      return swHttpHelper.get(config.serverAddress + "/monit_status_latest/").then(function(response) {
        var item, j, len, ref;
        status.length = 0;
        ref = response.data.monit_status_latest;
        for (j = 0, len = ref.length; j < len; j++) {
          item = ref[j];
          status.push(item);
        }
        $rootScope.$broadcast(MONIT_STATUS_UPDATE, status);
        return status;
      });
    };
    this.getStatus = function() {
      return status;
    };
    return this;
  });

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9hcHAuY29mZmVlIiwiYXBwL2NvbmZpZy5jb2ZmZWUiLCJhcHAvaW50ZXJjZXB0b3JzLmNvZmZlZSIsImFwcC9jb250cm9sbGVycy9tYWluLmNvZmZlZSIsImFwcC9yZXNvdXJjZXMvaG9zdC5jb2ZmZWUiLCJhcHAvcmVzb3VyY2VzL2hvc3RfZ3JvdXAuY29mZmVlIiwiYXBwL3Jlc291cmNlcy9tb25pdF9zY2hlZHVsZS5jb2ZmZWUiLCJhcHAvcmVzb3VyY2VzL21vbml0X3N0YXR1cy5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7RUFBQSxPQUFPLENBQUMsTUFBUixDQUFlLFlBQWYsRUFBNkIsQ0FDekIsWUFEeUIsRUFFekIsWUFGeUIsRUFHekIsU0FIeUIsRUFJekIsV0FKeUIsRUFNekIsY0FOeUIsRUFRekIsU0FSeUIsRUFTekIsYUFUeUIsRUFVekIsUUFWeUIsQ0FBN0IsQ0FhQSxDQUFDLE1BYkQsQ0FhUSxTQUFDLGNBQUQ7V0FDSixjQUNBLENBQUMsSUFERCxDQUNNLEdBRE4sRUFFRTtNQUFBLFdBQUEsRUFBYSx1QkFBYjtNQUNBLFVBQUEsRUFBWSxVQURaO01BRUEsS0FBQSxFQUFPLEVBRlA7S0FGRixDQU9BLENBQUMsSUFQRCxDQU9NLFNBUE4sRUFRSTtNQUFBLFdBQUEsRUFBYSx3QkFBYjtNQUNBLFVBQUEsRUFBWSxlQURaO01BRUEsS0FBQSxFQUFPLE9BRlA7S0FSSixDQVlBLENBQUMsSUFaRCxDQVlNLFVBWk4sRUFhSTtNQUFBLFdBQUEsRUFBYSx5QkFBYjtNQUNBLFVBQUEsRUFBWSxnQkFEWjtNQUVBLEtBQUEsRUFBTyxRQUZQO0tBYko7RUFESSxDQWJSLENBZ0NBLENBQUMsR0FoQ0QsQ0FnQ0ssU0FBQyxTQUFELEVBQVksVUFBWixFQUF3QixPQUF4QjtJQUNELFVBQVUsQ0FBQyxPQUFYLEdBQXFCO1dBQ3JCLFVBQVUsQ0FBQyxHQUFYLENBQWUscUJBQWYsRUFBc0MsU0FBQyxLQUFELEVBQVEsT0FBUixFQUFpQixR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LE1BQU0sQ0FBQyxJQUFQLENBQVksVUFBWjtJQUxXO0lBT2Ysb0JBQUEsR0FBdUIsU0FBQTtBQUNuQixVQUFBO01BQUEsTUFBQSxHQUFhLElBQUEsV0FBQSxDQUFnQixNQUFNLENBQUMsZUFBVCxHQUEwQixTQUF4QztNQUViLE1BQU0sQ0FBQyxTQUFQLENBQWlCLFNBQUMsR0FBRDtBQUNiLFlBQUE7UUFBQSxVQUFBLEdBQWEsSUFBSSxDQUFDLEtBQUwsQ0FBVyxHQUFYO1FBQ2IsWUFBQSxDQUFhLFVBQWI7ZUFFQSxVQUFVLENBQUMsVUFBWCxDQUFzQixtQkFBdEIsRUFBMkMsTUFBM0M7TUFKYSxDQUFqQjtNQU1BLE9BQUEsR0FBVTthQUNWLE1BQU0sQ0FBQyxLQUFQLENBQWEsT0FBYjtJQVZtQjtJQWN2QixJQUFJLENBQUMsS0FBTCxHQUFhLFNBQUE7YUFFVCxJQUFJLENBQUMsU0FBTCxDQUFBLENBQWdCLENBQUMsSUFBakIsQ0FBc0Isb0JBQXRCO0lBRlM7SUFJYixJQUFJLENBQUMsU0FBTCxHQUFpQixTQUFBO0FBQ2IsYUFBTyxZQUFZLENBQUMsR0FBYixDQUFxQixNQUFNLENBQUMsYUFBVCxHQUF3Qix1QkFBM0MsQ0FBa0UsQ0FBQyxJQUFuRSxDQUF3RSxTQUFDLFFBQUQ7QUFDM0UsWUFBQTtRQUFBLE1BQU0sQ0FBQyxNQUFQLEdBQWdCO0FBQ2hCO0FBQUEsYUFBQSxxQ0FBQTs7VUFDSSxNQUFNLENBQUMsSUFBUCxDQUFZLElBQVo7QUFESjtRQUdBLFVBQVUsQ0FBQyxVQUFYLENBQXNCLG1CQUF0QixFQUEyQyxNQUEzQztBQUVBLGVBQU87TUFQb0UsQ0FBeEU7SUFETTtJQVVqQixJQUFJLENBQUMsU0FBTCxHQUFpQixTQUFBO0FBQ2IsYUFBTztJQURNO0FBR2pCLFdBQU87RUF6Q2EsQ0FKeEI7QUFBQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicsIFtcbiAgICAnbmdSZXNvdXJjZSdcbiAgICAnbmdTYW5pdGl6ZSdcbiAgICAnbmdSb3V0ZSdcbiAgICAnbmdBbmltYXRlJ1xuXG4gICAgJ3VpLmJvb3RzdHJhcCdcblxuICAgICdzd1V0aWxzJ1xuICAgICdzd1dlYlNvY2tldCdcbiAgICAnc3dBdXRoJ1xuXSlcblxuLmNvbmZpZyAoJHJvdXRlUHJvdmlkZXIpIC0+XG4gICAgJHJvdXRlUHJvdmlkZXJcbiAgICAud2hlbignLycsXG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbnRyb2xsZXJzL21haW4uaHRtbCdcbiAgICAgIGNvbnRyb2xsZXI6ICdNYWluQ3RybCdcbiAgICAgIGxhYmVsOiAnJ1xuICAgIClcblxuICAgIC53aGVuKCcvbG9naW4vJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdjb250cm9sbGVycy9sb2dpbi5odG1sJ1xuICAgICAgICBjb250cm9sbGVyOiAnQXV0aExvZ2luQ3RybCdcbiAgICAgICAgbGFiZWw6ICdMb2dpbidcbiAgICApXG4gICAgLndoZW4oJy9sb2dvdXQvJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdjb250cm9sbGVycy9sb2dvdXQuaHRtbCdcbiAgICAgICAgY29udHJvbGxlcjogJ0F1dGhMb2dvdXRDdHJsJ1xuICAgICAgICBsYWJlbDogJ0xvZ291dCdcbiAgICApXG5cbi5ydW4gKCRsb2NhdGlvbiwgJHJvb3RTY29wZSwgc3dUaXRsZSkgLT5cbiAgICAkcm9vdFNjb3BlLnN3VGl0bGUgPSBzd1RpdGxlXG4gICAgJHJvb3RTY29wZS4kb24gJyRyb3V0ZUNoYW5nZVN1Y2Nlc3MnLCAoZXZlbnQsIGN1cnJlbnQsIHByZXZpb3VzKSAtPlxuICAgICAgICBiYXNlVGl0bGUgPSBjdXJyZW50LiQkcm91dGU/LmxhYmVsIG9yICcnXG4gICAgICAgIHN3VGl0bGUuc2V0VGl0bGVCYXNlKGJhc2VUaXRsZSlcbiAgICAgICAgc3dUaXRsZS5zZXRUaXRsZVN0YXJ0KCcnKVxuICAgICAgICBzd1RpdGxlLnNldFRpdGxlRW5kKCcnKVxuXG4ucnVuIChtb25pdFN0YXR1cykgLT5cbiAgICBtb25pdFN0YXR1cy5zdGFydCgpXG5cbi5jb25maWcgKGF1dGhDb25maWdQcm92aWRlciwgY29uZmlnKSAtPlxuICAgIGF1dGhDb25maWdQcm92aWRlci5zZXRTeXN0ZW1MYWJlbCgncGFya0tlZXBlcicpXG4gICAgYXV0aENvbmZpZ1Byb3ZpZGVyLnNldFNlcnZlckFkZHJlc3MoY29uZmlnLnNlcnZlckFkZHJlc3MpXG4gICAgYXV0aENvbmZpZ1Byb3ZpZGVyLnNldEZyZWVVcmxzKFtdKVxuXG4uY29uZmlnICgkaHR0cFByb3ZpZGVyKSAtPlxuICAgICRodHRwUHJvdmlkZXIuZGVmYXVsdHMuaGVhZGVycy5wb3N0WydDb250ZW50LVR5cGUnXSA9ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnIiwiYW5ndWxhci5tb2R1bGUoJ3BhcmtLZWVwZXInKVxuICAgIC5jb25zdGFudCgnY29uZmlnJywge1xuICAgICAgICBzZXJ2ZXJBZGRyZXNzOiAnaHR0cDovLzEyNy4wLjAuMTo4MDAwJyxcbiAgICAgICAgd3NTZXJ2ZXJBZGRyZXNzOiAnd3M6Ly8xMjcuMC4wLjE6ODA4MCcsXG4gICAgfSkiLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG5cbiMgaW50ZXJjZXB0b3IgNTAwIHN0YXR1cyBlcnJvclxuLmNvbmZpZyAoJGh0dHBQcm92aWRlcikgLT5cbiAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKCdzZXJ2ZXJFcnJvckludGVyY2VwdG9yJylcblxuLmZhY3RvcnkgJ3NlcnZlckVycm9ySW50ZXJjZXB0b3InLCAoJGxvY2F0aW9uLCAkcSwgJGxvZykgLT5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3BvbnNlRXJyb3I6IChyZXNwb25zZSkgLT5cbiAgICAgICAgICAgICAgICBpZiByZXNwb25zZS5zdGF0dXMgPT0gMCBvciAocmVzcG9uc2Uuc3RhdHVzID49IDUwMCBhbmQgcmVzcG9uc2Uuc3RhdHVzIDw9IDYwMClcbiAgICAgICAgICAgICAgICAgICAgJGxvZy5lcnJvcihyZXNwb25zZSlcbiMgICAgICAgICAgICAgICAgICAgIGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLnN0YXR1c1RleHQgb3IgJydcbiMgICAgICAgICAgICAgICAgICAgIHRvYXN0ZXIucG9wKCdlcnJvcicsICfQntGI0LjQsdC60LAg0YHQtdGA0LLQtdGA0LAnLCBlcnJvck1lc3NhZ2UpXG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChyZXNwb25zZSlcblxuICAgICAgICB9IiwiYW5ndWxhci5tb2R1bGUoJ3BhcmtLZWVwZXInKVxuLmNvbnRyb2xsZXIgJ01haW5DdHJsJywgKCRzY29wZSwgJGxvZywgJHRpbWVvdXQsIHN3V2ViU29ja2V0LFxuICAgICAgICAgICAgICAgICAgICAgICAgIG1vbml0U3RhdHVzLCBNT05JVF9TVEFUVVNfVVBEQVRFLCBNb25pdFNjaGVkdWxlKSAtPlxuICAgICRzY29wZS5tb25pdFNjaGVkdWxlcyA9IE1vbml0U2NoZWR1bGUuR2V0QWxsKClcblxuICAgIG1vbml0U3RhdHVzTGlzdGVuZXIgPSAkc2NvcGUuJG9uKE1PTklUX1NUQVRVU19VUERBVEUsIChlLCBzdGF0dXNlcykgLT5cbiAgICAgICAgZm9yIHNjaGVkdWxlIGluICRzY29wZS5tb25pdFNjaGVkdWxlc1xuICAgICAgICAgICAgc2NoZWR1bGUudXBkYXRlSG9zdHNTdGF0dXMoc3RhdHVzZXMpXG4gICAgKVxuICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgbW9uaXRTdGF0dXNMaXN0ZW5lcilcblxuIiwiYW5ndWxhci5tb2R1bGUoJ3BhcmtLZWVwZXInKVxuXG4uZmFjdG9yeSAnSG9zdFJlc291cmNlJywgKCRyZXNvdXJjZSwgY29uZmlnKSAtPlxuICAgIHVybCA9IFwiI3sgY29uZmlnLnNlcnZlckFkZHJlc3MgfS9ob3N0LzppZC9cIlxuICAgIHJldHVybiAkcmVzb3VyY2UodXJsKVxuXG5cbiMuZmFjdG9yeSAnSG9zdFN0YXR1cycsIC0+XG4jICAgIGNsYXNzIEhvc3RTdGF0dXNcbiMgICAgICAgIG1vbml0TmFtZTogdW5kZWZpbmVkXG4jICAgICAgICBkdDogdW5kZWZpbmVkXG4jICAgICAgICBleHRyYTogdW5kZWZpbmVkXG4jICAgICAgICBpc1N1Y2Nlc3M6IHVuZGVmaW5lZFxuI1xuIyAgICAgICAgY29uc3RydWN0b3I6IChkYXRhKSAtPlxuIyAgICAgICAgICAgIGFuZ3VsYXIuZXh0ZW5kKHRoaXMsIGRhdGEgb3Ige30pXG4jXG4jICAgIHJldHVybiBIb3N0U3RhdHVzIiwiYW5ndWxhci5tb2R1bGUoJ3BhcmtLZWVwZXInKVxuXG4uZmFjdG9yeSAnSG9zdEdyb3VwUmVzb3VyY2UnLCAoJHJlc291cmNlLCBjb25maWcpIC0+XG4gICAgdXJsID0gXCIjeyBjb25maWcuc2VydmVyQWRkcmVzcyB9L2hvc3RfZ3JvdXAvOmlkL1wiXG4gICAgcmV0dXJuICRyZXNvdXJjZSh1cmwpIiwiYW5ndWxhci5tb2R1bGUoJ3BhcmtLZWVwZXInKVxuXG4uZmFjdG9yeSAnTW9uaXRTY2hlZHVsZVJlc291cmNlJywgKCRyZXNvdXJjZSwgY29uZmlnKSAtPlxuICAgIHVybCA9IFwiI3sgY29uZmlnLnNlcnZlckFkZHJlc3MgfS9tb25pdF9zY2hlZHVsZS86aWQvXCJcbiAgICByZXR1cm4gJHJlc291cmNlKHVybClcblxuXG4uZmFjdG9yeSAnTW9uaXRTY2hlZHVsZScsIChNb25pdFNjaGVkdWxlUmVzb3VyY2UpIC0+XG4gICAgY2xhc3MgTW9uaXRTY2hlZHVsZVxuICAgICAgICBjb25zdHJ1Y3RvcjogKGRhdGEpIC0+XG4gICAgICAgICAgICB0aGlzLmxhdGVzdFN0YXR1c0R0ID0gdW5kZWZpbmVkXG4gICAgICAgICAgICBhbmd1bGFyLmV4dGVuZCh0aGlzLCBkYXRhIG9yIHt9KVxuXG4gICAgICAgIGlzT2s6IC0+XG4gICAgICAgICAgICBmb3IgaG9zdCBpbiB0aGlzLmFsbF9ob3N0c1xuICAgICAgICAgICAgICAgIGlmIGhvc3Quc3RhdHVzICE9IHVuZGVmaW5lZCBhbmQgbm90IGhvc3Quc3RhdHVzLmlzX3N1Y2Nlc3NcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxuXG4gICAgICAgIHVwZGF0ZUhvc3RzU3RhdHVzOiAoc3RhdHVzZXMpIC0+XG4gICAgICAgICAgICBmb3Igc3RhdHVzSXRlbSBpbiBzdGF0dXNlc1xuICAgICAgICAgICAgICAgIGlmIHN0YXR1c0l0ZW0uc2NoZWR1bGVfaWQgIT0gdGhpcy5pZFxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZVxuXG4gICAgICAgICAgICAgICAgaG9zdCA9IHRoaXMuZ2V0SG9zdChzdGF0dXNJdGVtLmhvc3RfYWRkcmVzcylcbiAgICAgICAgICAgICAgICBpZiBub3QgaG9zdFxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZVxuXG4gICAgICAgICAgICAgICAgaG9zdC5zdGF0dXMgPSBzdGF0dXNJdGVtXG4gICAgICAgICAgICAgICAgaG9zdC5zdGF0dXMucmVzdWx0X2R0ID0gbW9tZW50KHN0YXR1c0l0ZW0ucmVzdWx0X2R0KS50b0RhdGUoKVxuICAgICAgICAgICAgICAgIGlmIG5vdCB0aGlzLmxhdGVzdFN0YXR1c0R0IG9yIGhvc3Quc3RhdHVzLnJlc3VsdF9kdCA+IHRoaXMubGF0ZXN0U3RhdHVzRHRcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sYXRlc3RTdGF0dXNEdCA9IGhvc3Quc3RhdHVzLnJlc3VsdF9kdFxuXG4gICAgICAgIGdldEhvc3Q6IChob3N0QWRkcmVzcykgLT5cbiAgICAgICAgICAgIGZvciBob3N0IGluIHRoaXMuYWxsX2hvc3RzXG4gICAgICAgICAgICAgICAgaWYgaG9zdC5hZGRyZXNzID09IGhvc3RBZGRyZXNzXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBob3N0XG5cbiAgICAgICAgQEdldEFsbDogLT5cbiAgICAgICAgICAgIHNjaGVkdWxlcyA9IFtdXG5cbiAgICAgICAgICAgIHNjaGVkdWxlc0RhdGEgPSBNb25pdFNjaGVkdWxlUmVzb3VyY2UucXVlcnkgLT5cbiAgICAgICAgICAgICAgICBmb3IgaXRlbURhdGEgaW4gc2NoZWR1bGVzRGF0YVxuICAgICAgICAgICAgICAgICAgICBzY2hlZHVsZSA9IG5ldyBNb25pdFNjaGVkdWxlKGl0ZW1EYXRhKVxuICAgICAgICAgICAgICAgICAgICBzY2hlZHVsZXMucHVzaChzY2hlZHVsZSlcblxuICAgICAgICAgICAgcmV0dXJuIHNjaGVkdWxlc1xuXG4gICAgcmV0dXJuIE1vbml0U2NoZWR1bGUiLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG5cbi5jb25zdGFudCgnTU9OSVRfU1RBVFVTX1VQREFURScsICdNT05JVF9TVEFUVVNfVVBEQVRFJylcblxuLnNlcnZpY2UgJ21vbml0U3RhdHVzJywgKCRsb2csICRyb290U2NvcGUsIHN3SHR0cEhlbHBlciwgc3dXZWJTb2NrZXQsIGNvbmZpZywgTU9OSVRfU1RBVFVTX1VQREFURSkgLT5cbiAgICBzdGF0dXMgPSBbXVxuXG4gICAgdXBkYXRlU3RhdHVzID0gKHN0YXR1c0l0ZW0pIC0+XG4gICAgICAgIGZvciBpdGVtLCBpIGluIHN0YXR1c1xuICAgICAgICAgICAgaWYgaXRlbS5tb25pdF9uYW1lID09IHN0YXR1c0l0ZW0ubW9uaXRfbmFtZSBhbmQgaXRlbS5ob3N0X2FkZHJlc3MgPT0gc3RhdHVzSXRlbS5ob3N0X2FkZHJlc3NcbiAgICAgICAgICAgICAgICBzdGF0dXNbaV0gPSBzdGF0dXNJdGVtXG4gICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgIHN0YXR1cy5wdXNoKHN0YXR1c0l0ZW0pXG5cbiAgICBzdWJzY3JpYmVNb25pdFN0YXR1cyA9IC0+XG4gICAgICAgIHNvY2tldCA9IG5ldyBzd1dlYlNvY2tldChcIiN7IGNvbmZpZy53c1NlcnZlckFkZHJlc3MgfS9tb25pdHNcIilcblxuICAgICAgICBzb2NrZXQub25NZXNzYWdlIChtc2cpIC0+XG4gICAgICAgICAgICBzdGF0dXNJdGVtID0gSlNPTi5wYXJzZShtc2cpXG4gICAgICAgICAgICB1cGRhdGVTdGF0dXMoc3RhdHVzSXRlbSlcbiMgICAgICAgICAgICAkbG9nLmRlYnVnKHN0YXR1c0l0ZW0pXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoTU9OSVRfU1RBVFVTX1VQREFURSwgc3RhdHVzKVxuXG4gICAgICAgIGR1cmFibGUgPSB0cnVlXG4gICAgICAgIHNvY2tldC5zdGFydChkdXJhYmxlKVxuIyAgICAgICAgJGxvZy5kZWJ1Zygnc3RhcnQgc3Vic2NyaWJlTW9uaXRTdGF0dXMnKVxuXG5cbiAgICB0aGlzLnN0YXJ0ID0gLT5cbiMgICAgICAgICRsb2cuaW5mbyAnc3RhcnQgTW9uaXRTdGF0dXMnXG4gICAgICAgIHRoaXMuZ2V0TGF0ZXN0KCkudGhlbiBzdWJzY3JpYmVNb25pdFN0YXR1c1xuXG4gICAgdGhpcy5nZXRMYXRlc3QgPSAtPlxuICAgICAgICByZXR1cm4gc3dIdHRwSGVscGVyLmdldChcIiN7IGNvbmZpZy5zZXJ2ZXJBZGRyZXNzIH0vbW9uaXRfc3RhdHVzX2xhdGVzdC9cIikudGhlbiAocmVzcG9uc2UpIC0+XG4gICAgICAgICAgICBzdGF0dXMubGVuZ3RoID0gMFxuICAgICAgICAgICAgZm9yIGl0ZW0gaW4gcmVzcG9uc2UuZGF0YS5tb25pdF9zdGF0dXNfbGF0ZXN0XG4gICAgICAgICAgICAgICAgc3RhdHVzLnB1c2goaXRlbSlcblxuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KE1PTklUX1NUQVRVU19VUERBVEUsIHN0YXR1cylcblxuICAgICAgICAgICAgcmV0dXJuIHN0YXR1c1xuXG4gICAgdGhpcy5nZXRTdGF0dXMgPSAtPlxuICAgICAgICByZXR1cm4gc3RhdHVzXG5cbiAgICByZXR1cm4gdGhpcyJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==

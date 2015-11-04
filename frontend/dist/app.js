(function() {
  angular.module('parkKeeper', ['ngResource', 'ngSanitize', 'ngRoute', 'ngAnimate', 'angular.filter', 'ui.bootstrap', 'swUtils', 'swWebSocket', 'swAuth']).config(function($routeProvider) {
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
    $scope.$on('$destroy', monitStatusListener);
    $scope.waitingTasks = monitStatus.getWaiting();
    return $scope.monitWorkers = monitStatus.getWorkers();
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
          if (host.status !== void 0 && !host.status.level === 1) {
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
  angular.module('parkKeeper').constant('MONIT_STATUS_UPDATE', 'MONIT_STATUS_UPDATE').constant('WAITING_TASKS_UPDATE', 'WAITING_TASKS_UPDATE').constant('STARTED_TASKS_UPDATE', 'STARTED_TASKS_UPDATE').service('monitStatus', function($log, $rootScope, swHttpHelper, swWebSocket, config, MONIT_STATUS_UPDATE, WAITING_TASKS_UPDATE, STARTED_TASKS_UPDATE) {
    var status, subscribeMonitStatus, subscribeWaitingTasks, subscribeWorkersTasks, updateStatus, updateWaiting, updateWorkers, waiting, workers;
    status = [];
    waiting = [];
    workers = [];
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
    updateWaiting = function(waitingTasks) {
      var j, len, results, task;
      waiting.length = 0;
      results = [];
      for (j = 0, len = waitingTasks.length; j < len; j++) {
        task = waitingTasks[j];
        results.push(waiting.push(task));
      }
      return results;
    };
    updateWorkers = function(currentWorkers) {
      var j, len, results, worker;
      workers.length = 0;
      results = [];
      for (j = 0, len = currentWorkers.length; j < len; j++) {
        worker = currentWorkers[j];
        results.push(workers.push(worker));
      }
      return results;
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
    subscribeWaitingTasks = function() {
      var durable, socket;
      socket = new swWebSocket(config.wsServerAddress + "/waiting_tasks");
      socket.onMessage(function(msg) {
        var waitingTasks;
        waitingTasks = JSON.parse(msg).waiting_tasks;
        updateWaiting(waitingTasks);
        return $rootScope.$broadcast(WAITING_TASKS_UPDATE, waiting);
      });
      durable = true;
      return socket.start(durable);
    };
    subscribeWorkersTasks = function() {
      var durable, socket;
      socket = new swWebSocket(config.wsServerAddress + "/current_workers");
      socket.onMessage(function(msg) {
        var currentWorkers;
        currentWorkers = JSON.parse(msg).current_workers;
        updateWorkers(currentWorkers);
        return $rootScope.$broadcast(STARTED_TASKS_UPDATE, workers);
      });
      durable = true;
      return socket.start(durable);
    };
    this.start = function() {
      this.getLatest().then(subscribeMonitStatus);
      subscribeWaitingTasks();
      return subscribeWorkersTasks();
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
    this.getWaiting = function() {
      return waiting;
    };
    this.getWorkers = function() {
      return workers;
    };
    return this;
  });

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9hcHAuY29mZmVlIiwiYXBwL2NvbmZpZy5jb2ZmZWUiLCJhcHAvaW50ZXJjZXB0b3JzLmNvZmZlZSIsImFwcC9jb250cm9sbGVycy9tYWluLmNvZmZlZSIsImFwcC9yZXNvdXJjZXMvaG9zdC5jb2ZmZWUiLCJhcHAvcmVzb3VyY2VzL2hvc3RfZ3JvdXAuY29mZmVlIiwiYXBwL3Jlc291cmNlcy9tb25pdF9zY2hlZHVsZS5jb2ZmZWUiLCJhcHAvcmVzb3VyY2VzL21vbml0X3N0YXR1cy5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7RUFBQSxPQUFPLENBQUMsTUFBUixDQUFlLFlBQWYsRUFBNkIsQ0FDekIsWUFEeUIsRUFFekIsWUFGeUIsRUFHekIsU0FIeUIsRUFJekIsV0FKeUIsRUFNekIsZ0JBTnlCLEVBT3pCLGNBUHlCLEVBU3pCLFNBVHlCLEVBVXpCLGFBVnlCLEVBV3pCLFFBWHlCLENBQTdCLENBY0EsQ0FBQyxNQWRELENBY1EsU0FBQyxjQUFEO1dBQ0osY0FDQSxDQUFDLElBREQsQ0FDTSxHQUROLEVBRUU7TUFBQSxXQUFBLEVBQWEsdUJBQWI7TUFDQSxVQUFBLEVBQVksVUFEWjtNQUVBLEtBQUEsRUFBTyxFQUZQO0tBRkYsQ0FPQSxDQUFDLElBUEQsQ0FPTSxTQVBOLEVBUUk7TUFBQSxXQUFBLEVBQWEsd0JBQWI7TUFDQSxVQUFBLEVBQVksZUFEWjtNQUVBLEtBQUEsRUFBTyxPQUZQO0tBUkosQ0FZQSxDQUFDLElBWkQsQ0FZTSxVQVpOLEVBYUk7TUFBQSxXQUFBLEVBQWEseUJBQWI7TUFDQSxVQUFBLEVBQVksZ0JBRFo7TUFFQSxLQUFBLEVBQU8sUUFGUDtLQWJKO0VBREksQ0FkUixDQWlDQSxDQUFDLEdBakNELENBaUNLLFNBQUMsU0FBRCxFQUFZLFVBQVosRUFBd0IsT0FBeEI7SUFDRCxVQUFVLENBQUMsT0FBWCxHQUFxQjtXQUNyQixVQUFVLENBQUMsR0FBWCxDQUFlLHFCQUFmLEVBQXNDLFNBQUMsS0FBRCxFQUFR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O0FBREo7UUFHQSxVQUFVLENBQUMsVUFBWCxDQUFzQixtQkFBdEIsRUFBMkMsTUFBM0M7QUFFQSxlQUFPO01BUG9FLENBQXhFO0lBRE07SUFVakIsSUFBSSxDQUFDLFNBQUwsR0FBaUIsU0FBQTtBQUNiLGFBQU87SUFETTtJQUdqQixJQUFJLENBQUMsVUFBTCxHQUFrQixTQUFBO0FBQ2QsYUFBTztJQURPO0lBR2xCLElBQUksQ0FBQyxVQUFMLEdBQWtCLFNBQUE7QUFDZCxhQUFPO0lBRE87QUFHbEIsV0FBTztFQXpGYSxDQU54QjtBQUFBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbImFuZ3VsYXIubW9kdWxlKCdwYXJrS2VlcGVyJywgW1xuICAgICduZ1Jlc291cmNlJ1xuICAgICduZ1Nhbml0aXplJ1xuICAgICduZ1JvdXRlJ1xuICAgICduZ0FuaW1hdGUnXG5cbiAgICAnYW5ndWxhci5maWx0ZXInXG4gICAgJ3VpLmJvb3RzdHJhcCdcblxuICAgICdzd1V0aWxzJ1xuICAgICdzd1dlYlNvY2tldCdcbiAgICAnc3dBdXRoJ1xuXSlcblxuLmNvbmZpZyAoJHJvdXRlUHJvdmlkZXIpIC0+XG4gICAgJHJvdXRlUHJvdmlkZXJcbiAgICAud2hlbignLycsXG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbnRyb2xsZXJzL21haW4uaHRtbCdcbiAgICAgIGNvbnRyb2xsZXI6ICdNYWluQ3RybCdcbiAgICAgIGxhYmVsOiAnJ1xuICAgIClcblxuICAgIC53aGVuKCcvbG9naW4vJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdjb250cm9sbGVycy9sb2dpbi5odG1sJ1xuICAgICAgICBjb250cm9sbGVyOiAnQXV0aExvZ2luQ3RybCdcbiAgICAgICAgbGFiZWw6ICdMb2dpbidcbiAgICApXG4gICAgLndoZW4oJy9sb2dvdXQvJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdjb250cm9sbGVycy9sb2dvdXQuaHRtbCdcbiAgICAgICAgY29udHJvbGxlcjogJ0F1dGhMb2dvdXRDdHJsJ1xuICAgICAgICBsYWJlbDogJ0xvZ291dCdcbiAgICApXG5cbi5ydW4gKCRsb2NhdGlvbiwgJHJvb3RTY29wZSwgc3dUaXRsZSkgLT5cbiAgICAkcm9vdFNjb3BlLnN3VGl0bGUgPSBzd1RpdGxlXG4gICAgJHJvb3RTY29wZS4kb24gJyRyb3V0ZUNoYW5nZVN1Y2Nlc3MnLCAoZXZlbnQsIGN1cnJlbnQsIHByZXZpb3VzKSAtPlxuICAgICAgICBiYXNlVGl0bGUgPSBjdXJyZW50LiQkcm91dGU/LmxhYmVsIG9yICcnXG4gICAgICAgIHN3VGl0bGUuc2V0VGl0bGVCYXNlKGJhc2VUaXRsZSlcbiAgICAgICAgc3dUaXRsZS5zZXRUaXRsZVN0YXJ0KCcnKVxuICAgICAgICBzd1RpdGxlLnNldFRpdGxlRW5kKCcnKVxuXG4ucnVuIChtb25pdFN0YXR1cykgLT5cbiAgICBtb25pdFN0YXR1cy5zdGFydCgpXG5cbi5jb25maWcgKGF1dGhDb25maWdQcm92aWRlciwgY29uZmlnKSAtPlxuICAgIGF1dGhDb25maWdQcm92aWRlci5zZXRTeXN0ZW1MYWJlbCgncGFya0tlZXBlcicpXG4gICAgYXV0aENvbmZpZ1Byb3ZpZGVyLnNldFNlcnZlckFkZHJlc3MoY29uZmlnLnNlcnZlckFkZHJlc3MpXG4gICAgYXV0aENvbmZpZ1Byb3ZpZGVyLnNldEZyZWVVcmxzKFtdKVxuXG4uY29uZmlnICgkaHR0cFByb3ZpZGVyKSAtPlxuICAgICRodHRwUHJvdmlkZXIuZGVmYXVsdHMuaGVhZGVycy5wb3N0WydDb250ZW50LVR5cGUnXSA9ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnIiwiYW5ndWxhci5tb2R1bGUoJ3BhcmtLZWVwZXInKVxuICAgIC5jb25zdGFudCgnY29uZmlnJywge1xuICAgICAgICBzZXJ2ZXJBZGRyZXNzOiAnaHR0cDovLzEyNy4wLjAuMTo4MDAwJyxcbiAgICAgICAgd3NTZXJ2ZXJBZGRyZXNzOiAnd3M6Ly8xMjcuMC4wLjE6ODA4MCcsXG4gICAgfSkiLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG5cbiMgaW50ZXJjZXB0b3IgNTAwIHN0YXR1cyBlcnJvclxuLmNvbmZpZyAoJGh0dHBQcm92aWRlcikgLT5cbiAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKCdzZXJ2ZXJFcnJvckludGVyY2VwdG9yJylcblxuLmZhY3RvcnkgJ3NlcnZlckVycm9ySW50ZXJjZXB0b3InLCAoJGxvY2F0aW9uLCAkcSwgJGxvZykgLT5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3BvbnNlRXJyb3I6IChyZXNwb25zZSkgLT5cbiAgICAgICAgICAgICAgICBpZiByZXNwb25zZS5zdGF0dXMgPT0gMCBvciAocmVzcG9uc2Uuc3RhdHVzID49IDUwMCBhbmQgcmVzcG9uc2Uuc3RhdHVzIDw9IDYwMClcbiAgICAgICAgICAgICAgICAgICAgJGxvZy5lcnJvcihyZXNwb25zZSlcbiMgICAgICAgICAgICAgICAgICAgIGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLnN0YXR1c1RleHQgb3IgJydcbiMgICAgICAgICAgICAgICAgICAgIHRvYXN0ZXIucG9wKCdlcnJvcicsICfQntGI0LjQsdC60LAg0YHQtdGA0LLQtdGA0LAnLCBlcnJvck1lc3NhZ2UpXG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChyZXNwb25zZSlcblxuICAgICAgICB9IiwiYW5ndWxhci5tb2R1bGUoJ3BhcmtLZWVwZXInKVxuLmNvbnRyb2xsZXIgJ01haW5DdHJsJywgKCRzY29wZSwgJGxvZywgJHRpbWVvdXQsIHN3V2ViU29ja2V0LFxuICAgICAgICAgICAgICAgICAgICAgICAgIG1vbml0U3RhdHVzLCBNT05JVF9TVEFUVVNfVVBEQVRFLCBNb25pdFNjaGVkdWxlKSAtPlxuICAgICRzY29wZS5tb25pdFNjaGVkdWxlcyA9IE1vbml0U2NoZWR1bGUuR2V0QWxsKClcblxuICAgIG1vbml0U3RhdHVzTGlzdGVuZXIgPSAkc2NvcGUuJG9uKE1PTklUX1NUQVRVU19VUERBVEUsIChlLCBzdGF0dXNlcykgLT5cbiAgICAgICAgZm9yIHNjaGVkdWxlIGluICRzY29wZS5tb25pdFNjaGVkdWxlc1xuICAgICAgICAgICAgc2NoZWR1bGUudXBkYXRlSG9zdHNTdGF0dXMoc3RhdHVzZXMpXG4gICAgKVxuICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgbW9uaXRTdGF0dXNMaXN0ZW5lcilcblxuICAgICRzY29wZS53YWl0aW5nVGFza3MgPSBtb25pdFN0YXR1cy5nZXRXYWl0aW5nKClcbiAgICAkc2NvcGUubW9uaXRXb3JrZXJzID0gbW9uaXRTdGF0dXMuZ2V0V29ya2VycygpXG4iLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG5cbi5mYWN0b3J5ICdIb3N0UmVzb3VyY2UnLCAoJHJlc291cmNlLCBjb25maWcpIC0+XG4gICAgdXJsID0gXCIjeyBjb25maWcuc2VydmVyQWRkcmVzcyB9L2hvc3QvOmlkL1wiXG4gICAgcmV0dXJuICRyZXNvdXJjZSh1cmwpXG5cblxuIy5mYWN0b3J5ICdIb3N0U3RhdHVzJywgLT5cbiMgICAgY2xhc3MgSG9zdFN0YXR1c1xuIyAgICAgICAgbW9uaXROYW1lOiB1bmRlZmluZWRcbiMgICAgICAgIGR0OiB1bmRlZmluZWRcbiMgICAgICAgIGV4dHJhOiB1bmRlZmluZWRcbiMgICAgICAgIGlzU3VjY2VzczogdW5kZWZpbmVkXG4jXG4jICAgICAgICBjb25zdHJ1Y3RvcjogKGRhdGEpIC0+XG4jICAgICAgICAgICAgYW5ndWxhci5leHRlbmQodGhpcywgZGF0YSBvciB7fSlcbiNcbiMgICAgcmV0dXJuIEhvc3RTdGF0dXMiLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG5cbi5mYWN0b3J5ICdIb3N0R3JvdXBSZXNvdXJjZScsICgkcmVzb3VyY2UsIGNvbmZpZykgLT5cbiAgICB1cmwgPSBcIiN7IGNvbmZpZy5zZXJ2ZXJBZGRyZXNzIH0vaG9zdF9ncm91cC86aWQvXCJcbiAgICByZXR1cm4gJHJlc291cmNlKHVybCkiLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG5cbi5mYWN0b3J5ICdNb25pdFNjaGVkdWxlUmVzb3VyY2UnLCAoJHJlc291cmNlLCBjb25maWcpIC0+XG4gICAgdXJsID0gXCIjeyBjb25maWcuc2VydmVyQWRkcmVzcyB9L21vbml0X3NjaGVkdWxlLzppZC9cIlxuICAgIHJldHVybiAkcmVzb3VyY2UodXJsKVxuXG5cbi5mYWN0b3J5ICdNb25pdFNjaGVkdWxlJywgKE1vbml0U2NoZWR1bGVSZXNvdXJjZSkgLT5cbiAgICBjbGFzcyBNb25pdFNjaGVkdWxlXG4gICAgICAgIGNvbnN0cnVjdG9yOiAoZGF0YSkgLT5cbiAgICAgICAgICAgIHRoaXMubGF0ZXN0U3RhdHVzRHQgPSB1bmRlZmluZWRcbiAgICAgICAgICAgIGFuZ3VsYXIuZXh0ZW5kKHRoaXMsIGRhdGEgb3Ige30pXG5cbiAgICAgICAgaXNPazogLT5cbiAgICAgICAgICAgIGZvciBob3N0IGluIHRoaXMuYWxsX2hvc3RzXG4gICAgICAgICAgICAgICAgaWYgaG9zdC5zdGF0dXMgIT0gdW5kZWZpbmVkIGFuZCBub3QgaG9zdC5zdGF0dXMubGV2ZWwgPT0gMVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICAgIHJldHVybiB0cnVlXG5cbiAgICAgICAgdXBkYXRlSG9zdHNTdGF0dXM6IChzdGF0dXNlcykgLT5cbiAgICAgICAgICAgIGZvciBzdGF0dXNJdGVtIGluIHN0YXR1c2VzXG4gICAgICAgICAgICAgICAgaWYgc3RhdHVzSXRlbS5zY2hlZHVsZV9pZCAhPSB0aGlzLmlkXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlXG5cbiAgICAgICAgICAgICAgICBob3N0ID0gdGhpcy5nZXRIb3N0KHN0YXR1c0l0ZW0uaG9zdF9hZGRyZXNzKVxuICAgICAgICAgICAgICAgIGlmIG5vdCBob3N0XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlXG5cbiAgICAgICAgICAgICAgICBob3N0LnN0YXR1cyA9IHN0YXR1c0l0ZW1cbiAgICAgICAgICAgICAgICBob3N0LnN0YXR1cy5yZXN1bHRfZHQgPSBtb21lbnQoc3RhdHVzSXRlbS5yZXN1bHRfZHQpLnRvRGF0ZSgpXG4gICAgICAgICAgICAgICAgaWYgbm90IHRoaXMubGF0ZXN0U3RhdHVzRHQgb3IgaG9zdC5zdGF0dXMucmVzdWx0X2R0ID4gdGhpcy5sYXRlc3RTdGF0dXNEdFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxhdGVzdFN0YXR1c0R0ID0gaG9zdC5zdGF0dXMucmVzdWx0X2R0XG5cbiAgICAgICAgZ2V0SG9zdDogKGhvc3RBZGRyZXNzKSAtPlxuICAgICAgICAgICAgZm9yIGhvc3QgaW4gdGhpcy5hbGxfaG9zdHNcbiAgICAgICAgICAgICAgICBpZiBob3N0LmFkZHJlc3MgPT0gaG9zdEFkZHJlc3NcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGhvc3RcblxuICAgICAgICBAR2V0QWxsOiAtPlxuICAgICAgICAgICAgc2NoZWR1bGVzID0gW11cblxuICAgICAgICAgICAgc2NoZWR1bGVzRGF0YSA9IE1vbml0U2NoZWR1bGVSZXNvdXJjZS5xdWVyeSAtPlxuICAgICAgICAgICAgICAgIGZvciBpdGVtRGF0YSBpbiBzY2hlZHVsZXNEYXRhXG4gICAgICAgICAgICAgICAgICAgIHNjaGVkdWxlID0gbmV3IE1vbml0U2NoZWR1bGUoaXRlbURhdGEpXG4gICAgICAgICAgICAgICAgICAgIHNjaGVkdWxlcy5wdXNoKHNjaGVkdWxlKVxuXG4gICAgICAgICAgICByZXR1cm4gc2NoZWR1bGVzXG5cbiAgICByZXR1cm4gTW9uaXRTY2hlZHVsZSIsImFuZ3VsYXIubW9kdWxlKCdwYXJrS2VlcGVyJylcblxuLmNvbnN0YW50KCdNT05JVF9TVEFUVVNfVVBEQVRFJywgJ01PTklUX1NUQVRVU19VUERBVEUnKVxuLmNvbnN0YW50KCdXQUlUSU5HX1RBU0tTX1VQREFURScsICdXQUlUSU5HX1RBU0tTX1VQREFURScpXG4uY29uc3RhbnQoJ1NUQVJURURfVEFTS1NfVVBEQVRFJywgJ1NUQVJURURfVEFTS1NfVVBEQVRFJylcblxuLnNlcnZpY2UgJ21vbml0U3RhdHVzJywgKFxuICAgICAgICAkbG9nLCAkcm9vdFNjb3BlLCBzd0h0dHBIZWxwZXIsIHN3V2ViU29ja2V0LCBjb25maWcsXG4gICAgICAgIE1PTklUX1NUQVRVU19VUERBVEUsIFdBSVRJTkdfVEFTS1NfVVBEQVRFLCBTVEFSVEVEX1RBU0tTX1VQREFURSkgLT5cbiAgICBzdGF0dXMgPSBbXVxuICAgIHdhaXRpbmcgPSBbXVxuICAgIHdvcmtlcnMgPSBbXVxuXG4gICAgdXBkYXRlU3RhdHVzID0gKHN0YXR1c0l0ZW0pIC0+XG4gICAgICAgIGZvciBpdGVtLCBpIGluIHN0YXR1c1xuICAgICAgICAgICAgaWYgaXRlbS5tb25pdF9uYW1lID09IHN0YXR1c0l0ZW0ubW9uaXRfbmFtZSBhbmQgaXRlbS5ob3N0X2FkZHJlc3MgPT0gc3RhdHVzSXRlbS5ob3N0X2FkZHJlc3NcbiAgICAgICAgICAgICAgICBzdGF0dXNbaV0gPSBzdGF0dXNJdGVtXG4gICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgIHN0YXR1cy5wdXNoKHN0YXR1c0l0ZW0pXG5cbiAgICB1cGRhdGVXYWl0aW5nID0gKHdhaXRpbmdUYXNrcykgLT5cbiAgICAgICAgd2FpdGluZy5sZW5ndGggPSAwXG4gICAgICAgIGZvciB0YXNrIGluIHdhaXRpbmdUYXNrc1xuICAgICAgICAgICAgd2FpdGluZy5wdXNoKHRhc2spXG5cbiAgICB1cGRhdGVXb3JrZXJzID0gKGN1cnJlbnRXb3JrZXJzKSAtPlxuICAgICAgICB3b3JrZXJzLmxlbmd0aCA9IDBcbiAgICAgICAgZm9yIHdvcmtlciBpbiBjdXJyZW50V29ya2Vyc1xuICAgICAgICAgICAgd29ya2Vycy5wdXNoKHdvcmtlcilcblxuICAgIHN1YnNjcmliZU1vbml0U3RhdHVzID0gLT5cbiAgICAgICAgc29ja2V0ID0gbmV3IHN3V2ViU29ja2V0KFwiI3sgY29uZmlnLndzU2VydmVyQWRkcmVzcyB9L21vbml0c1wiKVxuXG4gICAgICAgIHNvY2tldC5vbk1lc3NhZ2UgKG1zZykgLT5cbiAgICAgICAgICAgIHN0YXR1c0l0ZW0gPSBKU09OLnBhcnNlKG1zZylcbiAgICAgICAgICAgIHVwZGF0ZVN0YXR1cyhzdGF0dXNJdGVtKVxuIyAgICAgICAgICAgICRsb2cuZGVidWcoc3RhdHVzSXRlbSlcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChNT05JVF9TVEFUVVNfVVBEQVRFLCBzdGF0dXMpXG5cbiAgICAgICAgZHVyYWJsZSA9IHRydWVcbiAgICAgICAgc29ja2V0LnN0YXJ0KGR1cmFibGUpXG4jICAgICAgICAkbG9nLmRlYnVnKCdzdGFydCBzdWJzY3JpYmVNb25pdFN0YXR1cycpXG5cblxuICAgIHN1YnNjcmliZVdhaXRpbmdUYXNrcyA9IC0+XG4gICAgICAgIHNvY2tldCA9IG5ldyBzd1dlYlNvY2tldChcIiN7IGNvbmZpZy53c1NlcnZlckFkZHJlc3MgfS93YWl0aW5nX3Rhc2tzXCIpXG5cbiAgICAgICAgc29ja2V0Lm9uTWVzc2FnZSAobXNnKSAtPlxuICAgICAgICAgICAgd2FpdGluZ1Rhc2tzID0gSlNPTi5wYXJzZShtc2cpLndhaXRpbmdfdGFza3NcbiAgICAgICAgICAgIHVwZGF0ZVdhaXRpbmcod2FpdGluZ1Rhc2tzKVxuIyAgICAgICAgICAgICRsb2cuZGVidWcoJ3N1YnNjcmliZVdhaXRpbmdUYXNrcycsIHdhaXRpbmdUYXNrcylcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChXQUlUSU5HX1RBU0tTX1VQREFURSwgd2FpdGluZylcblxuICAgICAgICBkdXJhYmxlID0gdHJ1ZVxuICAgICAgICBzb2NrZXQuc3RhcnQoZHVyYWJsZSlcblxuXG4gICAgc3Vic2NyaWJlV29ya2Vyc1Rhc2tzID0gLT5cbiAgICAgICAgc29ja2V0ID0gbmV3IHN3V2ViU29ja2V0KFwiI3sgY29uZmlnLndzU2VydmVyQWRkcmVzcyB9L2N1cnJlbnRfd29ya2Vyc1wiKVxuXG4gICAgICAgIHNvY2tldC5vbk1lc3NhZ2UgKG1zZykgLT5cbiAgICAgICAgICAgIGN1cnJlbnRXb3JrZXJzID0gSlNPTi5wYXJzZShtc2cpLmN1cnJlbnRfd29ya2Vyc1xuICAgICAgICAgICAgdXBkYXRlV29ya2VycyhjdXJyZW50V29ya2VycylcbiMgICAgICAgICAgICAkbG9nLmRlYnVnKCdzdWJzY3JpYmVXb3JrZXJzVGFza3MnLCBjdXJyZW50V29ya2VycylcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChTVEFSVEVEX1RBU0tTX1VQREFURSwgd29ya2VycylcblxuICAgICAgICBkdXJhYmxlID0gdHJ1ZVxuICAgICAgICBzb2NrZXQuc3RhcnQoZHVyYWJsZSlcblxuXG4gICAgdGhpcy5zdGFydCA9IC0+XG4jICAgICAgICAkbG9nLmluZm8gJ3N0YXJ0IE1vbml0U3RhdHVzJ1xuICAgICAgICB0aGlzLmdldExhdGVzdCgpLnRoZW4gc3Vic2NyaWJlTW9uaXRTdGF0dXNcbiAgICAgICAgc3Vic2NyaWJlV2FpdGluZ1Rhc2tzKClcbiAgICAgICAgc3Vic2NyaWJlV29ya2Vyc1Rhc2tzKClcblxuICAgIHRoaXMuZ2V0TGF0ZXN0ID0gLT5cbiAgICAgICAgcmV0dXJuIHN3SHR0cEhlbHBlci5nZXQoXCIjeyBjb25maWcuc2VydmVyQWRkcmVzcyB9L21vbml0X3N0YXR1c19sYXRlc3QvXCIpLnRoZW4gKHJlc3BvbnNlKSAtPlxuICAgICAgICAgICAgc3RhdHVzLmxlbmd0aCA9IDBcbiAgICAgICAgICAgIGZvciBpdGVtIGluIHJlc3BvbnNlLmRhdGEubW9uaXRfc3RhdHVzX2xhdGVzdFxuICAgICAgICAgICAgICAgIHN0YXR1cy5wdXNoKGl0ZW0pXG5cbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChNT05JVF9TVEFUVVNfVVBEQVRFLCBzdGF0dXMpXG5cbiAgICAgICAgICAgIHJldHVybiBzdGF0dXNcblxuICAgIHRoaXMuZ2V0U3RhdHVzID0gLT5cbiAgICAgICAgcmV0dXJuIHN0YXR1c1xuXG4gICAgdGhpcy5nZXRXYWl0aW5nID0gLT5cbiAgICAgICAgcmV0dXJuIHdhaXRpbmdcblxuICAgIHRoaXMuZ2V0V29ya2VycyA9IC0+XG4gICAgICAgIHJldHVybiB3b3JrZXJzXG5cbiAgICByZXR1cm4gdGhpcyJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==

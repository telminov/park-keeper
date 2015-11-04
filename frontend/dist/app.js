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
        this.latestStatusLevel = void 0;
        angular.extend(this, data || {});
      }

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

      MonitSchedule.prototype.getLabel = function() {
        return this.name || this.monit.name;
      };

      MonitSchedule.prototype.updateHostsStatus = function(statuses) {
        var host, i, len, results, statusItem;
        this.latestStatusLevel = void 0;
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
            this.latestStatusDt = host.status.result_dt;
          }
          if (!this.latestStatusLevel || this.latestStatusLevel < host.status.level) {
            this.latestStatusLevel = host.status.level;
          }
          if (!this.latestStatusDt || this.latestStatusDt < host.status.result_dt) {
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

      MonitSchedule.prototype.isUndefined = function() {
        return this.latestStatusLevel === void 0;
      };

      MonitSchedule.prototype.isOk = function() {
        return this.latestStatusLevel === 1;
      };

      MonitSchedule.prototype.isWarning = function() {
        return this.latestStatusLevel === 2;
      };

      MonitSchedule.prototype.isFail = function() {
        return this.latestStatusLevel === 3;
      };

      MonitSchedule.prototype.isFresh = function() {
        var deadline;
        deadline = moment().subtract(this.period * 2, 'seconds').toDate();
        return this.latestStatusDt > deadline;
      };

      return MonitSchedule;

    })();
    return MonitSchedule;
  });

}).call(this);

(function() {
  angular.module('parkKeeper').constant('MONIT_STATUS_UPDATE', 'MONIT_STATUS_UPDATE').constant('WAITING_TASKS_UPDATE', 'WAITING_TASKS_UPDATE').constant('WORKERS_UPDATE', 'WORKERS_UPDATE').service('monitStatus', function($log, $rootScope, swHttpHelper, swWebSocket, config, MONIT_STATUS_UPDATE, WAITING_TASKS_UPDATE, WORKERS_UPDATE) {
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
        return $rootScope.$broadcast(WORKERS_UPDATE, workers);
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9hcHAuY29mZmVlIiwiYXBwL2NvbmZpZy5jb2ZmZWUiLCJhcHAvaW50ZXJjZXB0b3JzLmNvZmZlZSIsImFwcC9jb250cm9sbGVycy9tYWluLmNvZmZlZSIsImFwcC9yZXNvdXJjZXMvaG9zdC5jb2ZmZWUiLCJhcHAvcmVzb3VyY2VzL2hvc3RfZ3JvdXAuY29mZmVlIiwiYXBwL3Jlc291cmNlcy9tb25pdF9zY2hlZHVsZS5jb2ZmZWUiLCJhcHAvcmVzb3VyY2VzL21vbml0X3N0YXR1cy5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7RUFBQSxPQUFPLENBQUMsTUFBUixDQUFlLFlBQWYsRUFBNkIsQ0FDekIsWUFEeUIsRUFFekIsWUFGeUIsRUFHekIsU0FIeUIsRUFJekIsV0FKeUIsRUFNekIsZ0JBTnlCLEVBT3pCLGNBUHlCLEVBU3pCLFNBVHlCLEVBVXpCLGFBVnlCLEVBV3pCLFFBWHlCLENBQTdCLENBY0EsQ0FBQyxNQWRELENBY1EsU0FBQyxjQUFEO1dBQ0osY0FDQSxDQUFDLElBREQsQ0FDTSxHQUROLEVBRUU7TUFBQSxXQUFBLEVBQWEsdUJBQWI7TUFDQSxVQUFBLEVBQVksVUFEWjtNQUVBLEtBQUEsRUFBTyxFQUZQO0tBRkYsQ0FPQSxDQUFDLElBUEQsQ0FPTSxTQVBOLEVBUUk7TUFBQSxXQUFBLEVBQWEsd0JBQWI7TUFDQSxVQUFBLEVBQVksZUFEWjtNQUVBLEtBQUEsRUFBTyxPQUZQO0tBUkosQ0FZQSxDQUFDLElBWkQsQ0FZTSxVQVpOLEVBYUk7TUFBQSxXQUFBLEVBQWEseUJBQWI7TUFDQSxVQUFBLEVBQVksZ0JBRFo7TUFFQSxLQUFBLEVBQU8sUUFGUDtLQWJKO0VBREksQ0FkUixDQWlDQSxDQUFDLEdBakNELENBaUNLLFNBQUMsU0FBRCxFQUFZLFVBQVosRUFBd0IsT0FBeEI7SUFDRCxVQUFVLENBQUMsT0FBWCxHQUFxQjtXQUNyQixVQUFVLENBQUMsR0FBWCxDQUFlLHFCQUFmLEVBQXNDLFNBQUMsS0FBRCxFQUFR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bGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicsIFtcbiAgICAnbmdSZXNvdXJjZSdcbiAgICAnbmdTYW5pdGl6ZSdcbiAgICAnbmdSb3V0ZSdcbiAgICAnbmdBbmltYXRlJ1xuXG4gICAgJ2FuZ3VsYXIuZmlsdGVyJ1xuICAgICd1aS5ib290c3RyYXAnXG5cbiAgICAnc3dVdGlscydcbiAgICAnc3dXZWJTb2NrZXQnXG4gICAgJ3N3QXV0aCdcbl0pXG5cbi5jb25maWcgKCRyb3V0ZVByb3ZpZGVyKSAtPlxuICAgICRyb3V0ZVByb3ZpZGVyXG4gICAgLndoZW4oJy8nLFxuICAgICAgdGVtcGxhdGVVcmw6ICdjb250cm9sbGVycy9tYWluLmh0bWwnXG4gICAgICBjb250cm9sbGVyOiAnTWFpbkN0cmwnXG4gICAgICBsYWJlbDogJydcbiAgICApXG5cbiAgICAud2hlbignL2xvZ2luLycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnY29udHJvbGxlcnMvbG9naW4uaHRtbCdcbiAgICAgICAgY29udHJvbGxlcjogJ0F1dGhMb2dpbkN0cmwnXG4gICAgICAgIGxhYmVsOiAnTG9naW4nXG4gICAgKVxuICAgIC53aGVuKCcvbG9nb3V0LycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnY29udHJvbGxlcnMvbG9nb3V0Lmh0bWwnXG4gICAgICAgIGNvbnRyb2xsZXI6ICdBdXRoTG9nb3V0Q3RybCdcbiAgICAgICAgbGFiZWw6ICdMb2dvdXQnXG4gICAgKVxuXG4ucnVuICgkbG9jYXRpb24sICRyb290U2NvcGUsIHN3VGl0bGUpIC0+XG4gICAgJHJvb3RTY29wZS5zd1RpdGxlID0gc3dUaXRsZVxuICAgICRyb290U2NvcGUuJG9uICckcm91dGVDaGFuZ2VTdWNjZXNzJywgKGV2ZW50LCBjdXJyZW50LCBwcmV2aW91cykgLT5cbiAgICAgICAgYmFzZVRpdGxlID0gY3VycmVudC4kJHJvdXRlPy5sYWJlbCBvciAnJ1xuICAgICAgICBzd1RpdGxlLnNldFRpdGxlQmFzZShiYXNlVGl0bGUpXG4gICAgICAgIHN3VGl0bGUuc2V0VGl0bGVTdGFydCgnJylcbiAgICAgICAgc3dUaXRsZS5zZXRUaXRsZUVuZCgnJylcblxuLnJ1biAobW9uaXRTdGF0dXMpIC0+XG4gICAgbW9uaXRTdGF0dXMuc3RhcnQoKVxuXG4uY29uZmlnIChhdXRoQ29uZmlnUHJvdmlkZXIsIGNvbmZpZykgLT5cbiAgICBhdXRoQ29uZmlnUHJvdmlkZXIuc2V0U3lzdGVtTGFiZWwoJ3BhcmtLZWVwZXInKVxuICAgIGF1dGhDb25maWdQcm92aWRlci5zZXRTZXJ2ZXJBZGRyZXNzKGNvbmZpZy5zZXJ2ZXJBZGRyZXNzKVxuICAgIGF1dGhDb25maWdQcm92aWRlci5zZXRGcmVlVXJscyhbXSlcblxuLmNvbmZpZyAoJGh0dHBQcm92aWRlcikgLT5cbiAgICAkaHR0cFByb3ZpZGVyLmRlZmF1bHRzLmhlYWRlcnMucG9zdFsnQ29udGVudC1UeXBlJ10gPSAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJyIsImFuZ3VsYXIubW9kdWxlKCdwYXJrS2VlcGVyJylcbiAgICAuY29uc3RhbnQoJ2NvbmZpZycsIHtcbiAgICAgICAgc2VydmVyQWRkcmVzczogJ2h0dHA6Ly8xMjcuMC4wLjE6ODAwMCcsXG4gICAgICAgIHdzU2VydmVyQWRkcmVzczogJ3dzOi8vMTI3LjAuMC4xOjgwODAnLFxuICAgIH0pIiwiYW5ndWxhci5tb2R1bGUoJ3BhcmtLZWVwZXInKVxuXG4jIGludGVyY2VwdG9yIDUwMCBzdGF0dXMgZXJyb3Jcbi5jb25maWcgKCRodHRwUHJvdmlkZXIpIC0+XG4gICAgJGh0dHBQcm92aWRlci5pbnRlcmNlcHRvcnMucHVzaCgnc2VydmVyRXJyb3JJbnRlcmNlcHRvcicpXG5cbi5mYWN0b3J5ICdzZXJ2ZXJFcnJvckludGVyY2VwdG9yJywgKCRsb2NhdGlvbiwgJHEsICRsb2cpIC0+XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXNwb25zZUVycm9yOiAocmVzcG9uc2UpIC0+XG4gICAgICAgICAgICAgICAgaWYgcmVzcG9uc2Uuc3RhdHVzID09IDAgb3IgKHJlc3BvbnNlLnN0YXR1cyA+PSA1MDAgYW5kIHJlc3BvbnNlLnN0YXR1cyA8PSA2MDApXG4gICAgICAgICAgICAgICAgICAgICRsb2cuZXJyb3IocmVzcG9uc2UpXG4jICAgICAgICAgICAgICAgICAgICBlcnJvck1lc3NhZ2UgPSByZXNwb25zZS5zdGF0dXNUZXh0IG9yICcnXG4jICAgICAgICAgICAgICAgICAgICB0b2FzdGVyLnBvcCgnZXJyb3InLCAn0J7RiNC40LHQutCwINGB0LXRgNCy0LXRgNCwJywgZXJyb3JNZXNzYWdlKVxuICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UpXG5cbiAgICAgICAgfSIsImFuZ3VsYXIubW9kdWxlKCdwYXJrS2VlcGVyJylcbi5jb250cm9sbGVyICdNYWluQ3RybCcsICgkc2NvcGUsICRsb2csICR0aW1lb3V0LCBzd1dlYlNvY2tldCxcbiAgICAgICAgICAgICAgICAgICAgICAgICBtb25pdFN0YXR1cywgTU9OSVRfU1RBVFVTX1VQREFURSwgTW9uaXRTY2hlZHVsZSkgLT5cbiAgICAkc2NvcGUubW9uaXRTY2hlZHVsZXMgPSBNb25pdFNjaGVkdWxlLkdldEFsbCgpXG5cbiAgICBtb25pdFN0YXR1c0xpc3RlbmVyID0gJHNjb3BlLiRvbihNT05JVF9TVEFUVVNfVVBEQVRFLCAoZSwgc3RhdHVzZXMpIC0+XG4gICAgICAgIGZvciBzY2hlZHVsZSBpbiAkc2NvcGUubW9uaXRTY2hlZHVsZXNcbiAgICAgICAgICAgIHNjaGVkdWxlLnVwZGF0ZUhvc3RzU3RhdHVzKHN0YXR1c2VzKVxuICAgIClcbiAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsIG1vbml0U3RhdHVzTGlzdGVuZXIpXG5cbiAgICAkc2NvcGUud2FpdGluZ1Rhc2tzID0gbW9uaXRTdGF0dXMuZ2V0V2FpdGluZygpXG4gICAgJHNjb3BlLm1vbml0V29ya2VycyA9IG1vbml0U3RhdHVzLmdldFdvcmtlcnMoKVxuIiwiYW5ndWxhci5tb2R1bGUoJ3BhcmtLZWVwZXInKVxuXG4uZmFjdG9yeSAnSG9zdFJlc291cmNlJywgKCRyZXNvdXJjZSwgY29uZmlnKSAtPlxuICAgIHVybCA9IFwiI3sgY29uZmlnLnNlcnZlckFkZHJlc3MgfS9ob3N0LzppZC9cIlxuICAgIHJldHVybiAkcmVzb3VyY2UodXJsKVxuXG5cbiMuZmFjdG9yeSAnSG9zdFN0YXR1cycsIC0+XG4jICAgIGNsYXNzIEhvc3RTdGF0dXNcbiMgICAgICAgIG1vbml0TmFtZTogdW5kZWZpbmVkXG4jICAgICAgICBkdDogdW5kZWZpbmVkXG4jICAgICAgICBleHRyYTogdW5kZWZpbmVkXG4jICAgICAgICBpc1N1Y2Nlc3M6IHVuZGVmaW5lZFxuI1xuIyAgICAgICAgY29uc3RydWN0b3I6IChkYXRhKSAtPlxuIyAgICAgICAgICAgIGFuZ3VsYXIuZXh0ZW5kKHRoaXMsIGRhdGEgb3Ige30pXG4jXG4jICAgIHJldHVybiBIb3N0U3RhdHVzIiwiYW5ndWxhci5tb2R1bGUoJ3BhcmtLZWVwZXInKVxuXG4uZmFjdG9yeSAnSG9zdEdyb3VwUmVzb3VyY2UnLCAoJHJlc291cmNlLCBjb25maWcpIC0+XG4gICAgdXJsID0gXCIjeyBjb25maWcuc2VydmVyQWRkcmVzcyB9L2hvc3RfZ3JvdXAvOmlkL1wiXG4gICAgcmV0dXJuICRyZXNvdXJjZSh1cmwpIiwiYW5ndWxhci5tb2R1bGUoJ3BhcmtLZWVwZXInKVxuXG4uZmFjdG9yeSAnTW9uaXRTY2hlZHVsZVJlc291cmNlJywgKCRyZXNvdXJjZSwgY29uZmlnKSAtPlxuICAgIHVybCA9IFwiI3sgY29uZmlnLnNlcnZlckFkZHJlc3MgfS9tb25pdF9zY2hlZHVsZS86aWQvXCJcbiAgICByZXR1cm4gJHJlc291cmNlKHVybClcblxuXG4uZmFjdG9yeSAnTW9uaXRTY2hlZHVsZScsIChNb25pdFNjaGVkdWxlUmVzb3VyY2UpIC0+XG4gICAgY2xhc3MgTW9uaXRTY2hlZHVsZVxuXG4gICAgICAgIGNvbnN0cnVjdG9yOiAoZGF0YSkgLT5cbiAgICAgICAgICAgIHRoaXMubGF0ZXN0U3RhdHVzRHQgPSB1bmRlZmluZWRcbiAgICAgICAgICAgIHRoaXMubGF0ZXN0U3RhdHVzTGV2ZWwgPSB1bmRlZmluZWRcbiAgICAgICAgICAgIGFuZ3VsYXIuZXh0ZW5kKHRoaXMsIGRhdGEgb3Ige30pXG5cbiAgICAgICAgQEdldEFsbDogLT5cbiAgICAgICAgICAgIHNjaGVkdWxlcyA9IFtdXG5cbiAgICAgICAgICAgIHNjaGVkdWxlc0RhdGEgPSBNb25pdFNjaGVkdWxlUmVzb3VyY2UucXVlcnkgLT5cbiAgICAgICAgICAgICAgICBmb3IgaXRlbURhdGEgaW4gc2NoZWR1bGVzRGF0YVxuICAgICAgICAgICAgICAgICAgICBzY2hlZHVsZSA9IG5ldyBNb25pdFNjaGVkdWxlKGl0ZW1EYXRhKVxuICAgICAgICAgICAgICAgICAgICBzY2hlZHVsZXMucHVzaChzY2hlZHVsZSlcblxuICAgICAgICAgICAgcmV0dXJuIHNjaGVkdWxlc1xuXG4gICAgICAgIGdldExhYmVsOiAtPlxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubmFtZSBvciB0aGlzLm1vbml0Lm5hbWVcblxuICAgICAgICB1cGRhdGVIb3N0c1N0YXR1czogKHN0YXR1c2VzKSAtPlxuICAgICAgICAgICAgdGhpcy5sYXRlc3RTdGF0dXNMZXZlbCA9IHVuZGVmaW5lZFxuICAgICAgICAgICAgZm9yIHN0YXR1c0l0ZW0gaW4gc3RhdHVzZXNcbiAgICAgICAgICAgICAgICBpZiBzdGF0dXNJdGVtLnNjaGVkdWxlX2lkICE9IHRoaXMuaWRcbiAgICAgICAgICAgICAgICAgICAgY29udGludWVcblxuICAgICAgICAgICAgICAgIGhvc3QgPSB0aGlzLmdldEhvc3Qoc3RhdHVzSXRlbS5ob3N0X2FkZHJlc3MpXG4gICAgICAgICAgICAgICAgaWYgbm90IGhvc3RcbiAgICAgICAgICAgICAgICAgICAgY29udGludWVcblxuICAgICAgICAgICAgICAgIGhvc3Quc3RhdHVzID0gc3RhdHVzSXRlbVxuICAgICAgICAgICAgICAgIGhvc3Quc3RhdHVzLnJlc3VsdF9kdCA9IG1vbWVudChzdGF0dXNJdGVtLnJlc3VsdF9kdCkudG9EYXRlKClcbiAgICAgICAgICAgICAgICBpZiBub3QgdGhpcy5sYXRlc3RTdGF0dXNEdCBvciBob3N0LnN0YXR1cy5yZXN1bHRfZHQgPiB0aGlzLmxhdGVzdFN0YXR1c0R0XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGF0ZXN0U3RhdHVzRHQgPSBob3N0LnN0YXR1cy5yZXN1bHRfZHRcblxuICAgICAgICAgICAgICAgIGlmIG5vdCB0aGlzLmxhdGVzdFN0YXR1c0xldmVsIG9yIHRoaXMubGF0ZXN0U3RhdHVzTGV2ZWwgPCBob3N0LnN0YXR1cy5sZXZlbFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxhdGVzdFN0YXR1c0xldmVsID0gaG9zdC5zdGF0dXMubGV2ZWxcblxuICAgICAgICAgICAgICAgIGlmIG5vdCB0aGlzLmxhdGVzdFN0YXR1c0R0IG9yIHRoaXMubGF0ZXN0U3RhdHVzRHQgPCBob3N0LnN0YXR1cy5yZXN1bHRfZHRcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sYXRlc3RTdGF0dXNEdCA9IGhvc3Quc3RhdHVzLnJlc3VsdF9kdFxuXG4gICAgICAgIGdldEhvc3Q6IChob3N0QWRkcmVzcykgLT5cbiAgICAgICAgICAgIGZvciBob3N0IGluIHRoaXMuYWxsX2hvc3RzXG4gICAgICAgICAgICAgICAgaWYgaG9zdC5hZGRyZXNzID09IGhvc3RBZGRyZXNzXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBob3N0XG5cbiAgICAgICAgaXNVbmRlZmluZWQ6IC0+XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5sYXRlc3RTdGF0dXNMZXZlbCA9PSB1bmRlZmluZWRcbiAgICAgICAgaXNPazogLT5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxhdGVzdFN0YXR1c0xldmVsID09IDFcbiAgICAgICAgaXNXYXJuaW5nOiAtPlxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubGF0ZXN0U3RhdHVzTGV2ZWwgPT0gMlxuICAgICAgICBpc0ZhaWw6IC0+XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5sYXRlc3RTdGF0dXNMZXZlbCA9PSAzXG5cbiAgICAgICAgaXNGcmVzaDogLT5cbiAgICAgICAgICAgIGRlYWRsaW5lID0gbW9tZW50KCkuc3VidHJhY3QodGhpcy5wZXJpb2QgKiAyLCAnc2Vjb25kcycpLnRvRGF0ZSgpXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5sYXRlc3RTdGF0dXNEdCA+IGRlYWRsaW5lXG5cbiAgICByZXR1cm4gTW9uaXRTY2hlZHVsZSIsImFuZ3VsYXIubW9kdWxlKCdwYXJrS2VlcGVyJylcblxuLmNvbnN0YW50KCdNT05JVF9TVEFUVVNfVVBEQVRFJywgJ01PTklUX1NUQVRVU19VUERBVEUnKVxuLmNvbnN0YW50KCdXQUlUSU5HX1RBU0tTX1VQREFURScsICdXQUlUSU5HX1RBU0tTX1VQREFURScpXG4uY29uc3RhbnQoJ1dPUktFUlNfVVBEQVRFJywgJ1dPUktFUlNfVVBEQVRFJylcblxuLnNlcnZpY2UgJ21vbml0U3RhdHVzJywgKFxuICAgICAgICAkbG9nLCAkcm9vdFNjb3BlLCBzd0h0dHBIZWxwZXIsIHN3V2ViU29ja2V0LCBjb25maWcsXG4gICAgICAgIE1PTklUX1NUQVRVU19VUERBVEUsIFdBSVRJTkdfVEFTS1NfVVBEQVRFLCBXT1JLRVJTX1VQREFURSkgLT5cbiAgICBzdGF0dXMgPSBbXVxuICAgIHdhaXRpbmcgPSBbXVxuICAgIHdvcmtlcnMgPSBbXVxuXG4gICAgdXBkYXRlU3RhdHVzID0gKHN0YXR1c0l0ZW0pIC0+XG4gICAgICAgIGZvciBpdGVtLCBpIGluIHN0YXR1c1xuICAgICAgICAgICAgaWYgaXRlbS5tb25pdF9uYW1lID09IHN0YXR1c0l0ZW0ubW9uaXRfbmFtZSBhbmQgaXRlbS5ob3N0X2FkZHJlc3MgPT0gc3RhdHVzSXRlbS5ob3N0X2FkZHJlc3NcbiAgICAgICAgICAgICAgICBzdGF0dXNbaV0gPSBzdGF0dXNJdGVtXG4gICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgIHN0YXR1cy5wdXNoKHN0YXR1c0l0ZW0pXG5cbiAgICB1cGRhdGVXYWl0aW5nID0gKHdhaXRpbmdUYXNrcykgLT5cbiAgICAgICAgd2FpdGluZy5sZW5ndGggPSAwXG4gICAgICAgIGZvciB0YXNrIGluIHdhaXRpbmdUYXNrc1xuICAgICAgICAgICAgd2FpdGluZy5wdXNoKHRhc2spXG5cbiAgICB1cGRhdGVXb3JrZXJzID0gKGN1cnJlbnRXb3JrZXJzKSAtPlxuICAgICAgICB3b3JrZXJzLmxlbmd0aCA9IDBcbiAgICAgICAgZm9yIHdvcmtlciBpbiBjdXJyZW50V29ya2Vyc1xuICAgICAgICAgICAgd29ya2Vycy5wdXNoKHdvcmtlcilcblxuICAgIHN1YnNjcmliZU1vbml0U3RhdHVzID0gLT5cbiAgICAgICAgc29ja2V0ID0gbmV3IHN3V2ViU29ja2V0KFwiI3sgY29uZmlnLndzU2VydmVyQWRkcmVzcyB9L21vbml0c1wiKVxuXG4gICAgICAgIHNvY2tldC5vbk1lc3NhZ2UgKG1zZykgLT5cbiAgICAgICAgICAgIHN0YXR1c0l0ZW0gPSBKU09OLnBhcnNlKG1zZylcbiAgICAgICAgICAgIHVwZGF0ZVN0YXR1cyhzdGF0dXNJdGVtKVxuIyAgICAgICAgICAgICRsb2cuZGVidWcoc3RhdHVzSXRlbSlcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChNT05JVF9TVEFUVVNfVVBEQVRFLCBzdGF0dXMpXG5cbiAgICAgICAgZHVyYWJsZSA9IHRydWVcbiAgICAgICAgc29ja2V0LnN0YXJ0KGR1cmFibGUpXG4jICAgICAgICAkbG9nLmRlYnVnKCdzdGFydCBzdWJzY3JpYmVNb25pdFN0YXR1cycpXG5cblxuICAgIHN1YnNjcmliZVdhaXRpbmdUYXNrcyA9IC0+XG4gICAgICAgIHNvY2tldCA9IG5ldyBzd1dlYlNvY2tldChcIiN7IGNvbmZpZy53c1NlcnZlckFkZHJlc3MgfS93YWl0aW5nX3Rhc2tzXCIpXG5cbiAgICAgICAgc29ja2V0Lm9uTWVzc2FnZSAobXNnKSAtPlxuICAgICAgICAgICAgd2FpdGluZ1Rhc2tzID0gSlNPTi5wYXJzZShtc2cpLndhaXRpbmdfdGFza3NcbiAgICAgICAgICAgIHVwZGF0ZVdhaXRpbmcod2FpdGluZ1Rhc2tzKVxuIyAgICAgICAgICAgICRsb2cuZGVidWcoJ3N1YnNjcmliZVdhaXRpbmdUYXNrcycsIHdhaXRpbmdUYXNrcylcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChXQUlUSU5HX1RBU0tTX1VQREFURSwgd2FpdGluZylcblxuICAgICAgICBkdXJhYmxlID0gdHJ1ZVxuICAgICAgICBzb2NrZXQuc3RhcnQoZHVyYWJsZSlcblxuXG4gICAgc3Vic2NyaWJlV29ya2Vyc1Rhc2tzID0gLT5cbiAgICAgICAgc29ja2V0ID0gbmV3IHN3V2ViU29ja2V0KFwiI3sgY29uZmlnLndzU2VydmVyQWRkcmVzcyB9L2N1cnJlbnRfd29ya2Vyc1wiKVxuXG4gICAgICAgIHNvY2tldC5vbk1lc3NhZ2UgKG1zZykgLT5cbiAgICAgICAgICAgIGN1cnJlbnRXb3JrZXJzID0gSlNPTi5wYXJzZShtc2cpLmN1cnJlbnRfd29ya2Vyc1xuICAgICAgICAgICAgdXBkYXRlV29ya2VycyhjdXJyZW50V29ya2VycylcbiMgICAgICAgICAgICAkbG9nLmRlYnVnKCdzdWJzY3JpYmVXb3JrZXJzVGFza3MnLCBjdXJyZW50V29ya2VycylcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChXT1JLRVJTX1VQREFURSwgd29ya2VycylcblxuICAgICAgICBkdXJhYmxlID0gdHJ1ZVxuICAgICAgICBzb2NrZXQuc3RhcnQoZHVyYWJsZSlcblxuXG4gICAgdGhpcy5zdGFydCA9IC0+XG4jICAgICAgICAkbG9nLmluZm8gJ3N0YXJ0IE1vbml0U3RhdHVzJ1xuICAgICAgICB0aGlzLmdldExhdGVzdCgpLnRoZW4oc3Vic2NyaWJlTW9uaXRTdGF0dXMpXG4gICAgICAgIHN1YnNjcmliZVdhaXRpbmdUYXNrcygpXG4gICAgICAgIHN1YnNjcmliZVdvcmtlcnNUYXNrcygpXG5cbiAgICB0aGlzLmdldExhdGVzdCA9IC0+XG4gICAgICAgIHJldHVybiBzd0h0dHBIZWxwZXIuZ2V0KFwiI3sgY29uZmlnLnNlcnZlckFkZHJlc3MgfS9tb25pdF9zdGF0dXNfbGF0ZXN0L1wiKS50aGVuIChyZXNwb25zZSkgLT5cbiAgICAgICAgICAgIHN0YXR1cy5sZW5ndGggPSAwXG4gICAgICAgICAgICBmb3IgaXRlbSBpbiByZXNwb25zZS5kYXRhLm1vbml0X3N0YXR1c19sYXRlc3RcbiAgICAgICAgICAgICAgICBzdGF0dXMucHVzaChpdGVtKVxuXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoTU9OSVRfU1RBVFVTX1VQREFURSwgc3RhdHVzKVxuXG4gICAgICAgICAgICByZXR1cm4gc3RhdHVzXG5cbiAgICB0aGlzLmdldFN0YXR1cyA9IC0+XG4gICAgICAgIHJldHVybiBzdGF0dXNcblxuICAgIHRoaXMuZ2V0V2FpdGluZyA9IC0+XG4gICAgICAgIHJldHVybiB3YWl0aW5nXG5cbiAgICB0aGlzLmdldFdvcmtlcnMgPSAtPlxuICAgICAgICByZXR1cm4gd29ya2Vyc1xuXG4gICAgcmV0dXJuIHRoaXMiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=

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
  angular.module('parkKeeper').controller('MainCtrl', function($scope, $log, $timeout, swWebSocket, monitStatus, MONIT_STATUS_UPDATE, MONIT_SCHEDULE_UPDATE, MonitSchedule) {
    var deleteMonitSchedule, monitScheduleListener, monitStatusListener, updateMonitSchedule, updateMonitSchedulesStatuses;
    $scope.monitSchedules = MonitSchedule.GetAll();
    updateMonitSchedule = function(scheduleData) {
      var j, len, new_schedule, ref, schedule;
      ref = $scope.monitSchedules;
      for (j = 0, len = ref.length; j < len; j++) {
        schedule = ref[j];
        if (schedule.id === scheduleData.id) {
          schedule.update(scheduleData);
          return;
        }
      }
      new_schedule = new MonitSchedule(scheduleData);
      return $scope.monitSchedules.push(new_schedule);
    };
    deleteMonitSchedule = function(scheduleData) {
      var i, j, len, ref, schedule;
      ref = $scope.monitSchedules;
      for (i = j = 0, len = ref.length; j < len; i = ++j) {
        schedule = ref[i];
        if (schedule.id === scheduleData.id) {
          $scope.monitSchedules.splice(i, 1);
          return;
        }
      }
    };
    updateMonitSchedulesStatuses = function() {
      var j, len, ref, results, schedule;
      ref = $scope.monitSchedules;
      results = [];
      for (j = 0, len = ref.length; j < len; j++) {
        schedule = ref[j];
        results.push(schedule.updateHostsStatus(monitStatus.getStatus()));
      }
      return results;
    };
    monitStatusListener = $scope.$on(MONIT_STATUS_UPDATE, updateMonitSchedulesStatuses);
    monitScheduleListener = $scope.$on(MONIT_SCHEDULE_UPDATE, function(e, data) {
      if (data.event === 'create' || data.event === 'update') {
        updateMonitSchedule(data.instance);
      } else if (data.event === 'delete') {
        deleteMonitSchedule(data.instance);
      } else {
        $log.error('Unexpected monitScheduleListener data', data);
      }
      return updateMonitSchedulesStatuses();
    });
    $scope.$on('$destroy', function() {
      monitStatusListener();
      return monitScheduleListener();
    });
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

      MonitSchedule.prototype.update = function(data) {
        return angular.extend(this, data || {});
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
          this.latestStatusLevel = void 0;
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
  angular.module('parkKeeper').constant('MONIT_SCHEDULE_UPDATE', 'MONIT_SCHEDULE_UPDATE').constant('MONIT_STATUS_UPDATE', 'MONIT_STATUS_UPDATE').constant('WAITING_TASKS_UPDATE', 'WAITING_TASKS_UPDATE').constant('WORKERS_UPDATE', 'WORKERS_UPDATE').service('monitStatus', function($log, $rootScope, swHttpHelper, swWebSocket, config, MONIT_SCHEDULE_UPDATE, MONIT_STATUS_UPDATE, WAITING_TASKS_UPDATE, WORKERS_UPDATE) {
    var status, subscribeMonitSchedule, subscribeMonitStatus, subscribeWaitingTasks, subscribeWorkersTasks, updateStatus, updateWaiting, updateWorkers, waiting, workers;
    status = [];
    waiting = [];
    workers = [];
    updateStatus = function(statusItem) {
      var i, item, j, len;
      for (i = j = 0, len = status.length; j < len; i = ++j) {
        item = status[i];
        if (item.monit_name === statusItem.monit_name && item.host_address === statusItem.host_address && item.schedule_id === statusItem.schedule_id) {
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
    subscribeMonitSchedule = function() {
      var durable, socket;
      socket = new swWebSocket(config.wsServerAddress + "/monit_schedules");
      socket.onMessage(function(msg) {
        var monitSchedule;
        monitSchedule = JSON.parse(msg);
        return $rootScope.$broadcast(MONIT_SCHEDULE_UPDATE, monitSchedule);
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
      subscribeMonitSchedule();
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9hcHAuY29mZmVlIiwiYXBwL2NvbmZpZy5jb2ZmZWUiLCJhcHAvaW50ZXJjZXB0b3JzLmNvZmZlZSIsImFwcC9jb250cm9sbGVycy9tYWluLmNvZmZlZSIsImFwcC9yZXNvdXJjZXMvaG9zdC5jb2ZmZWUiLCJhcHAvcmVzb3VyY2VzL2hvc3RfZ3JvdXAuY29mZmVlIiwiYXBwL3Jlc291cmNlcy9tb25pdF9zY2hlZHVsZS5jb2ZmZWUiLCJhcHAvcmVzb3VyY2VzL21vbml0X3N0YXR1cy5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7RUFBQSxPQUFPLENBQUMsTUFBUixDQUFlLFlBQWYsRUFBNkIsQ0FDekIsWUFEeUIsRUFFekIsWUFGeUIsRUFHekIsU0FIeUIsRUFJekIsV0FKeUIsRUFNekIsZ0JBTnlCLEVBT3pCLGNBUHlCLEVBU3pCLFNBVHlCLEVBVXpCLGFBVnlCLEVBV3pCLFFBWHlCLENBQTdCLENBY0EsQ0FBQyxNQWRELENBY1EsU0FBQyxjQUFEO1dBQ0osY0FDQSxDQUFDLElBREQsQ0FDTSxHQUROLEVBRUU7TUFBQSxXQUFBLEVBQWEsdUJBQWI7TUFDQSxVQUFBLEVBQVksVUFEWjtNQUVBLEtBQUEsRUFBTyxFQUZQO0tBRkYsQ0FPQSxDQUFDLElBUEQsQ0FPTSxTQVBOLEVBUUk7TUFBQSxXQUFBLEVBQWEsd0JBQWI7TUFDQSxVQUFBLEVBQVksZUFEWjtNQUVBLEtBQUEsRUFBTyxPQUZQO0tBUkosQ0FZQSxDQUFDLElBWkQsQ0FZTSxVQVpOLEVBYUk7TUFBQSxXQUFBLEVBQWEseUJBQWI7TUFDQSxVQUFBLEVBQVksZ0JBRFo7TUFFQSxLQUFBLEVBQU8sUUFGUDtLQWJKO0VBREksQ0FkUixDQWlDQSxDQUFDLEdBakNELENBaUNLLFNBQUMsU0FBRCxFQUFZLFVBQVosRUFBd0IsT0FBeEI7SUFDRCxVQUFVLENBQUMsT0FBWCxHQUFxQjtXQUNyQixVQUFVLENBQUMsR0FBWCxDQUFlLHFCQUFmLEVBQXNDLFNBQUMsS0FBRCxFQUFR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QUNiLGFBQU8sWUFBWSxDQUFDLEdBQWIsQ0FBcUIsTUFBTSxDQUFDLGFBQVQsR0FBd0IsdUJBQTNDLENBQWtFLENBQUMsSUFBbkUsQ0FBd0UsU0FBQyxRQUFEO0FBQzNFLFlBQUE7UUFBQSxNQUFNLENBQUMsTUFBUCxHQUFnQjtBQUNoQjtBQUFBLGFBQUEscUNBQUE7O1VBQ0ksTUFBTSxDQUFDLElBQVAsQ0FBWSxJQUFaO0FBREo7UUFHQSxVQUFVLENBQUMsVUFBWCxDQUFzQixtQkFBdEIsRUFBMkMsTUFBM0M7QUFFQSxlQUFPO01BUG9FLENBQXhFO0lBRE07SUFVakIsSUFBSSxDQUFDLFNBQUwsR0FBaUIsU0FBQTtBQUNiLGFBQU87SUFETTtJQUdqQixJQUFJLENBQUMsVUFBTCxHQUFrQixTQUFBO0FBQ2QsYUFBTztJQURPO0lBR2xCLElBQUksQ0FBQyxVQUFMLEdBQWtCLFNBQUE7QUFDZCxhQUFPO0lBRE87QUFHbEIsV0FBTztFQXhHYSxDQVB4QjtBQUFBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbImFuZ3VsYXIubW9kdWxlKCdwYXJrS2VlcGVyJywgW1xuICAgICduZ1Jlc291cmNlJ1xuICAgICduZ1Nhbml0aXplJ1xuICAgICduZ1JvdXRlJ1xuICAgICduZ0FuaW1hdGUnXG5cbiAgICAnYW5ndWxhci5maWx0ZXInXG4gICAgJ3VpLmJvb3RzdHJhcCdcblxuICAgICdzd1V0aWxzJ1xuICAgICdzd1dlYlNvY2tldCdcbiAgICAnc3dBdXRoJ1xuXSlcblxuLmNvbmZpZyAoJHJvdXRlUHJvdmlkZXIpIC0+XG4gICAgJHJvdXRlUHJvdmlkZXJcbiAgICAud2hlbignLycsXG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbnRyb2xsZXJzL21haW4uaHRtbCdcbiAgICAgIGNvbnRyb2xsZXI6ICdNYWluQ3RybCdcbiAgICAgIGxhYmVsOiAnJ1xuICAgIClcblxuICAgIC53aGVuKCcvbG9naW4vJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdjb250cm9sbGVycy9sb2dpbi5odG1sJ1xuICAgICAgICBjb250cm9sbGVyOiAnQXV0aExvZ2luQ3RybCdcbiAgICAgICAgbGFiZWw6ICdMb2dpbidcbiAgICApXG4gICAgLndoZW4oJy9sb2dvdXQvJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdjb250cm9sbGVycy9sb2dvdXQuaHRtbCdcbiAgICAgICAgY29udHJvbGxlcjogJ0F1dGhMb2dvdXRDdHJsJ1xuICAgICAgICBsYWJlbDogJ0xvZ291dCdcbiAgICApXG5cbi5ydW4gKCRsb2NhdGlvbiwgJHJvb3RTY29wZSwgc3dUaXRsZSkgLT5cbiAgICAkcm9vdFNjb3BlLnN3VGl0bGUgPSBzd1RpdGxlXG4gICAgJHJvb3RTY29wZS4kb24gJyRyb3V0ZUNoYW5nZVN1Y2Nlc3MnLCAoZXZlbnQsIGN1cnJlbnQsIHByZXZpb3VzKSAtPlxuICAgICAgICBiYXNlVGl0bGUgPSBjdXJyZW50LiQkcm91dGU/LmxhYmVsIG9yICcnXG4gICAgICAgIHN3VGl0bGUuc2V0VGl0bGVCYXNlKGJhc2VUaXRsZSlcbiAgICAgICAgc3dUaXRsZS5zZXRUaXRsZVN0YXJ0KCcnKVxuICAgICAgICBzd1RpdGxlLnNldFRpdGxlRW5kKCcnKVxuXG4ucnVuIChtb25pdFN0YXR1cykgLT5cbiAgICBtb25pdFN0YXR1cy5zdGFydCgpXG5cbi5jb25maWcgKGF1dGhDb25maWdQcm92aWRlciwgY29uZmlnKSAtPlxuICAgIGF1dGhDb25maWdQcm92aWRlci5zZXRTeXN0ZW1MYWJlbCgncGFya0tlZXBlcicpXG4gICAgYXV0aENvbmZpZ1Byb3ZpZGVyLnNldFNlcnZlckFkZHJlc3MoY29uZmlnLnNlcnZlckFkZHJlc3MpXG4gICAgYXV0aENvbmZpZ1Byb3ZpZGVyLnNldEZyZWVVcmxzKFtdKVxuXG4uY29uZmlnICgkaHR0cFByb3ZpZGVyKSAtPlxuICAgICRodHRwUHJvdmlkZXIuZGVmYXVsdHMuaGVhZGVycy5wb3N0WydDb250ZW50LVR5cGUnXSA9ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnIiwiYW5ndWxhci5tb2R1bGUoJ3BhcmtLZWVwZXInKVxuICAgIC5jb25zdGFudCgnY29uZmlnJywge1xuICAgICAgICBzZXJ2ZXJBZGRyZXNzOiAnaHR0cDovLzEyNy4wLjAuMTo4MDAwJyxcbiAgICAgICAgd3NTZXJ2ZXJBZGRyZXNzOiAnd3M6Ly8xMjcuMC4wLjE6ODA4MCcsXG4gICAgfSkiLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG5cbiMgaW50ZXJjZXB0b3IgNTAwIHN0YXR1cyBlcnJvclxuLmNvbmZpZyAoJGh0dHBQcm92aWRlcikgLT5cbiAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKCdzZXJ2ZXJFcnJvckludGVyY2VwdG9yJylcblxuLmZhY3RvcnkgJ3NlcnZlckVycm9ySW50ZXJjZXB0b3InLCAoJGxvY2F0aW9uLCAkcSwgJGxvZykgLT5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3BvbnNlRXJyb3I6IChyZXNwb25zZSkgLT5cbiAgICAgICAgICAgICAgICBpZiByZXNwb25zZS5zdGF0dXMgPT0gMCBvciAocmVzcG9uc2Uuc3RhdHVzID49IDUwMCBhbmQgcmVzcG9uc2Uuc3RhdHVzIDw9IDYwMClcbiAgICAgICAgICAgICAgICAgICAgJGxvZy5lcnJvcihyZXNwb25zZSlcbiMgICAgICAgICAgICAgICAgICAgIGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLnN0YXR1c1RleHQgb3IgJydcbiMgICAgICAgICAgICAgICAgICAgIHRvYXN0ZXIucG9wKCdlcnJvcicsICfQntGI0LjQsdC60LAg0YHQtdGA0LLQtdGA0LAnLCBlcnJvck1lc3NhZ2UpXG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChyZXNwb25zZSlcblxuICAgICAgICB9IiwiYW5ndWxhci5tb2R1bGUoJ3BhcmtLZWVwZXInKVxuLmNvbnRyb2xsZXIgJ01haW5DdHJsJywgKCRzY29wZSwgJGxvZywgJHRpbWVvdXQsIHN3V2ViU29ja2V0LFxuICAgICAgICAgICAgICAgICAgICAgICAgIG1vbml0U3RhdHVzLCBNT05JVF9TVEFUVVNfVVBEQVRFLCBNT05JVF9TQ0hFRFVMRV9VUERBVEUsIE1vbml0U2NoZWR1bGUpIC0+XG4gICAgJHNjb3BlLm1vbml0U2NoZWR1bGVzID0gTW9uaXRTY2hlZHVsZS5HZXRBbGwoKVxuXG4gICAgdXBkYXRlTW9uaXRTY2hlZHVsZSA9IChzY2hlZHVsZURhdGEpIC0+XG4gICAgICAgICMgdHJ5IHVwZGF0ZSBleGlzdHNcbiAgICAgICAgZm9yIHNjaGVkdWxlIGluICRzY29wZS5tb25pdFNjaGVkdWxlc1xuICAgICAgICAgICAgaWYgc2NoZWR1bGUuaWQgPT0gc2NoZWR1bGVEYXRhLmlkXG4gICAgICAgICAgICAgICAgc2NoZWR1bGUudXBkYXRlKHNjaGVkdWxlRGF0YSlcbiAgICAgICAgICAgICAgICByZXR1cm5cblxuICAgICAgICAjIGFkZCBuZXdcbiAgICAgICAgbmV3X3NjaGVkdWxlID0gbmV3IE1vbml0U2NoZWR1bGUoc2NoZWR1bGVEYXRhKVxuICAgICAgICAkc2NvcGUubW9uaXRTY2hlZHVsZXMucHVzaChuZXdfc2NoZWR1bGUpXG5cbiAgICBkZWxldGVNb25pdFNjaGVkdWxlID0gKHNjaGVkdWxlRGF0YSkgLT5cbiAgICAgICAgZm9yIHNjaGVkdWxlLCBpIGluICRzY29wZS5tb25pdFNjaGVkdWxlc1xuICAgICAgICAgICAgaWYgc2NoZWR1bGUuaWQgPT0gc2NoZWR1bGVEYXRhLmlkXG4gICAgICAgICAgICAgICAgJHNjb3BlLm1vbml0U2NoZWR1bGVzLnNwbGljZShpLCAxKVxuICAgICAgICAgICAgICAgIHJldHVyblxuXG4gICAgdXBkYXRlTW9uaXRTY2hlZHVsZXNTdGF0dXNlcyA9IC0+XG4gICAgICAgIGZvciBzY2hlZHVsZSBpbiAkc2NvcGUubW9uaXRTY2hlZHVsZXNcbiAgICAgICAgICAgIHNjaGVkdWxlLnVwZGF0ZUhvc3RzU3RhdHVzKG1vbml0U3RhdHVzLmdldFN0YXR1cygpKVxuXG5cbiAgICBtb25pdFN0YXR1c0xpc3RlbmVyID0gJHNjb3BlLiRvbihNT05JVF9TVEFUVVNfVVBEQVRFLCB1cGRhdGVNb25pdFNjaGVkdWxlc1N0YXR1c2VzKVxuXG4gICAgbW9uaXRTY2hlZHVsZUxpc3RlbmVyID0gJHNjb3BlLiRvbihNT05JVF9TQ0hFRFVMRV9VUERBVEUsIChlLCBkYXRhKSAtPlxuICAgICAgICBpZiBkYXRhLmV2ZW50ID09ICdjcmVhdGUnIG9yIGRhdGEuZXZlbnQgPT0gJ3VwZGF0ZSdcbiAgICAgICAgICAgIHVwZGF0ZU1vbml0U2NoZWR1bGUoZGF0YS5pbnN0YW5jZSlcbiAgICAgICAgZWxzZSBpZiBkYXRhLmV2ZW50ID09ICdkZWxldGUnXG4gICAgICAgICAgICBkZWxldGVNb25pdFNjaGVkdWxlKGRhdGEuaW5zdGFuY2UpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgICRsb2cuZXJyb3IoJ1VuZXhwZWN0ZWQgbW9uaXRTY2hlZHVsZUxpc3RlbmVyIGRhdGEnLCBkYXRhKVxuXG4gICAgICAgIHVwZGF0ZU1vbml0U2NoZWR1bGVzU3RhdHVzZXMoKVxuICAgIClcblxuICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgLT5cbiAgICAgICAgbW9uaXRTdGF0dXNMaXN0ZW5lcigpXG4gICAgICAgIG1vbml0U2NoZWR1bGVMaXN0ZW5lcigpXG4gICAgKVxuXG4gICAgJHNjb3BlLndhaXRpbmdUYXNrcyA9IG1vbml0U3RhdHVzLmdldFdhaXRpbmcoKVxuICAgICRzY29wZS5tb25pdFdvcmtlcnMgPSBtb25pdFN0YXR1cy5nZXRXb3JrZXJzKClcbiIsImFuZ3VsYXIubW9kdWxlKCdwYXJrS2VlcGVyJylcblxuLmZhY3RvcnkgJ0hvc3RSZXNvdXJjZScsICgkcmVzb3VyY2UsIGNvbmZpZykgLT5cbiAgICB1cmwgPSBcIiN7IGNvbmZpZy5zZXJ2ZXJBZGRyZXNzIH0vaG9zdC86aWQvXCJcbiAgICByZXR1cm4gJHJlc291cmNlKHVybClcblxuXG4jLmZhY3RvcnkgJ0hvc3RTdGF0dXMnLCAtPlxuIyAgICBjbGFzcyBIb3N0U3RhdHVzXG4jICAgICAgICBtb25pdE5hbWU6IHVuZGVmaW5lZFxuIyAgICAgICAgZHQ6IHVuZGVmaW5lZFxuIyAgICAgICAgZXh0cmE6IHVuZGVmaW5lZFxuIyAgICAgICAgaXNTdWNjZXNzOiB1bmRlZmluZWRcbiNcbiMgICAgICAgIGNvbnN0cnVjdG9yOiAoZGF0YSkgLT5cbiMgICAgICAgICAgICBhbmd1bGFyLmV4dGVuZCh0aGlzLCBkYXRhIG9yIHt9KVxuI1xuIyAgICByZXR1cm4gSG9zdFN0YXR1cyIsImFuZ3VsYXIubW9kdWxlKCdwYXJrS2VlcGVyJylcblxuLmZhY3RvcnkgJ0hvc3RHcm91cFJlc291cmNlJywgKCRyZXNvdXJjZSwgY29uZmlnKSAtPlxuICAgIHVybCA9IFwiI3sgY29uZmlnLnNlcnZlckFkZHJlc3MgfS9ob3N0X2dyb3VwLzppZC9cIlxuICAgIHJldHVybiAkcmVzb3VyY2UodXJsKSIsImFuZ3VsYXIubW9kdWxlKCdwYXJrS2VlcGVyJylcblxuLmZhY3RvcnkgJ01vbml0U2NoZWR1bGVSZXNvdXJjZScsICgkcmVzb3VyY2UsIGNvbmZpZykgLT5cbiAgICB1cmwgPSBcIiN7IGNvbmZpZy5zZXJ2ZXJBZGRyZXNzIH0vbW9uaXRfc2NoZWR1bGUvOmlkL1wiXG4gICAgcmV0dXJuICRyZXNvdXJjZSh1cmwpXG5cblxuLmZhY3RvcnkgJ01vbml0U2NoZWR1bGUnLCAoTW9uaXRTY2hlZHVsZVJlc291cmNlKSAtPlxuICAgIGNsYXNzIE1vbml0U2NoZWR1bGVcblxuICAgICAgICBjb25zdHJ1Y3RvcjogKGRhdGEpIC0+XG4gICAgICAgICAgICB0aGlzLmxhdGVzdFN0YXR1c0R0ID0gdW5kZWZpbmVkXG4gICAgICAgICAgICB0aGlzLmxhdGVzdFN0YXR1c0xldmVsID0gdW5kZWZpbmVkXG4gICAgICAgICAgICBhbmd1bGFyLmV4dGVuZCh0aGlzLCBkYXRhIG9yIHt9KVxuXG4gICAgICAgIEBHZXRBbGw6IC0+XG4gICAgICAgICAgICBzY2hlZHVsZXMgPSBbXVxuXG4gICAgICAgICAgICBzY2hlZHVsZXNEYXRhID0gTW9uaXRTY2hlZHVsZVJlc291cmNlLnF1ZXJ5IC0+XG4gICAgICAgICAgICAgICAgZm9yIGl0ZW1EYXRhIGluIHNjaGVkdWxlc0RhdGFcbiAgICAgICAgICAgICAgICAgICAgc2NoZWR1bGUgPSBuZXcgTW9uaXRTY2hlZHVsZShpdGVtRGF0YSlcbiAgICAgICAgICAgICAgICAgICAgc2NoZWR1bGVzLnB1c2goc2NoZWR1bGUpXG5cbiAgICAgICAgICAgIHJldHVybiBzY2hlZHVsZXNcblxuICAgICAgICBnZXRMYWJlbDogLT5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLm5hbWUgb3IgdGhpcy5tb25pdC5uYW1lXG5cbiAgICAgICAgdXBkYXRlOiAoZGF0YSkgLT5cbiAgICAgICAgICAgIGFuZ3VsYXIuZXh0ZW5kKHRoaXMsIGRhdGEgb3Ige30pXG5cbiAgICAgICAgdXBkYXRlSG9zdHNTdGF0dXM6IChzdGF0dXNlcykgLT5cbiAgICAgICAgICAgIGZvciBzdGF0dXNJdGVtIGluIHN0YXR1c2VzXG4gICAgICAgICAgICAgICAgaWYgc3RhdHVzSXRlbS5zY2hlZHVsZV9pZCAhPSB0aGlzLmlkXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlXG5cbiAgICAgICAgICAgICAgICBob3N0ID0gdGhpcy5nZXRIb3N0KHN0YXR1c0l0ZW0uaG9zdF9hZGRyZXNzKVxuICAgICAgICAgICAgICAgIGlmIG5vdCBob3N0XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlXG5cbiAgICAgICAgICAgICAgICB0aGlzLmxhdGVzdFN0YXR1c0xldmVsID0gdW5kZWZpbmVkXG5cbiAgICAgICAgICAgICAgICBob3N0LnN0YXR1cyA9IHN0YXR1c0l0ZW1cbiAgICAgICAgICAgICAgICBob3N0LnN0YXR1cy5yZXN1bHRfZHQgPSBtb21lbnQoc3RhdHVzSXRlbS5yZXN1bHRfZHQpLnRvRGF0ZSgpXG4gICAgICAgICAgICAgICAgaWYgbm90IHRoaXMubGF0ZXN0U3RhdHVzRHQgb3IgaG9zdC5zdGF0dXMucmVzdWx0X2R0ID4gdGhpcy5sYXRlc3RTdGF0dXNEdFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxhdGVzdFN0YXR1c0R0ID0gaG9zdC5zdGF0dXMucmVzdWx0X2R0XG5cbiAgICAgICAgICAgICAgICBpZiBub3QgdGhpcy5sYXRlc3RTdGF0dXNMZXZlbCBvciB0aGlzLmxhdGVzdFN0YXR1c0xldmVsIDwgaG9zdC5zdGF0dXMubGV2ZWxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sYXRlc3RTdGF0dXNMZXZlbCA9IGhvc3Quc3RhdHVzLmxldmVsXG5cbiAgICAgICAgICAgICAgICBpZiBub3QgdGhpcy5sYXRlc3RTdGF0dXNEdCBvciB0aGlzLmxhdGVzdFN0YXR1c0R0IDwgaG9zdC5zdGF0dXMucmVzdWx0X2R0XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGF0ZXN0U3RhdHVzRHQgPSBob3N0LnN0YXR1cy5yZXN1bHRfZHRcblxuICAgICAgICBnZXRIb3N0OiAoaG9zdEFkZHJlc3MpIC0+XG4gICAgICAgICAgICBmb3IgaG9zdCBpbiB0aGlzLmFsbF9ob3N0c1xuICAgICAgICAgICAgICAgIGlmIGhvc3QuYWRkcmVzcyA9PSBob3N0QWRkcmVzc1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaG9zdFxuXG4gICAgICAgIGlzVW5kZWZpbmVkOiAtPlxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubGF0ZXN0U3RhdHVzTGV2ZWwgPT0gdW5kZWZpbmVkXG4gICAgICAgIGlzT2s6IC0+XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5sYXRlc3RTdGF0dXNMZXZlbCA9PSAxXG4gICAgICAgIGlzV2FybmluZzogLT5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxhdGVzdFN0YXR1c0xldmVsID09IDJcbiAgICAgICAgaXNGYWlsOiAtPlxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubGF0ZXN0U3RhdHVzTGV2ZWwgPT0gM1xuXG4gICAgICAgIGlzRnJlc2g6IC0+XG4gICAgICAgICAgICBkZWFkbGluZSA9IG1vbWVudCgpLnN1YnRyYWN0KHRoaXMucGVyaW9kICogMiwgJ3NlY29uZHMnKS50b0RhdGUoKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubGF0ZXN0U3RhdHVzRHQgPiBkZWFkbGluZVxuXG4gICAgcmV0dXJuIE1vbml0U2NoZWR1bGUiLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG5cbi5jb25zdGFudCgnTU9OSVRfU0NIRURVTEVfVVBEQVRFJywgJ01PTklUX1NDSEVEVUxFX1VQREFURScpXG4uY29uc3RhbnQoJ01PTklUX1NUQVRVU19VUERBVEUnLCAnTU9OSVRfU1RBVFVTX1VQREFURScpXG4uY29uc3RhbnQoJ1dBSVRJTkdfVEFTS1NfVVBEQVRFJywgJ1dBSVRJTkdfVEFTS1NfVVBEQVRFJylcbi5jb25zdGFudCgnV09SS0VSU19VUERBVEUnLCAnV09SS0VSU19VUERBVEUnKVxuXG4uc2VydmljZSAnbW9uaXRTdGF0dXMnLCAoXG4gICAgICAgICRsb2csICRyb290U2NvcGUsIHN3SHR0cEhlbHBlciwgc3dXZWJTb2NrZXQsIGNvbmZpZyxcbiAgICAgICAgTU9OSVRfU0NIRURVTEVfVVBEQVRFLCBNT05JVF9TVEFUVVNfVVBEQVRFLCBXQUlUSU5HX1RBU0tTX1VQREFURSwgV09SS0VSU19VUERBVEUpIC0+XG4gICAgc3RhdHVzID0gW11cbiAgICB3YWl0aW5nID0gW11cbiAgICB3b3JrZXJzID0gW11cblxuICAgIHVwZGF0ZVN0YXR1cyA9IChzdGF0dXNJdGVtKSAtPlxuICAgICAgICBmb3IgaXRlbSwgaSBpbiBzdGF0dXNcbiAgICAgICAgICAgIGlmIGl0ZW0ubW9uaXRfbmFtZSA9PSBzdGF0dXNJdGVtLm1vbml0X25hbWUgXFxcbiAgICAgICAgICAgICAgICBhbmQgaXRlbS5ob3N0X2FkZHJlc3MgPT0gc3RhdHVzSXRlbS5ob3N0X2FkZHJlc3MgXFxcbiAgICAgICAgICAgICAgICBhbmQgaXRlbS5zY2hlZHVsZV9pZCA9PSBzdGF0dXNJdGVtLnNjaGVkdWxlX2lkXG4gICAgICAgICAgICAgICAgICAgIHN0YXR1c1tpXSA9IHN0YXR1c0l0ZW1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgIHN0YXR1cy5wdXNoKHN0YXR1c0l0ZW0pXG5cbiAgICB1cGRhdGVXYWl0aW5nID0gKHdhaXRpbmdUYXNrcykgLT5cbiAgICAgICAgd2FpdGluZy5sZW5ndGggPSAwXG4gICAgICAgIGZvciB0YXNrIGluIHdhaXRpbmdUYXNrc1xuICAgICAgICAgICAgd2FpdGluZy5wdXNoKHRhc2spXG5cbiAgICB1cGRhdGVXb3JrZXJzID0gKGN1cnJlbnRXb3JrZXJzKSAtPlxuICAgICAgICB3b3JrZXJzLmxlbmd0aCA9IDBcbiAgICAgICAgZm9yIHdvcmtlciBpbiBjdXJyZW50V29ya2Vyc1xuICAgICAgICAgICAgd29ya2Vycy5wdXNoKHdvcmtlcilcblxuICAgIHN1YnNjcmliZU1vbml0U3RhdHVzID0gLT5cbiAgICAgICAgc29ja2V0ID0gbmV3IHN3V2ViU29ja2V0KFwiI3sgY29uZmlnLndzU2VydmVyQWRkcmVzcyB9L21vbml0c1wiKVxuXG4gICAgICAgIHNvY2tldC5vbk1lc3NhZ2UgKG1zZykgLT5cbiAgICAgICAgICAgIHN0YXR1c0l0ZW0gPSBKU09OLnBhcnNlKG1zZylcbiAgICAgICAgICAgIHVwZGF0ZVN0YXR1cyhzdGF0dXNJdGVtKVxuIyAgICAgICAgICAgICRsb2cuZGVidWcoc3RhdHVzSXRlbSlcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChNT05JVF9TVEFUVVNfVVBEQVRFLCBzdGF0dXMpXG5cbiAgICAgICAgZHVyYWJsZSA9IHRydWVcbiAgICAgICAgc29ja2V0LnN0YXJ0KGR1cmFibGUpXG4jICAgICAgICAkbG9nLmRlYnVnKCdzdGFydCBzdWJzY3JpYmVNb25pdFN0YXR1cycpXG5cblxuICAgIHN1YnNjcmliZU1vbml0U2NoZWR1bGUgPSAtPlxuICAgICAgICBzb2NrZXQgPSBuZXcgc3dXZWJTb2NrZXQoXCIjeyBjb25maWcud3NTZXJ2ZXJBZGRyZXNzIH0vbW9uaXRfc2NoZWR1bGVzXCIpXG5cbiAgICAgICAgc29ja2V0Lm9uTWVzc2FnZSAobXNnKSAtPlxuICAgICAgICAgICAgbW9uaXRTY2hlZHVsZSA9IEpTT04ucGFyc2UobXNnKVxuIyAgICAgICAgICAgICRsb2cuZGVidWcoJ3N1YnNjcmliZU1vbml0U2NoZWR1bGUnLCBtb25pdFNjaGVkdWxlKVxuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KE1PTklUX1NDSEVEVUxFX1VQREFURSwgbW9uaXRTY2hlZHVsZSlcblxuICAgICAgICBkdXJhYmxlID0gdHJ1ZVxuICAgICAgICBzb2NrZXQuc3RhcnQoZHVyYWJsZSlcblxuXG4gICAgc3Vic2NyaWJlV2FpdGluZ1Rhc2tzID0gLT5cbiAgICAgICAgc29ja2V0ID0gbmV3IHN3V2ViU29ja2V0KFwiI3sgY29uZmlnLndzU2VydmVyQWRkcmVzcyB9L3dhaXRpbmdfdGFza3NcIilcblxuICAgICAgICBzb2NrZXQub25NZXNzYWdlIChtc2cpIC0+XG4gICAgICAgICAgICB3YWl0aW5nVGFza3MgPSBKU09OLnBhcnNlKG1zZykud2FpdGluZ190YXNrc1xuICAgICAgICAgICAgdXBkYXRlV2FpdGluZyh3YWl0aW5nVGFza3MpXG4jICAgICAgICAgICAgJGxvZy5kZWJ1Zygnc3Vic2NyaWJlV2FpdGluZ1Rhc2tzJywgd2FpdGluZ1Rhc2tzKVxuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KFdBSVRJTkdfVEFTS1NfVVBEQVRFLCB3YWl0aW5nKVxuXG4gICAgICAgIGR1cmFibGUgPSB0cnVlXG4gICAgICAgIHNvY2tldC5zdGFydChkdXJhYmxlKVxuXG5cbiAgICBzdWJzY3JpYmVXb3JrZXJzVGFza3MgPSAtPlxuICAgICAgICBzb2NrZXQgPSBuZXcgc3dXZWJTb2NrZXQoXCIjeyBjb25maWcud3NTZXJ2ZXJBZGRyZXNzIH0vY3VycmVudF93b3JrZXJzXCIpXG5cbiAgICAgICAgc29ja2V0Lm9uTWVzc2FnZSAobXNnKSAtPlxuICAgICAgICAgICAgY3VycmVudFdvcmtlcnMgPSBKU09OLnBhcnNlKG1zZykuY3VycmVudF93b3JrZXJzXG4gICAgICAgICAgICB1cGRhdGVXb3JrZXJzKGN1cnJlbnRXb3JrZXJzKVxuIyAgICAgICAgICAgICRsb2cuZGVidWcoJ3N1YnNjcmliZVdvcmtlcnNUYXNrcycsIGN1cnJlbnRXb3JrZXJzKVxuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KFdPUktFUlNfVVBEQVRFLCB3b3JrZXJzKVxuXG4gICAgICAgIGR1cmFibGUgPSB0cnVlXG4gICAgICAgIHNvY2tldC5zdGFydChkdXJhYmxlKVxuXG5cbiAgICB0aGlzLnN0YXJ0ID0gLT5cbiMgICAgICAgICRsb2cuaW5mbyAnc3RhcnQgTW9uaXRTdGF0dXMnXG4gICAgICAgIHRoaXMuZ2V0TGF0ZXN0KCkudGhlbihzdWJzY3JpYmVNb25pdFN0YXR1cylcbiAgICAgICAgc3Vic2NyaWJlTW9uaXRTY2hlZHVsZSgpXG4gICAgICAgIHN1YnNjcmliZVdhaXRpbmdUYXNrcygpXG4gICAgICAgIHN1YnNjcmliZVdvcmtlcnNUYXNrcygpXG5cbiAgICB0aGlzLmdldExhdGVzdCA9IC0+XG4gICAgICAgIHJldHVybiBzd0h0dHBIZWxwZXIuZ2V0KFwiI3sgY29uZmlnLnNlcnZlckFkZHJlc3MgfS9tb25pdF9zdGF0dXNfbGF0ZXN0L1wiKS50aGVuIChyZXNwb25zZSkgLT5cbiAgICAgICAgICAgIHN0YXR1cy5sZW5ndGggPSAwXG4gICAgICAgICAgICBmb3IgaXRlbSBpbiByZXNwb25zZS5kYXRhLm1vbml0X3N0YXR1c19sYXRlc3RcbiAgICAgICAgICAgICAgICBzdGF0dXMucHVzaChpdGVtKVxuXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoTU9OSVRfU1RBVFVTX1VQREFURSwgc3RhdHVzKVxuXG4gICAgICAgICAgICByZXR1cm4gc3RhdHVzXG5cbiAgICB0aGlzLmdldFN0YXR1cyA9IC0+XG4gICAgICAgIHJldHVybiBzdGF0dXNcblxuICAgIHRoaXMuZ2V0V2FpdGluZyA9IC0+XG4gICAgICAgIHJldHVybiB3YWl0aW5nXG5cbiAgICB0aGlzLmdldFdvcmtlcnMgPSAtPlxuICAgICAgICByZXR1cm4gd29ya2Vyc1xuXG4gICAgcmV0dXJuIHRoaXMiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=

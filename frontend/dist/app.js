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
  angular.module('parkKeeper').controller('MainCtrl', function($scope, $log, $timeout, $uibModal, swWebSocket, monitStatus, MONIT_STATUS_UPDATE, MONIT_SCHEDULE_UPDATE, MonitSchedule) {
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
    $scope.monitWorkers = monitStatus.getWorkers();
    return $scope.openTask = function(tasks) {
      if (!tasks.length) {
        return;
      }
      return $uibModal.open({
        templateUrl: 'controllers/monit_tasks_modal.html',
        controller: 'MonitTasksModalCtrl',
        size: 'lg',
        resolve: {
          tasks: function() {
            return tasks;
          }
        }
      });
    };
  });

}).call(this);

(function() {
  angular.module('parkKeeper').controller('MonitTasksModalCtrl', function($scope, $uibModalInstance, tasks) {
    $scope.tasks = tasks;
    return $scope.cancel = function() {
      return $uibModalInstance.dismiss('cancel');
    };
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
  }).factory('MonitSchedule', function($log, MonitScheduleResource) {
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9hcHAuY29mZmVlIiwiYXBwL2NvbmZpZy5jb2ZmZWUiLCJhcHAvaW50ZXJjZXB0b3JzLmNvZmZlZSIsImFwcC9jb250cm9sbGVycy9tYWluLmNvZmZlZSIsImFwcC9jb250cm9sbGVycy9tb25pdF90YXNrc19tb2RhbC5jb2ZmZWUiLCJhcHAvcmVzb3VyY2VzL2hvc3QuY29mZmVlIiwiYXBwL3Jlc291cmNlcy9ob3N0X2dyb3VwLmNvZmZlZSIsImFwcC9yZXNvdXJjZXMvbW9uaXRfc2NoZWR1bGUuY29mZmVlIiwiYXBwL3Jlc291cmNlcy9tb25pdF9zdGF0dXMuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0VBQUEsT0FBTyxDQUFDLE1BQVIsQ0FBZSxZQUFmLEVBQTZCLENBQ3pCLFlBRHlCLEVBRXpCLFlBRnlCLEVBR3pCLFNBSHlCLEVBSXpCLFdBSnlCLEVBTXpCLGdCQU55QixFQU96QixjQVB5QixFQVN6QixTQVR5QixFQVV6QixhQVZ5QixFQVd6QixRQVh5QixDQUE3QixDQWNBLENBQUMsTUFkRCxDQWNRLFNBQUMsY0FBRDtXQUNKLGNBQ0EsQ0FBQyxJQURELENBQ00sR0FETixFQUVFO01BQUEsV0FBQSxFQUFhLHVCQUFiO01BQ0EsVUFBQSxFQUFZLFVBRFo7TUFFQSxLQUFBLEVBQU8sRUFGUDtLQUZGLENBT0EsQ0FBQyxJQVBELENBT00sU0FQTixFQVFJO01BQUEsV0FBQSxFQUFhLHdCQUFiO01BQ0EsVUFBQSxFQUFZLGVBRFo7TUFFQSxLQUFBLEVBQU8sT0FGUDtLQVJKLENBWUEsQ0FBQyxJQVpELENBWU0sVUFaTixFQWFJO01BQUEsV0FBQSxFQUFhLHlCQUFiO01BQ0EsVUFBQSxFQUFZLGdCQURaO01BRUEsS0FBQSxFQUFPLFFBRlA7S0FiSjtFQURJLENBZFIsQ0FpQ0EsQ0FBQyxHQWpDRCxDQWlDSyxTQUFDLFNBQUQsRUFBWSxVQUFaLEVBQXdCLE9BQXhCO0lBQ0QsVUFBVSxDQUFDLE9BQVgsR0FBcUI7V0FDckIsVUFB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YUFBTztJQURPO0FBR2xCLFdBQU87RUF4R2EsQ0FQeEI7QUFBQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicsIFtcbiAgICAnbmdSZXNvdXJjZSdcbiAgICAnbmdTYW5pdGl6ZSdcbiAgICAnbmdSb3V0ZSdcbiAgICAnbmdBbmltYXRlJ1xuXG4gICAgJ2FuZ3VsYXIuZmlsdGVyJ1xuICAgICd1aS5ib290c3RyYXAnXG5cbiAgICAnc3dVdGlscydcbiAgICAnc3dXZWJTb2NrZXQnXG4gICAgJ3N3QXV0aCdcbl0pXG5cbi5jb25maWcgKCRyb3V0ZVByb3ZpZGVyKSAtPlxuICAgICRyb3V0ZVByb3ZpZGVyXG4gICAgLndoZW4oJy8nLFxuICAgICAgdGVtcGxhdGVVcmw6ICdjb250cm9sbGVycy9tYWluLmh0bWwnXG4gICAgICBjb250cm9sbGVyOiAnTWFpbkN0cmwnXG4gICAgICBsYWJlbDogJydcbiAgICApXG5cbiAgICAud2hlbignL2xvZ2luLycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnY29udHJvbGxlcnMvbG9naW4uaHRtbCdcbiAgICAgICAgY29udHJvbGxlcjogJ0F1dGhMb2dpbkN0cmwnXG4gICAgICAgIGxhYmVsOiAnTG9naW4nXG4gICAgKVxuICAgIC53aGVuKCcvbG9nb3V0LycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnY29udHJvbGxlcnMvbG9nb3V0Lmh0bWwnXG4gICAgICAgIGNvbnRyb2xsZXI6ICdBdXRoTG9nb3V0Q3RybCdcbiAgICAgICAgbGFiZWw6ICdMb2dvdXQnXG4gICAgKVxuXG4ucnVuICgkbG9jYXRpb24sICRyb290U2NvcGUsIHN3VGl0bGUpIC0+XG4gICAgJHJvb3RTY29wZS5zd1RpdGxlID0gc3dUaXRsZVxuICAgICRyb290U2NvcGUuJG9uICckcm91dGVDaGFuZ2VTdWNjZXNzJywgKGV2ZW50LCBjdXJyZW50LCBwcmV2aW91cykgLT5cbiAgICAgICAgYmFzZVRpdGxlID0gY3VycmVudC4kJHJvdXRlPy5sYWJlbCBvciAnJ1xuICAgICAgICBzd1RpdGxlLnNldFRpdGxlQmFzZShiYXNlVGl0bGUpXG4gICAgICAgIHN3VGl0bGUuc2V0VGl0bGVTdGFydCgnJylcbiAgICAgICAgc3dUaXRsZS5zZXRUaXRsZUVuZCgnJylcblxuLnJ1biAobW9uaXRTdGF0dXMpIC0+XG4gICAgbW9uaXRTdGF0dXMuc3RhcnQoKVxuXG4uY29uZmlnIChhdXRoQ29uZmlnUHJvdmlkZXIsIGNvbmZpZykgLT5cbiAgICBhdXRoQ29uZmlnUHJvdmlkZXIuc2V0U3lzdGVtTGFiZWwoJ3BhcmtLZWVwZXInKVxuICAgIGF1dGhDb25maWdQcm92aWRlci5zZXRTZXJ2ZXJBZGRyZXNzKGNvbmZpZy5zZXJ2ZXJBZGRyZXNzKVxuICAgIGF1dGhDb25maWdQcm92aWRlci5zZXRGcmVlVXJscyhbXSlcblxuLmNvbmZpZyAoJGh0dHBQcm92aWRlcikgLT5cbiAgICAkaHR0cFByb3ZpZGVyLmRlZmF1bHRzLmhlYWRlcnMucG9zdFsnQ29udGVudC1UeXBlJ10gPSAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJyIsImFuZ3VsYXIubW9kdWxlKCdwYXJrS2VlcGVyJylcbiAgICAuY29uc3RhbnQoJ2NvbmZpZycsIHtcbiAgICAgICAgc2VydmVyQWRkcmVzczogJ2h0dHA6Ly8xMjcuMC4wLjE6ODAwMCcsXG4gICAgICAgIHdzU2VydmVyQWRkcmVzczogJ3dzOi8vMTI3LjAuMC4xOjgwODAnLFxuICAgIH0pIiwiYW5ndWxhci5tb2R1bGUoJ3BhcmtLZWVwZXInKVxuXG4jIGludGVyY2VwdG9yIDUwMCBzdGF0dXMgZXJyb3Jcbi5jb25maWcgKCRodHRwUHJvdmlkZXIpIC0+XG4gICAgJGh0dHBQcm92aWRlci5pbnRlcmNlcHRvcnMucHVzaCgnc2VydmVyRXJyb3JJbnRlcmNlcHRvcicpXG5cbi5mYWN0b3J5ICdzZXJ2ZXJFcnJvckludGVyY2VwdG9yJywgKCRsb2NhdGlvbiwgJHEsICRsb2cpIC0+XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXNwb25zZUVycm9yOiAocmVzcG9uc2UpIC0+XG4gICAgICAgICAgICAgICAgaWYgcmVzcG9uc2Uuc3RhdHVzID09IDAgb3IgKHJlc3BvbnNlLnN0YXR1cyA+PSA1MDAgYW5kIHJlc3BvbnNlLnN0YXR1cyA8PSA2MDApXG4gICAgICAgICAgICAgICAgICAgICRsb2cuZXJyb3IocmVzcG9uc2UpXG4jICAgICAgICAgICAgICAgICAgICBlcnJvck1lc3NhZ2UgPSByZXNwb25zZS5zdGF0dXNUZXh0IG9yICcnXG4jICAgICAgICAgICAgICAgICAgICB0b2FzdGVyLnBvcCgnZXJyb3InLCAn0J7RiNC40LHQutCwINGB0LXRgNCy0LXRgNCwJywgZXJyb3JNZXNzYWdlKVxuICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UpXG5cbiAgICAgICAgfSIsImFuZ3VsYXIubW9kdWxlKCdwYXJrS2VlcGVyJylcbi5jb250cm9sbGVyICdNYWluQ3RybCcsICgkc2NvcGUsICRsb2csICR0aW1lb3V0LCAkdWliTW9kYWwsIHN3V2ViU29ja2V0LFxuICAgICAgICAgICAgICAgICAgICAgICAgIG1vbml0U3RhdHVzLCBNT05JVF9TVEFUVVNfVVBEQVRFLCBNT05JVF9TQ0hFRFVMRV9VUERBVEUsIE1vbml0U2NoZWR1bGUpIC0+XG4gICAgJHNjb3BlLm1vbml0U2NoZWR1bGVzID0gTW9uaXRTY2hlZHVsZS5HZXRBbGwoKVxuXG4gICAgdXBkYXRlTW9uaXRTY2hlZHVsZSA9IChzY2hlZHVsZURhdGEpIC0+XG4gICAgICAgICMgdHJ5IHVwZGF0ZSBleGlzdHNcbiAgICAgICAgZm9yIHNjaGVkdWxlIGluICRzY29wZS5tb25pdFNjaGVkdWxlc1xuICAgICAgICAgICAgaWYgc2NoZWR1bGUuaWQgPT0gc2NoZWR1bGVEYXRhLmlkXG4gICAgICAgICAgICAgICAgc2NoZWR1bGUudXBkYXRlKHNjaGVkdWxlRGF0YSlcbiAgICAgICAgICAgICAgICByZXR1cm5cblxuICAgICAgICAjIGFkZCBuZXdcbiAgICAgICAgbmV3X3NjaGVkdWxlID0gbmV3IE1vbml0U2NoZWR1bGUoc2NoZWR1bGVEYXRhKVxuICAgICAgICAkc2NvcGUubW9uaXRTY2hlZHVsZXMucHVzaChuZXdfc2NoZWR1bGUpXG5cbiAgICBkZWxldGVNb25pdFNjaGVkdWxlID0gKHNjaGVkdWxlRGF0YSkgLT5cbiAgICAgICAgZm9yIHNjaGVkdWxlLCBpIGluICRzY29wZS5tb25pdFNjaGVkdWxlc1xuICAgICAgICAgICAgaWYgc2NoZWR1bGUuaWQgPT0gc2NoZWR1bGVEYXRhLmlkXG4gICAgICAgICAgICAgICAgJHNjb3BlLm1vbml0U2NoZWR1bGVzLnNwbGljZShpLCAxKVxuICAgICAgICAgICAgICAgIHJldHVyblxuXG4gICAgdXBkYXRlTW9uaXRTY2hlZHVsZXNTdGF0dXNlcyA9IC0+XG4gICAgICAgIGZvciBzY2hlZHVsZSBpbiAkc2NvcGUubW9uaXRTY2hlZHVsZXNcbiAgICAgICAgICAgIHNjaGVkdWxlLnVwZGF0ZUhvc3RzU3RhdHVzKG1vbml0U3RhdHVzLmdldFN0YXR1cygpKVxuXG5cbiAgICBtb25pdFN0YXR1c0xpc3RlbmVyID0gJHNjb3BlLiRvbihNT05JVF9TVEFUVVNfVVBEQVRFLCB1cGRhdGVNb25pdFNjaGVkdWxlc1N0YXR1c2VzKVxuXG4gICAgbW9uaXRTY2hlZHVsZUxpc3RlbmVyID0gJHNjb3BlLiRvbihNT05JVF9TQ0hFRFVMRV9VUERBVEUsIChlLCBkYXRhKSAtPlxuICAgICAgICBpZiBkYXRhLmV2ZW50ID09ICdjcmVhdGUnIG9yIGRhdGEuZXZlbnQgPT0gJ3VwZGF0ZSdcbiAgICAgICAgICAgIHVwZGF0ZU1vbml0U2NoZWR1bGUoZGF0YS5pbnN0YW5jZSlcbiAgICAgICAgZWxzZSBpZiBkYXRhLmV2ZW50ID09ICdkZWxldGUnXG4gICAgICAgICAgICBkZWxldGVNb25pdFNjaGVkdWxlKGRhdGEuaW5zdGFuY2UpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgICRsb2cuZXJyb3IoJ1VuZXhwZWN0ZWQgbW9uaXRTY2hlZHVsZUxpc3RlbmVyIGRhdGEnLCBkYXRhKVxuXG4gICAgICAgIHVwZGF0ZU1vbml0U2NoZWR1bGVzU3RhdHVzZXMoKVxuICAgIClcblxuICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgLT5cbiAgICAgICAgbW9uaXRTdGF0dXNMaXN0ZW5lcigpXG4gICAgICAgIG1vbml0U2NoZWR1bGVMaXN0ZW5lcigpXG4gICAgKVxuXG4gICAgJHNjb3BlLndhaXRpbmdUYXNrcyA9IG1vbml0U3RhdHVzLmdldFdhaXRpbmcoKVxuICAgICRzY29wZS5tb25pdFdvcmtlcnMgPSBtb25pdFN0YXR1cy5nZXRXb3JrZXJzKClcblxuXG4gICAgJHNjb3BlLm9wZW5UYXNrID0gKHRhc2tzKSAtPlxuICAgICAgICBpZiBub3QgdGFza3MubGVuZ3RoXG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgJHVpYk1vZGFsLm9wZW4oe1xuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdjb250cm9sbGVycy9tb25pdF90YXNrc19tb2RhbC5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdNb25pdFRhc2tzTW9kYWxDdHJsJyxcbiAgICAgICAgICAgIHNpemU6ICdsZycsXG4gICAgICAgICAgICByZXNvbHZlOlxuICAgICAgICAgICAgICAgIHRhc2tzOiAtPiB0YXNrc1xuICAgICAgICB9KSIsImFuZ3VsYXIubW9kdWxlKCdwYXJrS2VlcGVyJylcbi5jb250cm9sbGVyICdNb25pdFRhc2tzTW9kYWxDdHJsJywgKCRzY29wZSwgJHVpYk1vZGFsSW5zdGFuY2UsIHRhc2tzKSAtPlxuICAgICRzY29wZS50YXNrcyA9IHRhc2tzXG5cbiAgICAkc2NvcGUuY2FuY2VsID0gLT5cbiAgICAgICAgJHVpYk1vZGFsSW5zdGFuY2UuZGlzbWlzcygnY2FuY2VsJykiLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG5cbi5mYWN0b3J5ICdIb3N0UmVzb3VyY2UnLCAoJHJlc291cmNlLCBjb25maWcpIC0+XG4gICAgdXJsID0gXCIjeyBjb25maWcuc2VydmVyQWRkcmVzcyB9L2hvc3QvOmlkL1wiXG4gICAgcmV0dXJuICRyZXNvdXJjZSh1cmwpXG5cblxuIy5mYWN0b3J5ICdIb3N0U3RhdHVzJywgLT5cbiMgICAgY2xhc3MgSG9zdFN0YXR1c1xuIyAgICAgICAgbW9uaXROYW1lOiB1bmRlZmluZWRcbiMgICAgICAgIGR0OiB1bmRlZmluZWRcbiMgICAgICAgIGV4dHJhOiB1bmRlZmluZWRcbiMgICAgICAgIGlzU3VjY2VzczogdW5kZWZpbmVkXG4jXG4jICAgICAgICBjb25zdHJ1Y3RvcjogKGRhdGEpIC0+XG4jICAgICAgICAgICAgYW5ndWxhci5leHRlbmQodGhpcywgZGF0YSBvciB7fSlcbiNcbiMgICAgcmV0dXJuIEhvc3RTdGF0dXMiLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG5cbi5mYWN0b3J5ICdIb3N0R3JvdXBSZXNvdXJjZScsICgkcmVzb3VyY2UsIGNvbmZpZykgLT5cbiAgICB1cmwgPSBcIiN7IGNvbmZpZy5zZXJ2ZXJBZGRyZXNzIH0vaG9zdF9ncm91cC86aWQvXCJcbiAgICByZXR1cm4gJHJlc291cmNlKHVybCkiLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG5cbi5mYWN0b3J5ICdNb25pdFNjaGVkdWxlUmVzb3VyY2UnLCAoJHJlc291cmNlLCBjb25maWcpIC0+XG4gICAgdXJsID0gXCIjeyBjb25maWcuc2VydmVyQWRkcmVzcyB9L21vbml0X3NjaGVkdWxlLzppZC9cIlxuICAgIHJldHVybiAkcmVzb3VyY2UodXJsKVxuXG5cbi5mYWN0b3J5ICdNb25pdFNjaGVkdWxlJywgKCRsb2csIE1vbml0U2NoZWR1bGVSZXNvdXJjZSkgLT5cbiAgICBjbGFzcyBNb25pdFNjaGVkdWxlXG5cbiAgICAgICAgY29uc3RydWN0b3I6IChkYXRhKSAtPlxuICAgICAgICAgICAgdGhpcy5sYXRlc3RTdGF0dXNEdCA9IHVuZGVmaW5lZFxuICAgICAgICAgICAgdGhpcy5sYXRlc3RTdGF0dXNMZXZlbCA9IHVuZGVmaW5lZFxuICAgICAgICAgICAgYW5ndWxhci5leHRlbmQodGhpcywgZGF0YSBvciB7fSlcblxuICAgICAgICBAR2V0QWxsOiAtPlxuICAgICAgICAgICAgc2NoZWR1bGVzID0gW11cblxuICAgICAgICAgICAgc2NoZWR1bGVzRGF0YSA9IE1vbml0U2NoZWR1bGVSZXNvdXJjZS5xdWVyeSAtPlxuICAgICAgICAgICAgICAgIGZvciBpdGVtRGF0YSBpbiBzY2hlZHVsZXNEYXRhXG4gICAgICAgICAgICAgICAgICAgIHNjaGVkdWxlID0gbmV3IE1vbml0U2NoZWR1bGUoaXRlbURhdGEpXG4gICAgICAgICAgICAgICAgICAgIHNjaGVkdWxlcy5wdXNoKHNjaGVkdWxlKVxuXG4gICAgICAgICAgICByZXR1cm4gc2NoZWR1bGVzXG5cbiAgICAgICAgZ2V0TGFiZWw6IC0+XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5uYW1lIG9yIHRoaXMubW9uaXQubmFtZVxuXG4gICAgICAgIHVwZGF0ZTogKGRhdGEpIC0+XG4gICAgICAgICAgICBhbmd1bGFyLmV4dGVuZCh0aGlzLCBkYXRhIG9yIHt9KVxuXG4gICAgICAgIHVwZGF0ZUhvc3RzU3RhdHVzOiAoc3RhdHVzZXMpIC0+XG4gICAgICAgICAgICBmb3Igc3RhdHVzSXRlbSBpbiBzdGF0dXNlc1xuICAgICAgICAgICAgICAgIGlmIHN0YXR1c0l0ZW0uc2NoZWR1bGVfaWQgIT0gdGhpcy5pZFxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZVxuXG4gICAgICAgICAgICAgICAgaG9zdCA9IHRoaXMuZ2V0SG9zdChzdGF0dXNJdGVtLmhvc3RfYWRkcmVzcylcbiAgICAgICAgICAgICAgICBpZiBub3QgaG9zdFxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZVxuXG4gICAgICAgICAgICAgICAgdGhpcy5sYXRlc3RTdGF0dXNMZXZlbCA9IHVuZGVmaW5lZFxuXG4gICAgICAgICAgICAgICAgaG9zdC5zdGF0dXMgPSBzdGF0dXNJdGVtXG4gICAgICAgICAgICAgICAgaG9zdC5zdGF0dXMucmVzdWx0X2R0ID0gbW9tZW50KHN0YXR1c0l0ZW0ucmVzdWx0X2R0KS50b0RhdGUoKVxuICAgICAgICAgICAgICAgIGlmIG5vdCB0aGlzLmxhdGVzdFN0YXR1c0R0IG9yIGhvc3Quc3RhdHVzLnJlc3VsdF9kdCA+IHRoaXMubGF0ZXN0U3RhdHVzRHRcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sYXRlc3RTdGF0dXNEdCA9IGhvc3Quc3RhdHVzLnJlc3VsdF9kdFxuXG4gICAgICAgICAgICAgICAgaWYgbm90IHRoaXMubGF0ZXN0U3RhdHVzTGV2ZWwgb3IgdGhpcy5sYXRlc3RTdGF0dXNMZXZlbCA8IGhvc3Quc3RhdHVzLmxldmVsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGF0ZXN0U3RhdHVzTGV2ZWwgPSBob3N0LnN0YXR1cy5sZXZlbFxuXG4gICAgICAgICAgICAgICAgaWYgbm90IHRoaXMubGF0ZXN0U3RhdHVzRHQgb3IgdGhpcy5sYXRlc3RTdGF0dXNEdCA8IGhvc3Quc3RhdHVzLnJlc3VsdF9kdFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxhdGVzdFN0YXR1c0R0ID0gaG9zdC5zdGF0dXMucmVzdWx0X2R0XG5cbiAgICAgICAgZ2V0SG9zdDogKGhvc3RBZGRyZXNzKSAtPlxuICAgICAgICAgICAgZm9yIGhvc3QgaW4gdGhpcy5hbGxfaG9zdHNcbiAgICAgICAgICAgICAgICBpZiBob3N0LmFkZHJlc3MgPT0gaG9zdEFkZHJlc3NcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGhvc3RcblxuICAgICAgICBpc1VuZGVmaW5lZDogLT5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxhdGVzdFN0YXR1c0xldmVsID09IHVuZGVmaW5lZFxuICAgICAgICBpc09rOiAtPlxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubGF0ZXN0U3RhdHVzTGV2ZWwgPT0gMVxuICAgICAgICBpc1dhcm5pbmc6IC0+XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5sYXRlc3RTdGF0dXNMZXZlbCA9PSAyXG4gICAgICAgIGlzRmFpbDogLT5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxhdGVzdFN0YXR1c0xldmVsID09IDNcblxuICAgICAgICBpc0ZyZXNoOiAtPlxuICAgICAgICAgICAgZGVhZGxpbmUgPSBtb21lbnQoKS5zdWJ0cmFjdCh0aGlzLnBlcmlvZCAqIDIsICdzZWNvbmRzJykudG9EYXRlKClcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxhdGVzdFN0YXR1c0R0ID4gZGVhZGxpbmVcblxuICAgIHJldHVybiBNb25pdFNjaGVkdWxlIiwiYW5ndWxhci5tb2R1bGUoJ3BhcmtLZWVwZXInKVxuXG4uY29uc3RhbnQoJ01PTklUX1NDSEVEVUxFX1VQREFURScsICdNT05JVF9TQ0hFRFVMRV9VUERBVEUnKVxuLmNvbnN0YW50KCdNT05JVF9TVEFUVVNfVVBEQVRFJywgJ01PTklUX1NUQVRVU19VUERBVEUnKVxuLmNvbnN0YW50KCdXQUlUSU5HX1RBU0tTX1VQREFURScsICdXQUlUSU5HX1RBU0tTX1VQREFURScpXG4uY29uc3RhbnQoJ1dPUktFUlNfVVBEQVRFJywgJ1dPUktFUlNfVVBEQVRFJylcblxuLnNlcnZpY2UgJ21vbml0U3RhdHVzJywgKFxuICAgICAgICAkbG9nLCAkcm9vdFNjb3BlLCBzd0h0dHBIZWxwZXIsIHN3V2ViU29ja2V0LCBjb25maWcsXG4gICAgICAgIE1PTklUX1NDSEVEVUxFX1VQREFURSwgTU9OSVRfU1RBVFVTX1VQREFURSwgV0FJVElOR19UQVNLU19VUERBVEUsIFdPUktFUlNfVVBEQVRFKSAtPlxuICAgIHN0YXR1cyA9IFtdXG4gICAgd2FpdGluZyA9IFtdXG4gICAgd29ya2VycyA9IFtdXG5cbiAgICB1cGRhdGVTdGF0dXMgPSAoc3RhdHVzSXRlbSkgLT5cbiAgICAgICAgZm9yIGl0ZW0sIGkgaW4gc3RhdHVzXG4gICAgICAgICAgICBpZiBpdGVtLm1vbml0X25hbWUgPT0gc3RhdHVzSXRlbS5tb25pdF9uYW1lIFxcXG4gICAgICAgICAgICAgICAgYW5kIGl0ZW0uaG9zdF9hZGRyZXNzID09IHN0YXR1c0l0ZW0uaG9zdF9hZGRyZXNzIFxcXG4gICAgICAgICAgICAgICAgYW5kIGl0ZW0uc2NoZWR1bGVfaWQgPT0gc3RhdHVzSXRlbS5zY2hlZHVsZV9pZFxuICAgICAgICAgICAgICAgICAgICBzdGF0dXNbaV0gPSBzdGF0dXNJdGVtXG4gICAgICAgICAgICAgICAgICAgIHJldHVyblxuICAgICAgICBzdGF0dXMucHVzaChzdGF0dXNJdGVtKVxuXG4gICAgdXBkYXRlV2FpdGluZyA9ICh3YWl0aW5nVGFza3MpIC0+XG4gICAgICAgIHdhaXRpbmcubGVuZ3RoID0gMFxuICAgICAgICBmb3IgdGFzayBpbiB3YWl0aW5nVGFza3NcbiAgICAgICAgICAgIHdhaXRpbmcucHVzaCh0YXNrKVxuXG4gICAgdXBkYXRlV29ya2VycyA9IChjdXJyZW50V29ya2VycykgLT5cbiAgICAgICAgd29ya2Vycy5sZW5ndGggPSAwXG4gICAgICAgIGZvciB3b3JrZXIgaW4gY3VycmVudFdvcmtlcnNcbiAgICAgICAgICAgIHdvcmtlcnMucHVzaCh3b3JrZXIpXG5cbiAgICBzdWJzY3JpYmVNb25pdFN0YXR1cyA9IC0+XG4gICAgICAgIHNvY2tldCA9IG5ldyBzd1dlYlNvY2tldChcIiN7IGNvbmZpZy53c1NlcnZlckFkZHJlc3MgfS9tb25pdHNcIilcblxuICAgICAgICBzb2NrZXQub25NZXNzYWdlIChtc2cpIC0+XG4gICAgICAgICAgICBzdGF0dXNJdGVtID0gSlNPTi5wYXJzZShtc2cpXG4gICAgICAgICAgICB1cGRhdGVTdGF0dXMoc3RhdHVzSXRlbSlcbiMgICAgICAgICAgICAkbG9nLmRlYnVnKHN0YXR1c0l0ZW0pXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoTU9OSVRfU1RBVFVTX1VQREFURSwgc3RhdHVzKVxuXG4gICAgICAgIGR1cmFibGUgPSB0cnVlXG4gICAgICAgIHNvY2tldC5zdGFydChkdXJhYmxlKVxuIyAgICAgICAgJGxvZy5kZWJ1Zygnc3RhcnQgc3Vic2NyaWJlTW9uaXRTdGF0dXMnKVxuXG5cbiAgICBzdWJzY3JpYmVNb25pdFNjaGVkdWxlID0gLT5cbiAgICAgICAgc29ja2V0ID0gbmV3IHN3V2ViU29ja2V0KFwiI3sgY29uZmlnLndzU2VydmVyQWRkcmVzcyB9L21vbml0X3NjaGVkdWxlc1wiKVxuXG4gICAgICAgIHNvY2tldC5vbk1lc3NhZ2UgKG1zZykgLT5cbiAgICAgICAgICAgIG1vbml0U2NoZWR1bGUgPSBKU09OLnBhcnNlKG1zZylcbiMgICAgICAgICAgICAkbG9nLmRlYnVnKCdzdWJzY3JpYmVNb25pdFNjaGVkdWxlJywgbW9uaXRTY2hlZHVsZSlcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChNT05JVF9TQ0hFRFVMRV9VUERBVEUsIG1vbml0U2NoZWR1bGUpXG5cbiAgICAgICAgZHVyYWJsZSA9IHRydWVcbiAgICAgICAgc29ja2V0LnN0YXJ0KGR1cmFibGUpXG5cblxuICAgIHN1YnNjcmliZVdhaXRpbmdUYXNrcyA9IC0+XG4gICAgICAgIHNvY2tldCA9IG5ldyBzd1dlYlNvY2tldChcIiN7IGNvbmZpZy53c1NlcnZlckFkZHJlc3MgfS93YWl0aW5nX3Rhc2tzXCIpXG5cbiAgICAgICAgc29ja2V0Lm9uTWVzc2FnZSAobXNnKSAtPlxuICAgICAgICAgICAgd2FpdGluZ1Rhc2tzID0gSlNPTi5wYXJzZShtc2cpLndhaXRpbmdfdGFza3NcbiAgICAgICAgICAgIHVwZGF0ZVdhaXRpbmcod2FpdGluZ1Rhc2tzKVxuIyAgICAgICAgICAgICRsb2cuZGVidWcoJ3N1YnNjcmliZVdhaXRpbmdUYXNrcycsIHdhaXRpbmdUYXNrcylcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChXQUlUSU5HX1RBU0tTX1VQREFURSwgd2FpdGluZylcblxuICAgICAgICBkdXJhYmxlID0gdHJ1ZVxuICAgICAgICBzb2NrZXQuc3RhcnQoZHVyYWJsZSlcblxuXG4gICAgc3Vic2NyaWJlV29ya2Vyc1Rhc2tzID0gLT5cbiAgICAgICAgc29ja2V0ID0gbmV3IHN3V2ViU29ja2V0KFwiI3sgY29uZmlnLndzU2VydmVyQWRkcmVzcyB9L2N1cnJlbnRfd29ya2Vyc1wiKVxuXG4gICAgICAgIHNvY2tldC5vbk1lc3NhZ2UgKG1zZykgLT5cbiAgICAgICAgICAgIGN1cnJlbnRXb3JrZXJzID0gSlNPTi5wYXJzZShtc2cpLmN1cnJlbnRfd29ya2Vyc1xuICAgICAgICAgICAgdXBkYXRlV29ya2VycyhjdXJyZW50V29ya2VycylcbiMgICAgICAgICAgICAkbG9nLmRlYnVnKCdzdWJzY3JpYmVXb3JrZXJzVGFza3MnLCBjdXJyZW50V29ya2VycylcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChXT1JLRVJTX1VQREFURSwgd29ya2VycylcblxuICAgICAgICBkdXJhYmxlID0gdHJ1ZVxuICAgICAgICBzb2NrZXQuc3RhcnQoZHVyYWJsZSlcblxuXG4gICAgdGhpcy5zdGFydCA9IC0+XG4jICAgICAgICAkbG9nLmluZm8gJ3N0YXJ0IE1vbml0U3RhdHVzJ1xuICAgICAgICB0aGlzLmdldExhdGVzdCgpLnRoZW4oc3Vic2NyaWJlTW9uaXRTdGF0dXMpXG4gICAgICAgIHN1YnNjcmliZU1vbml0U2NoZWR1bGUoKVxuICAgICAgICBzdWJzY3JpYmVXYWl0aW5nVGFza3MoKVxuICAgICAgICBzdWJzY3JpYmVXb3JrZXJzVGFza3MoKVxuXG4gICAgdGhpcy5nZXRMYXRlc3QgPSAtPlxuICAgICAgICByZXR1cm4gc3dIdHRwSGVscGVyLmdldChcIiN7IGNvbmZpZy5zZXJ2ZXJBZGRyZXNzIH0vbW9uaXRfc3RhdHVzX2xhdGVzdC9cIikudGhlbiAocmVzcG9uc2UpIC0+XG4gICAgICAgICAgICBzdGF0dXMubGVuZ3RoID0gMFxuICAgICAgICAgICAgZm9yIGl0ZW0gaW4gcmVzcG9uc2UuZGF0YS5tb25pdF9zdGF0dXNfbGF0ZXN0XG4gICAgICAgICAgICAgICAgc3RhdHVzLnB1c2goaXRlbSlcblxuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KE1PTklUX1NUQVRVU19VUERBVEUsIHN0YXR1cylcblxuICAgICAgICAgICAgcmV0dXJuIHN0YXR1c1xuXG4gICAgdGhpcy5nZXRTdGF0dXMgPSAtPlxuICAgICAgICByZXR1cm4gc3RhdHVzXG5cbiAgICB0aGlzLmdldFdhaXRpbmcgPSAtPlxuICAgICAgICByZXR1cm4gd2FpdGluZ1xuXG4gICAgdGhpcy5nZXRXb3JrZXJzID0gLT5cbiAgICAgICAgcmV0dXJuIHdvcmtlcnNcblxuICAgIHJldHVybiB0aGlzIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9

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
    serverAddress: '',
    wsServerAddress: 'ws://127.0.0.1:8081'
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9hcHAuY29mZmVlIiwiYXBwL2NvbmZpZy5jb2ZmZWUiLCJhcHAvaW50ZXJjZXB0b3JzLmNvZmZlZSIsImFwcC9jb250cm9sbGVycy9tYWluLmNvZmZlZSIsImFwcC9jb250cm9sbGVycy9tb25pdF90YXNrc19tb2RhbC5jb2ZmZWUiLCJhcHAvcmVzb3VyY2VzL2hvc3QuY29mZmVlIiwiYXBwL3Jlc291cmNlcy9ob3N0X2dyb3VwLmNvZmZlZSIsImFwcC9yZXNvdXJjZXMvbW9uaXRfc2NoZWR1bGUuY29mZmVlIiwiYXBwL3Jlc291cmNlcy9tb25pdF9zdGF0dXMuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0VBQUEsT0FBTyxDQUFDLE1BQVIsQ0FBZSxZQUFmLEVBQTZCLENBQ3pCLFlBRHlCLEVBRXpCLFlBRnlCLEVBR3pCLFNBSHlCLEVBSXpCLFdBSnlCLEVBTXpCLGdCQU55QixFQU96QixjQVB5QixFQVN6QixTQVR5QixFQVV6QixhQVZ5QixFQVd6QixRQVh5QixDQUE3QixDQWNBLENBQUMsTUFkRCxDQWNRLFNBQUMsY0FBRDtXQUNKLGNBQ0EsQ0FBQyxJQURELENBQ00sR0FETixFQUVFO01BQUEsV0FBQSxFQUFhLHVCQUFiO01BQ0EsVUFBQSxFQUFZLFVBRFo7TUFFQSxLQUFBLEVBQU8sRUFGUDtLQUZGLENBT0EsQ0FBQyxJQVBELENBT00sU0FQTixFQVFJO01BQUEsV0FBQSxFQUFhLHdCQUFiO01BQ0EsVUFBQSxFQUFZLGVBRFo7TUFFQSxLQUFBLEVBQU8sT0FGUDtLQVJKLENBWUEsQ0FBQyxJQVpELENBWU0sVUFaTixFQWFJO01BQUEsV0FBQSxFQUFhLHlCQUFiO01BQ0EsVUFBQSxFQUFZLGdCQURaO01BRUEsS0FBQSxFQUFPLFFBRlA7S0FiSjtFQURJLENBZFIsQ0FpQ0EsQ0FBQyxHQWpDRCxDQWlDSyxTQUFDLFNBQUQsRUFBWSxVQUFaLEVBQXdCLE9BQXhCO0lBQ0QsVUFBVSxDQUFDLE9BQVgsR0FBcUI7V0FDckIsVUFB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QUFPO0lBRE87QUFHbEIsV0FBTztFQXhHYSxDQVB4QjtBQUFBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbImFuZ3VsYXIubW9kdWxlKCdwYXJrS2VlcGVyJywgW1xuICAgICduZ1Jlc291cmNlJ1xuICAgICduZ1Nhbml0aXplJ1xuICAgICduZ1JvdXRlJ1xuICAgICduZ0FuaW1hdGUnXG5cbiAgICAnYW5ndWxhci5maWx0ZXInXG4gICAgJ3VpLmJvb3RzdHJhcCdcblxuICAgICdzd1V0aWxzJ1xuICAgICdzd1dlYlNvY2tldCdcbiAgICAnc3dBdXRoJ1xuXSlcblxuLmNvbmZpZyAoJHJvdXRlUHJvdmlkZXIpIC0+XG4gICAgJHJvdXRlUHJvdmlkZXJcbiAgICAud2hlbignLycsXG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbnRyb2xsZXJzL21haW4uaHRtbCdcbiAgICAgIGNvbnRyb2xsZXI6ICdNYWluQ3RybCdcbiAgICAgIGxhYmVsOiAnJ1xuICAgIClcblxuICAgIC53aGVuKCcvbG9naW4vJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdjb250cm9sbGVycy9sb2dpbi5odG1sJ1xuICAgICAgICBjb250cm9sbGVyOiAnQXV0aExvZ2luQ3RybCdcbiAgICAgICAgbGFiZWw6ICdMb2dpbidcbiAgICApXG4gICAgLndoZW4oJy9sb2dvdXQvJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdjb250cm9sbGVycy9sb2dvdXQuaHRtbCdcbiAgICAgICAgY29udHJvbGxlcjogJ0F1dGhMb2dvdXRDdHJsJ1xuICAgICAgICBsYWJlbDogJ0xvZ291dCdcbiAgICApXG5cbi5ydW4gKCRsb2NhdGlvbiwgJHJvb3RTY29wZSwgc3dUaXRsZSkgLT5cbiAgICAkcm9vdFNjb3BlLnN3VGl0bGUgPSBzd1RpdGxlXG4gICAgJHJvb3RTY29wZS4kb24gJyRyb3V0ZUNoYW5nZVN1Y2Nlc3MnLCAoZXZlbnQsIGN1cnJlbnQsIHByZXZpb3VzKSAtPlxuICAgICAgICBiYXNlVGl0bGUgPSBjdXJyZW50LiQkcm91dGU/LmxhYmVsIG9yICcnXG4gICAgICAgIHN3VGl0bGUuc2V0VGl0bGVCYXNlKGJhc2VUaXRsZSlcbiAgICAgICAgc3dUaXRsZS5zZXRUaXRsZVN0YXJ0KCcnKVxuICAgICAgICBzd1RpdGxlLnNldFRpdGxlRW5kKCcnKVxuXG4ucnVuIChtb25pdFN0YXR1cykgLT5cbiAgICBtb25pdFN0YXR1cy5zdGFydCgpXG5cbi5jb25maWcgKGF1dGhDb25maWdQcm92aWRlciwgY29uZmlnKSAtPlxuICAgIGF1dGhDb25maWdQcm92aWRlci5zZXRTeXN0ZW1MYWJlbCgncGFya0tlZXBlcicpXG4gICAgYXV0aENvbmZpZ1Byb3ZpZGVyLnNldFNlcnZlckFkZHJlc3MoY29uZmlnLnNlcnZlckFkZHJlc3MpXG4gICAgYXV0aENvbmZpZ1Byb3ZpZGVyLnNldEZyZWVVcmxzKFtdKVxuXG4uY29uZmlnICgkaHR0cFByb3ZpZGVyKSAtPlxuICAgICRodHRwUHJvdmlkZXIuZGVmYXVsdHMuaGVhZGVycy5wb3N0WydDb250ZW50LVR5cGUnXSA9ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnIiwiYW5ndWxhci5tb2R1bGUoJ3BhcmtLZWVwZXInKVxuICAgIC5jb25zdGFudCgnY29uZmlnJywge1xuIyAgICAgICAgc2VydmVyQWRkcmVzczogJ2h0dHA6Ly8xMjcuMC4wLjE6ODA4MCcsXG4gICAgICAgIHNlcnZlckFkZHJlc3M6ICcnLFxuICAgICAgICB3c1NlcnZlckFkZHJlc3M6ICd3czovLzEyNy4wLjAuMTo4MDgxJyxcbiAgICB9KSIsImFuZ3VsYXIubW9kdWxlKCdwYXJrS2VlcGVyJylcblxuIyBpbnRlcmNlcHRvciA1MDAgc3RhdHVzIGVycm9yXG4uY29uZmlnICgkaHR0cFByb3ZpZGVyKSAtPlxuICAgICRodHRwUHJvdmlkZXIuaW50ZXJjZXB0b3JzLnB1c2goJ3NlcnZlckVycm9ySW50ZXJjZXB0b3InKVxuXG4uZmFjdG9yeSAnc2VydmVyRXJyb3JJbnRlcmNlcHRvcicsICgkbG9jYXRpb24sICRxLCAkbG9nKSAtPlxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzcG9uc2VFcnJvcjogKHJlc3BvbnNlKSAtPlxuICAgICAgICAgICAgICAgIGlmIHJlc3BvbnNlLnN0YXR1cyA9PSAwIG9yIChyZXNwb25zZS5zdGF0dXMgPj0gNTAwIGFuZCByZXNwb25zZS5zdGF0dXMgPD0gNjAwKVxuICAgICAgICAgICAgICAgICAgICAkbG9nLmVycm9yKHJlc3BvbnNlKVxuIyAgICAgICAgICAgICAgICAgICAgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2Uuc3RhdHVzVGV4dCBvciAnJ1xuIyAgICAgICAgICAgICAgICAgICAgdG9hc3Rlci5wb3AoJ2Vycm9yJywgJ9Ce0YjQuNCx0LrQsCDRgdC10YDQstC10YDQsCcsIGVycm9yTWVzc2FnZSlcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlKVxuXG4gICAgICAgIH0iLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG4uY29udHJvbGxlciAnTWFpbkN0cmwnLCAoJHNjb3BlLCAkbG9nLCAkdGltZW91dCwgJHVpYk1vZGFsLCBzd1dlYlNvY2tldCxcbiAgICAgICAgICAgICAgICAgICAgICAgICBtb25pdFN0YXR1cywgTU9OSVRfU1RBVFVTX1VQREFURSwgTU9OSVRfU0NIRURVTEVfVVBEQVRFLCBNb25pdFNjaGVkdWxlKSAtPlxuICAgICRzY29wZS5tb25pdFNjaGVkdWxlcyA9IE1vbml0U2NoZWR1bGUuR2V0QWxsKClcblxuICAgIHVwZGF0ZU1vbml0U2NoZWR1bGUgPSAoc2NoZWR1bGVEYXRhKSAtPlxuICAgICAgICAjIHRyeSB1cGRhdGUgZXhpc3RzXG4gICAgICAgIGZvciBzY2hlZHVsZSBpbiAkc2NvcGUubW9uaXRTY2hlZHVsZXNcbiAgICAgICAgICAgIGlmIHNjaGVkdWxlLmlkID09IHNjaGVkdWxlRGF0YS5pZFxuICAgICAgICAgICAgICAgIHNjaGVkdWxlLnVwZGF0ZShzY2hlZHVsZURhdGEpXG4gICAgICAgICAgICAgICAgcmV0dXJuXG5cbiAgICAgICAgIyBhZGQgbmV3XG4gICAgICAgIG5ld19zY2hlZHVsZSA9IG5ldyBNb25pdFNjaGVkdWxlKHNjaGVkdWxlRGF0YSlcbiAgICAgICAgJHNjb3BlLm1vbml0U2NoZWR1bGVzLnB1c2gobmV3X3NjaGVkdWxlKVxuXG4gICAgZGVsZXRlTW9uaXRTY2hlZHVsZSA9IChzY2hlZHVsZURhdGEpIC0+XG4gICAgICAgIGZvciBzY2hlZHVsZSwgaSBpbiAkc2NvcGUubW9uaXRTY2hlZHVsZXNcbiAgICAgICAgICAgIGlmIHNjaGVkdWxlLmlkID09IHNjaGVkdWxlRGF0YS5pZFxuICAgICAgICAgICAgICAgICRzY29wZS5tb25pdFNjaGVkdWxlcy5zcGxpY2UoaSwgMSlcbiAgICAgICAgICAgICAgICByZXR1cm5cblxuICAgIHVwZGF0ZU1vbml0U2NoZWR1bGVzU3RhdHVzZXMgPSAtPlxuICAgICAgICBmb3Igc2NoZWR1bGUgaW4gJHNjb3BlLm1vbml0U2NoZWR1bGVzXG4gICAgICAgICAgICBzY2hlZHVsZS51cGRhdGVIb3N0c1N0YXR1cyhtb25pdFN0YXR1cy5nZXRTdGF0dXMoKSlcblxuXG4gICAgbW9uaXRTdGF0dXNMaXN0ZW5lciA9ICRzY29wZS4kb24oTU9OSVRfU1RBVFVTX1VQREFURSwgdXBkYXRlTW9uaXRTY2hlZHVsZXNTdGF0dXNlcylcblxuICAgIG1vbml0U2NoZWR1bGVMaXN0ZW5lciA9ICRzY29wZS4kb24oTU9OSVRfU0NIRURVTEVfVVBEQVRFLCAoZSwgZGF0YSkgLT5cbiAgICAgICAgaWYgZGF0YS5ldmVudCA9PSAnY3JlYXRlJyBvciBkYXRhLmV2ZW50ID09ICd1cGRhdGUnXG4gICAgICAgICAgICB1cGRhdGVNb25pdFNjaGVkdWxlKGRhdGEuaW5zdGFuY2UpXG4gICAgICAgIGVsc2UgaWYgZGF0YS5ldmVudCA9PSAnZGVsZXRlJ1xuICAgICAgICAgICAgZGVsZXRlTW9uaXRTY2hlZHVsZShkYXRhLmluc3RhbmNlKVxuICAgICAgICBlbHNlXG4gICAgICAgICAgICAkbG9nLmVycm9yKCdVbmV4cGVjdGVkIG1vbml0U2NoZWR1bGVMaXN0ZW5lciBkYXRhJywgZGF0YSlcblxuICAgICAgICB1cGRhdGVNb25pdFNjaGVkdWxlc1N0YXR1c2VzKClcbiAgICApXG5cbiAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsIC0+XG4gICAgICAgIG1vbml0U3RhdHVzTGlzdGVuZXIoKVxuICAgICAgICBtb25pdFNjaGVkdWxlTGlzdGVuZXIoKVxuICAgIClcblxuICAgICRzY29wZS53YWl0aW5nVGFza3MgPSBtb25pdFN0YXR1cy5nZXRXYWl0aW5nKClcbiAgICAkc2NvcGUubW9uaXRXb3JrZXJzID0gbW9uaXRTdGF0dXMuZ2V0V29ya2VycygpXG5cblxuICAgICRzY29wZS5vcGVuVGFzayA9ICh0YXNrcykgLT5cbiAgICAgICAgaWYgbm90IHRhc2tzLmxlbmd0aFxuICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICR1aWJNb2RhbC5vcGVuKHtcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnY29udHJvbGxlcnMvbW9uaXRfdGFza3NfbW9kYWwuaHRtbCcsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnTW9uaXRUYXNrc01vZGFsQ3RybCcsXG4gICAgICAgICAgICBzaXplOiAnbGcnLFxuICAgICAgICAgICAgcmVzb2x2ZTpcbiAgICAgICAgICAgICAgICB0YXNrczogLT4gdGFza3NcbiAgICAgICAgfSkiLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG4uY29udHJvbGxlciAnTW9uaXRUYXNrc01vZGFsQ3RybCcsICgkc2NvcGUsICR1aWJNb2RhbEluc3RhbmNlLCB0YXNrcykgLT5cbiAgICAkc2NvcGUudGFza3MgPSB0YXNrc1xuXG4gICAgJHNjb3BlLmNhbmNlbCA9IC0+XG4gICAgICAgICR1aWJNb2RhbEluc3RhbmNlLmRpc21pc3MoJ2NhbmNlbCcpIiwiYW5ndWxhci5tb2R1bGUoJ3BhcmtLZWVwZXInKVxuXG4uZmFjdG9yeSAnSG9zdFJlc291cmNlJywgKCRyZXNvdXJjZSwgY29uZmlnKSAtPlxuICAgIHVybCA9IFwiI3sgY29uZmlnLnNlcnZlckFkZHJlc3MgfS9ob3N0LzppZC9cIlxuICAgIHJldHVybiAkcmVzb3VyY2UodXJsKVxuXG5cbiMuZmFjdG9yeSAnSG9zdFN0YXR1cycsIC0+XG4jICAgIGNsYXNzIEhvc3RTdGF0dXNcbiMgICAgICAgIG1vbml0TmFtZTogdW5kZWZpbmVkXG4jICAgICAgICBkdDogdW5kZWZpbmVkXG4jICAgICAgICBleHRyYTogdW5kZWZpbmVkXG4jICAgICAgICBpc1N1Y2Nlc3M6IHVuZGVmaW5lZFxuI1xuIyAgICAgICAgY29uc3RydWN0b3I6IChkYXRhKSAtPlxuIyAgICAgICAgICAgIGFuZ3VsYXIuZXh0ZW5kKHRoaXMsIGRhdGEgb3Ige30pXG4jXG4jICAgIHJldHVybiBIb3N0U3RhdHVzIiwiYW5ndWxhci5tb2R1bGUoJ3BhcmtLZWVwZXInKVxuXG4uZmFjdG9yeSAnSG9zdEdyb3VwUmVzb3VyY2UnLCAoJHJlc291cmNlLCBjb25maWcpIC0+XG4gICAgdXJsID0gXCIjeyBjb25maWcuc2VydmVyQWRkcmVzcyB9L2hvc3RfZ3JvdXAvOmlkL1wiXG4gICAgcmV0dXJuICRyZXNvdXJjZSh1cmwpIiwiYW5ndWxhci5tb2R1bGUoJ3BhcmtLZWVwZXInKVxuXG4uZmFjdG9yeSAnTW9uaXRTY2hlZHVsZVJlc291cmNlJywgKCRyZXNvdXJjZSwgY29uZmlnKSAtPlxuICAgIHVybCA9IFwiI3sgY29uZmlnLnNlcnZlckFkZHJlc3MgfS9tb25pdF9zY2hlZHVsZS86aWQvXCJcbiAgICByZXR1cm4gJHJlc291cmNlKHVybClcblxuXG4uZmFjdG9yeSAnTW9uaXRTY2hlZHVsZScsICgkbG9nLCBNb25pdFNjaGVkdWxlUmVzb3VyY2UpIC0+XG4gICAgY2xhc3MgTW9uaXRTY2hlZHVsZVxuXG4gICAgICAgIGNvbnN0cnVjdG9yOiAoZGF0YSkgLT5cbiAgICAgICAgICAgIHRoaXMubGF0ZXN0U3RhdHVzRHQgPSB1bmRlZmluZWRcbiAgICAgICAgICAgIHRoaXMubGF0ZXN0U3RhdHVzTGV2ZWwgPSB1bmRlZmluZWRcbiAgICAgICAgICAgIGFuZ3VsYXIuZXh0ZW5kKHRoaXMsIGRhdGEgb3Ige30pXG5cbiAgICAgICAgQEdldEFsbDogLT5cbiAgICAgICAgICAgIHNjaGVkdWxlcyA9IFtdXG5cbiAgICAgICAgICAgIHNjaGVkdWxlc0RhdGEgPSBNb25pdFNjaGVkdWxlUmVzb3VyY2UucXVlcnkgLT5cbiAgICAgICAgICAgICAgICBmb3IgaXRlbURhdGEgaW4gc2NoZWR1bGVzRGF0YVxuICAgICAgICAgICAgICAgICAgICBzY2hlZHVsZSA9IG5ldyBNb25pdFNjaGVkdWxlKGl0ZW1EYXRhKVxuICAgICAgICAgICAgICAgICAgICBzY2hlZHVsZXMucHVzaChzY2hlZHVsZSlcblxuICAgICAgICAgICAgcmV0dXJuIHNjaGVkdWxlc1xuXG4gICAgICAgIGdldExhYmVsOiAtPlxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubmFtZSBvciB0aGlzLm1vbml0Lm5hbWVcblxuICAgICAgICB1cGRhdGU6IChkYXRhKSAtPlxuICAgICAgICAgICAgYW5ndWxhci5leHRlbmQodGhpcywgZGF0YSBvciB7fSlcblxuICAgICAgICB1cGRhdGVIb3N0c1N0YXR1czogKHN0YXR1c2VzKSAtPlxuICAgICAgICAgICAgZm9yIHN0YXR1c0l0ZW0gaW4gc3RhdHVzZXNcbiAgICAgICAgICAgICAgICBpZiBzdGF0dXNJdGVtLnNjaGVkdWxlX2lkICE9IHRoaXMuaWRcbiAgICAgICAgICAgICAgICAgICAgY29udGludWVcblxuICAgICAgICAgICAgICAgIGhvc3QgPSB0aGlzLmdldEhvc3Qoc3RhdHVzSXRlbS5ob3N0X2FkZHJlc3MpXG4gICAgICAgICAgICAgICAgaWYgbm90IGhvc3RcbiAgICAgICAgICAgICAgICAgICAgY29udGludWVcblxuICAgICAgICAgICAgICAgIHRoaXMubGF0ZXN0U3RhdHVzTGV2ZWwgPSB1bmRlZmluZWRcblxuICAgICAgICAgICAgICAgIGhvc3Quc3RhdHVzID0gc3RhdHVzSXRlbVxuICAgICAgICAgICAgICAgIGhvc3Quc3RhdHVzLnJlc3VsdF9kdCA9IG1vbWVudChzdGF0dXNJdGVtLnJlc3VsdF9kdCkudG9EYXRlKClcbiAgICAgICAgICAgICAgICBpZiBub3QgdGhpcy5sYXRlc3RTdGF0dXNEdCBvciBob3N0LnN0YXR1cy5yZXN1bHRfZHQgPiB0aGlzLmxhdGVzdFN0YXR1c0R0XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGF0ZXN0U3RhdHVzRHQgPSBob3N0LnN0YXR1cy5yZXN1bHRfZHRcblxuICAgICAgICAgICAgICAgIGlmIG5vdCB0aGlzLmxhdGVzdFN0YXR1c0xldmVsIG9yIHRoaXMubGF0ZXN0U3RhdHVzTGV2ZWwgPCBob3N0LnN0YXR1cy5sZXZlbFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxhdGVzdFN0YXR1c0xldmVsID0gaG9zdC5zdGF0dXMubGV2ZWxcblxuICAgICAgICAgICAgICAgIGlmIG5vdCB0aGlzLmxhdGVzdFN0YXR1c0R0IG9yIHRoaXMubGF0ZXN0U3RhdHVzRHQgPCBob3N0LnN0YXR1cy5yZXN1bHRfZHRcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sYXRlc3RTdGF0dXNEdCA9IGhvc3Quc3RhdHVzLnJlc3VsdF9kdFxuXG4gICAgICAgIGdldEhvc3Q6IChob3N0QWRkcmVzcykgLT5cbiAgICAgICAgICAgIGZvciBob3N0IGluIHRoaXMuYWxsX2hvc3RzXG4gICAgICAgICAgICAgICAgaWYgaG9zdC5hZGRyZXNzID09IGhvc3RBZGRyZXNzXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBob3N0XG5cbiAgICAgICAgaXNVbmRlZmluZWQ6IC0+XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5sYXRlc3RTdGF0dXNMZXZlbCA9PSB1bmRlZmluZWRcbiAgICAgICAgaXNPazogLT5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxhdGVzdFN0YXR1c0xldmVsID09IDFcbiAgICAgICAgaXNXYXJuaW5nOiAtPlxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubGF0ZXN0U3RhdHVzTGV2ZWwgPT0gMlxuICAgICAgICBpc0ZhaWw6IC0+XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5sYXRlc3RTdGF0dXNMZXZlbCA9PSAzXG5cbiAgICAgICAgaXNGcmVzaDogLT5cbiAgICAgICAgICAgIGRlYWRsaW5lID0gbW9tZW50KCkuc3VidHJhY3QodGhpcy5wZXJpb2QgKiAyLCAnc2Vjb25kcycpLnRvRGF0ZSgpXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5sYXRlc3RTdGF0dXNEdCA+IGRlYWRsaW5lXG5cbiAgICByZXR1cm4gTW9uaXRTY2hlZHVsZSIsImFuZ3VsYXIubW9kdWxlKCdwYXJrS2VlcGVyJylcblxuLmNvbnN0YW50KCdNT05JVF9TQ0hFRFVMRV9VUERBVEUnLCAnTU9OSVRfU0NIRURVTEVfVVBEQVRFJylcbi5jb25zdGFudCgnTU9OSVRfU1RBVFVTX1VQREFURScsICdNT05JVF9TVEFUVVNfVVBEQVRFJylcbi5jb25zdGFudCgnV0FJVElOR19UQVNLU19VUERBVEUnLCAnV0FJVElOR19UQVNLU19VUERBVEUnKVxuLmNvbnN0YW50KCdXT1JLRVJTX1VQREFURScsICdXT1JLRVJTX1VQREFURScpXG5cbi5zZXJ2aWNlICdtb25pdFN0YXR1cycsIChcbiAgICAgICAgJGxvZywgJHJvb3RTY29wZSwgc3dIdHRwSGVscGVyLCBzd1dlYlNvY2tldCwgY29uZmlnLFxuICAgICAgICBNT05JVF9TQ0hFRFVMRV9VUERBVEUsIE1PTklUX1NUQVRVU19VUERBVEUsIFdBSVRJTkdfVEFTS1NfVVBEQVRFLCBXT1JLRVJTX1VQREFURSkgLT5cbiAgICBzdGF0dXMgPSBbXVxuICAgIHdhaXRpbmcgPSBbXVxuICAgIHdvcmtlcnMgPSBbXVxuXG4gICAgdXBkYXRlU3RhdHVzID0gKHN0YXR1c0l0ZW0pIC0+XG4gICAgICAgIGZvciBpdGVtLCBpIGluIHN0YXR1c1xuICAgICAgICAgICAgaWYgaXRlbS5tb25pdF9uYW1lID09IHN0YXR1c0l0ZW0ubW9uaXRfbmFtZSBcXFxuICAgICAgICAgICAgICAgIGFuZCBpdGVtLmhvc3RfYWRkcmVzcyA9PSBzdGF0dXNJdGVtLmhvc3RfYWRkcmVzcyBcXFxuICAgICAgICAgICAgICAgIGFuZCBpdGVtLnNjaGVkdWxlX2lkID09IHN0YXR1c0l0ZW0uc2NoZWR1bGVfaWRcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzW2ldID0gc3RhdHVzSXRlbVxuICAgICAgICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgc3RhdHVzLnB1c2goc3RhdHVzSXRlbSlcblxuICAgIHVwZGF0ZVdhaXRpbmcgPSAod2FpdGluZ1Rhc2tzKSAtPlxuICAgICAgICB3YWl0aW5nLmxlbmd0aCA9IDBcbiAgICAgICAgZm9yIHRhc2sgaW4gd2FpdGluZ1Rhc2tzXG4gICAgICAgICAgICB3YWl0aW5nLnB1c2godGFzaylcblxuICAgIHVwZGF0ZVdvcmtlcnMgPSAoY3VycmVudFdvcmtlcnMpIC0+XG4gICAgICAgIHdvcmtlcnMubGVuZ3RoID0gMFxuICAgICAgICBmb3Igd29ya2VyIGluIGN1cnJlbnRXb3JrZXJzXG4gICAgICAgICAgICB3b3JrZXJzLnB1c2god29ya2VyKVxuXG4gICAgc3Vic2NyaWJlTW9uaXRTdGF0dXMgPSAtPlxuICAgICAgICBzb2NrZXQgPSBuZXcgc3dXZWJTb2NrZXQoXCIjeyBjb25maWcud3NTZXJ2ZXJBZGRyZXNzIH0vbW9uaXRzXCIpXG5cbiAgICAgICAgc29ja2V0Lm9uTWVzc2FnZSAobXNnKSAtPlxuICAgICAgICAgICAgc3RhdHVzSXRlbSA9IEpTT04ucGFyc2UobXNnKVxuICAgICAgICAgICAgdXBkYXRlU3RhdHVzKHN0YXR1c0l0ZW0pXG4jICAgICAgICAgICAgJGxvZy5kZWJ1ZyhzdGF0dXNJdGVtKVxuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KE1PTklUX1NUQVRVU19VUERBVEUsIHN0YXR1cylcblxuICAgICAgICBkdXJhYmxlID0gdHJ1ZVxuICAgICAgICBzb2NrZXQuc3RhcnQoZHVyYWJsZSlcbiMgICAgICAgICRsb2cuZGVidWcoJ3N0YXJ0IHN1YnNjcmliZU1vbml0U3RhdHVzJylcblxuXG4gICAgc3Vic2NyaWJlTW9uaXRTY2hlZHVsZSA9IC0+XG4gICAgICAgIHNvY2tldCA9IG5ldyBzd1dlYlNvY2tldChcIiN7IGNvbmZpZy53c1NlcnZlckFkZHJlc3MgfS9tb25pdF9zY2hlZHVsZXNcIilcblxuICAgICAgICBzb2NrZXQub25NZXNzYWdlIChtc2cpIC0+XG4gICAgICAgICAgICBtb25pdFNjaGVkdWxlID0gSlNPTi5wYXJzZShtc2cpXG4jICAgICAgICAgICAgJGxvZy5kZWJ1Zygnc3Vic2NyaWJlTW9uaXRTY2hlZHVsZScsIG1vbml0U2NoZWR1bGUpXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoTU9OSVRfU0NIRURVTEVfVVBEQVRFLCBtb25pdFNjaGVkdWxlKVxuXG4gICAgICAgIGR1cmFibGUgPSB0cnVlXG4gICAgICAgIHNvY2tldC5zdGFydChkdXJhYmxlKVxuXG5cbiAgICBzdWJzY3JpYmVXYWl0aW5nVGFza3MgPSAtPlxuICAgICAgICBzb2NrZXQgPSBuZXcgc3dXZWJTb2NrZXQoXCIjeyBjb25maWcud3NTZXJ2ZXJBZGRyZXNzIH0vd2FpdGluZ190YXNrc1wiKVxuXG4gICAgICAgIHNvY2tldC5vbk1lc3NhZ2UgKG1zZykgLT5cbiAgICAgICAgICAgIHdhaXRpbmdUYXNrcyA9IEpTT04ucGFyc2UobXNnKS53YWl0aW5nX3Rhc2tzXG4gICAgICAgICAgICB1cGRhdGVXYWl0aW5nKHdhaXRpbmdUYXNrcylcbiMgICAgICAgICAgICAkbG9nLmRlYnVnKCdzdWJzY3JpYmVXYWl0aW5nVGFza3MnLCB3YWl0aW5nVGFza3MpXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoV0FJVElOR19UQVNLU19VUERBVEUsIHdhaXRpbmcpXG5cbiAgICAgICAgZHVyYWJsZSA9IHRydWVcbiAgICAgICAgc29ja2V0LnN0YXJ0KGR1cmFibGUpXG5cblxuICAgIHN1YnNjcmliZVdvcmtlcnNUYXNrcyA9IC0+XG4gICAgICAgIHNvY2tldCA9IG5ldyBzd1dlYlNvY2tldChcIiN7IGNvbmZpZy53c1NlcnZlckFkZHJlc3MgfS9jdXJyZW50X3dvcmtlcnNcIilcblxuICAgICAgICBzb2NrZXQub25NZXNzYWdlIChtc2cpIC0+XG4gICAgICAgICAgICBjdXJyZW50V29ya2VycyA9IEpTT04ucGFyc2UobXNnKS5jdXJyZW50X3dvcmtlcnNcbiAgICAgICAgICAgIHVwZGF0ZVdvcmtlcnMoY3VycmVudFdvcmtlcnMpXG4jICAgICAgICAgICAgJGxvZy5kZWJ1Zygnc3Vic2NyaWJlV29ya2Vyc1Rhc2tzJywgY3VycmVudFdvcmtlcnMpXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoV09SS0VSU19VUERBVEUsIHdvcmtlcnMpXG5cbiAgICAgICAgZHVyYWJsZSA9IHRydWVcbiAgICAgICAgc29ja2V0LnN0YXJ0KGR1cmFibGUpXG5cblxuICAgIHRoaXMuc3RhcnQgPSAtPlxuIyAgICAgICAgJGxvZy5pbmZvICdzdGFydCBNb25pdFN0YXR1cydcbiAgICAgICAgdGhpcy5nZXRMYXRlc3QoKS50aGVuKHN1YnNjcmliZU1vbml0U3RhdHVzKVxuICAgICAgICBzdWJzY3JpYmVNb25pdFNjaGVkdWxlKClcbiAgICAgICAgc3Vic2NyaWJlV2FpdGluZ1Rhc2tzKClcbiAgICAgICAgc3Vic2NyaWJlV29ya2Vyc1Rhc2tzKClcblxuICAgIHRoaXMuZ2V0TGF0ZXN0ID0gLT5cbiAgICAgICAgcmV0dXJuIHN3SHR0cEhlbHBlci5nZXQoXCIjeyBjb25maWcuc2VydmVyQWRkcmVzcyB9L21vbml0X3N0YXR1c19sYXRlc3QvXCIpLnRoZW4gKHJlc3BvbnNlKSAtPlxuICAgICAgICAgICAgc3RhdHVzLmxlbmd0aCA9IDBcbiAgICAgICAgICAgIGZvciBpdGVtIGluIHJlc3BvbnNlLmRhdGEubW9uaXRfc3RhdHVzX2xhdGVzdFxuICAgICAgICAgICAgICAgIHN0YXR1cy5wdXNoKGl0ZW0pXG5cbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChNT05JVF9TVEFUVVNfVVBEQVRFLCBzdGF0dXMpXG5cbiAgICAgICAgICAgIHJldHVybiBzdGF0dXNcblxuICAgIHRoaXMuZ2V0U3RhdHVzID0gLT5cbiAgICAgICAgcmV0dXJuIHN0YXR1c1xuXG4gICAgdGhpcy5nZXRXYWl0aW5nID0gLT5cbiAgICAgICAgcmV0dXJuIHdhaXRpbmdcblxuICAgIHRoaXMuZ2V0V29ya2VycyA9IC0+XG4gICAgICAgIHJldHVybiB3b3JrZXJzXG5cbiAgICByZXR1cm4gdGhpcyJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==

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
  angular.module('parkKeeper').controller('MainCtrl', function($scope, $log, $timeout, $uibModal, swWebSocket, monitStatus, MONIT_STATUS_UPDATE, MONIT_SCHEDULE_UPDATE, MonitScheduleCollection) {
    var scheduleCollection;
    scheduleCollection = new MonitScheduleCollection();
    scheduleCollection.loadAll();
    scheduleCollection.startWatch();
    $scope.$on('$destroy', scheduleCollection.stopWatch);
    $scope.monitSchedules = scheduleCollection.schedules;
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
  }).factory('MonitSchedule', function($log) {
    var MonitSchedule;
    MonitSchedule = (function() {
      function MonitSchedule(data) {
        this.latestStatusDt = void 0;
        this.latestStatusLevel = void 0;
        angular.extend(this, data || {});
      }

      MonitSchedule.prototype.getLabel = function() {
        return this.name || this.monit.name;
      };

      MonitSchedule.prototype.update = function(data) {
        return angular.extend(this, data || {});
      };

      MonitSchedule.prototype.updateHostsStatus = function(statuses) {
        var host, j, len, results, statusItem;
        results = [];
        for (j = 0, len = statuses.length; j < len; j++) {
          statusItem = statuses[j];
          if (statusItem.schedule_id !== this.id) {
            continue;
          }
          host = this.getHost(statusItem.host_address);
          if (!host) {
            continue;
          }
          this.latestStatusLevel = void 0;
          if (statusItem.result_dt) {
            statusItem.result_dt = moment(statusItem.result_dt).toDate();
          }
          host.status = statusItem;
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
        var host, j, len, ref;
        ref = this.all_hosts;
        for (j = 0, len = ref.length; j < len; j++) {
          host = ref[j];
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
  }).factory('MonitScheduleCollection', function($log, $rootScope, MonitSchedule, MonitScheduleResource, monitStatus, MONIT_STATUS_UPDATE, MONIT_SCHEDULE_UPDATE) {
    var MonitScheduleCollection;
    MonitScheduleCollection = (function() {
      function MonitScheduleCollection() {
        this.schedules = [];
        this.statusListener = void 0;
        this.scheduleListener = void 0;
      }

      MonitScheduleCollection.prototype.loadAll = function() {
        var schedulesData;
        this.schedules.length = 0;
        return schedulesData = MonitScheduleResource.query((function(_this) {
          return function() {
            var itemData, j, len, schedule;
            for (j = 0, len = schedulesData.length; j < len; j++) {
              itemData = schedulesData[j];
              schedule = new MonitSchedule(itemData);
              _this.schedules.push(schedule);
            }
            return _this._updateStatuses();
          };
        })(this));
      };

      MonitScheduleCollection.prototype.startWatch = function() {
        this.statusListener = $rootScope.$on(MONIT_STATUS_UPDATE, (function(_this) {
          return function() {
            return _this._updateStatuses();
          };
        })(this));
        return this.scheduleListener = $rootScope.$on(MONIT_SCHEDULE_UPDATE, (function(_this) {
          return function(e, data) {
            return _this._processScheduleEvent(e, data);
          };
        })(this));
      };

      MonitScheduleCollection.prototype.stopWatch = function() {
        if (this.statusListener) {
          this.statusListener();
          this.statusListener = void 0;
        }
        if (this.scheduleListener) {
          this.scheduleListener();
          return this.scheduleListener = void 0;
        }
      };

      MonitScheduleCollection.prototype.getIndex = function(scheduleId) {
        var i, j, len, ref, schedule;
        ref = this.schedules;
        for (i = j = 0, len = ref.length; j < len; i = ++j) {
          schedule = ref[i];
          if (schedule.id === scheduleId) {
            return i;
          }
        }
      };

      MonitScheduleCollection.prototype.getSchedule = function(scheduleId) {
        var index, schedule;
        index = this.getIndex(scheduleId);
        schedule = this.schedules[index];
        return schedule;
      };

      MonitScheduleCollection.prototype._updateStatuses = function() {
        var j, len, ref, results, schedule;
        ref = this.schedules;
        results = [];
        for (j = 0, len = ref.length; j < len; j++) {
          schedule = ref[j];
          results.push(schedule.updateHostsStatus(monitStatus.getStatus()));
        }
        return results;
      };

      MonitScheduleCollection.prototype._processScheduleEvent = function(e, data) {
        if (data.event === 'create' || data.event === 'update') {
          this._updateSchedule(data.instance);
        } else if (data.event === 'delete') {
          this._deleteSchedule(data.instance);
        } else {
          $log.error('Unexpected monitScheduleListener data', data);
        }
        return this._updateStatuses();
      };

      MonitScheduleCollection.prototype._updateSchedule = function(scheduleData) {
        var new_schedule, schedule;
        schedule = this.getSchedule(scheduleData.id);
        if (schedule) {
          schedule.update(scheduleData);
        } else {
          new_schedule = new MonitSchedule(scheduleData);
          this.schedules.push(new_schedule);
        }
        return $log.debug('_updateSchedule');
      };

      MonitScheduleCollection.prototype._deleteSchedule = function(scheduleData) {
        var index;
        index = this.getIndex(scheduleData.id);
        if (index) {
          this.schedules.splice(index, 1);
        }
        return $log.debug('_deleteSchedule');
      };

      return MonitScheduleCollection;

    })();
    return MonitScheduleCollection;
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

(function() {
  angular.module('parkKeeper').controller('MonitScheduleLatestResultsCtrl', function($scope, $log, $timeout, monitStatus, MONIT_STATUS_UPDATE, MONIT_SCHEDULE_UPDATE, MonitSchedule) {});

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9hcHAuY29mZmVlIiwiYXBwL2NvbmZpZy5jb2ZmZWUiLCJhcHAvaW50ZXJjZXB0b3JzLmNvZmZlZSIsImFwcC9jb250cm9sbGVycy9tYWluLmNvZmZlZSIsImFwcC9jb250cm9sbGVycy9tb25pdF90YXNrc19tb2RhbC5jb2ZmZWUiLCJhcHAvcmVzb3VyY2VzL2hvc3QuY29mZmVlIiwiYXBwL3Jlc291cmNlcy9ob3N0X2dyb3VwLmNvZmZlZSIsImFwcC9yZXNvdXJjZXMvbW9uaXRfc2NoZWR1bGUuY29mZmVlIiwiYXBwL3Jlc291cmNlcy9tb25pdF9zdGF0dXMuY29mZmVlIiwiYXBwL2NvbnRyb2xsZXJzL21vbml0X3NjaGVkdWxlL2xhdGVzdF9yZXN1bHRzLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtFQUFBLE9BQU8sQ0FBQyxNQUFSLENBQWUsWUFBZixFQUE2QixDQUN6QixZQUR5QixFQUV6QixZQUZ5QixFQUd6QixTQUh5QixFQUl6QixXQUp5QixFQU16QixnQkFOeUIsRUFPekIsY0FQeUIsRUFTekIsU0FUeUIsRUFVekIsYUFWeUIsRUFXekIsUUFYeUIsQ0FBN0IsQ0FjQSxDQUFDLE1BZEQsQ0FjUSxTQUFDLGNBQUQ7V0FDSixjQUNBLENBQUMsSUFERCxDQUNNLEdBRE4sRUFFRTtNQUFBLFdBQUEsRUFBYSx1QkFBYjtNQUNBLFVBQUEsRUFBWSxVQURaO01BRUEsS0FBQSxFQUFPLEVBRlA7S0FGRixDQU9BLENBQUMsSUFQRCxDQU9NLFNBUE4sRUFRSTtNQUFBLFdBQUEsRUFBYSx3QkFBYjtNQUNBLFVBQUEsRUFBWSxlQURaO01BRUEsS0FBQSxFQUFPLE9BRlA7S0FSSixDQVlBLENBQUMsSUFaRCxDQVlNLFVBWk4sRUFhSTtNQUFBLFdBQUEsRUFBYSx5QkFBYjtNQUNBLFVBQUEsRUFBWSxnQkFEWjtNQUVBLEtBQUEsRUFBTyxRQUZQO0tBYko7RUFESSxDQWRSLENBaUNBLENBQUMsR0FqQ0QsQ0FpQ0ssU0FBQyxTQUFELEVB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YUFBVCxHQUF3Qix1QkFBM0MsQ0FBa0UsQ0FBQyxJQUFuRSxDQUF3RSxTQUFDLFFBQUQ7QUFDM0UsWUFBQTtRQUFBLE1BQU0sQ0FBQyxNQUFQLEdBQWdCO0FBQ2hCO0FBQUEsYUFBQSxxQ0FBQTs7VUFDSSxNQUFNLENBQUMsSUFBUCxDQUFZLElBQVo7QUFESjtRQUdBLFVBQVUsQ0FBQyxVQUFYLENBQXNCLG1CQUF0QixFQUEyQyxNQUEzQztBQUVBLGVBQU87TUFQb0UsQ0FBeEU7SUFETTtJQVVqQixJQUFJLENBQUMsU0FBTCxHQUFpQixTQUFBO0FBQ2IsYUFBTztJQURNO0lBR2pCLElBQUksQ0FBQyxVQUFMLEdBQWtCLFNBQUE7QUFDZCxhQUFPO0lBRE87SUFHbEIsSUFBSSxDQUFDLFVBQUwsR0FBa0IsU0FBQTtBQUNkLGFBQU87SUFETztBQUdsQixXQUFPO0VBeEdhLENBUHhCO0FBQUE7OztBQ0FBO0VBQUEsT0FBTyxDQUFDLE1BQVIsQ0FBZSxZQUFmLENBQ0EsQ0FBQyxVQURELENBQ1ksZ0NBRFosRUFDOEMsU0FBQyxNQUFELEVBQVMsSUFBVCxFQUFlLFFBQWYsRUFBeUIsV0FBekIsRUFDMUMsbUJBRDBDLEVBQ3JCLHFCQURxQixFQUNFLGFBREYsR0FBQSxDQUQ5QztBQUFBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbImFuZ3VsYXIubW9kdWxlKCdwYXJrS2VlcGVyJywgW1xuICAgICduZ1Jlc291cmNlJ1xuICAgICduZ1Nhbml0aXplJ1xuICAgICduZ1JvdXRlJ1xuICAgICduZ0FuaW1hdGUnXG5cbiAgICAnYW5ndWxhci5maWx0ZXInXG4gICAgJ3VpLmJvb3RzdHJhcCdcblxuICAgICdzd1V0aWxzJ1xuICAgICdzd1dlYlNvY2tldCdcbiAgICAnc3dBdXRoJ1xuXSlcblxuLmNvbmZpZyAoJHJvdXRlUHJvdmlkZXIpIC0+XG4gICAgJHJvdXRlUHJvdmlkZXJcbiAgICAud2hlbignLycsXG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbnRyb2xsZXJzL21haW4uaHRtbCdcbiAgICAgIGNvbnRyb2xsZXI6ICdNYWluQ3RybCdcbiAgICAgIGxhYmVsOiAnJ1xuICAgIClcblxuICAgIC53aGVuKCcvbG9naW4vJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdjb250cm9sbGVycy9sb2dpbi5odG1sJ1xuICAgICAgICBjb250cm9sbGVyOiAnQXV0aExvZ2luQ3RybCdcbiAgICAgICAgbGFiZWw6ICdMb2dpbidcbiAgICApXG4gICAgLndoZW4oJy9sb2dvdXQvJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdjb250cm9sbGVycy9sb2dvdXQuaHRtbCdcbiAgICAgICAgY29udHJvbGxlcjogJ0F1dGhMb2dvdXRDdHJsJ1xuICAgICAgICBsYWJlbDogJ0xvZ291dCdcbiAgICApXG5cbi5ydW4gKCRsb2NhdGlvbiwgJHJvb3RTY29wZSwgc3dUaXRsZSkgLT5cbiAgICAkcm9vdFNjb3BlLnN3VGl0bGUgPSBzd1RpdGxlXG4gICAgJHJvb3RTY29wZS4kb24gJyRyb3V0ZUNoYW5nZVN1Y2Nlc3MnLCAoZXZlbnQsIGN1cnJlbnQsIHByZXZpb3VzKSAtPlxuICAgICAgICBiYXNlVGl0bGUgPSBjdXJyZW50LiQkcm91dGU/LmxhYmVsIG9yICcnXG4gICAgICAgIHN3VGl0bGUuc2V0VGl0bGVCYXNlKGJhc2VUaXRsZSlcbiAgICAgICAgc3dUaXRsZS5zZXRUaXRsZVN0YXJ0KCcnKVxuICAgICAgICBzd1RpdGxlLnNldFRpdGxlRW5kKCcnKVxuXG4ucnVuIChtb25pdFN0YXR1cykgLT5cbiAgICBtb25pdFN0YXR1cy5zdGFydCgpXG5cbi5jb25maWcgKGF1dGhDb25maWdQcm92aWRlciwgY29uZmlnKSAtPlxuICAgIGF1dGhDb25maWdQcm92aWRlci5zZXRTeXN0ZW1MYWJlbCgncGFya0tlZXBlcicpXG4gICAgYXV0aENvbmZpZ1Byb3ZpZGVyLnNldFNlcnZlckFkZHJlc3MoY29uZmlnLnNlcnZlckFkZHJlc3MpXG4gICAgYXV0aENvbmZpZ1Byb3ZpZGVyLnNldEZyZWVVcmxzKFtdKVxuXG4uY29uZmlnICgkaHR0cFByb3ZpZGVyKSAtPlxuICAgICRodHRwUHJvdmlkZXIuZGVmYXVsdHMuaGVhZGVycy5wb3N0WydDb250ZW50LVR5cGUnXSA9ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnIiwiYW5ndWxhci5tb2R1bGUoJ3BhcmtLZWVwZXInKVxuICAgIC5jb25zdGFudCgnY29uZmlnJywge1xuIyAgICAgICAgc2VydmVyQWRkcmVzczogJ2h0dHA6Ly8xMjcuMC4wLjE6ODA4MCcsXG4gICAgICAgIHNlcnZlckFkZHJlc3M6ICcnLFxuICAgICAgICB3c1NlcnZlckFkZHJlc3M6ICd3czovLzEyNy4wLjAuMTo4MDgxJyxcbiAgICB9KSIsImFuZ3VsYXIubW9kdWxlKCdwYXJrS2VlcGVyJylcblxuIyBpbnRlcmNlcHRvciA1MDAgc3RhdHVzIGVycm9yXG4uY29uZmlnICgkaHR0cFByb3ZpZGVyKSAtPlxuICAgICRodHRwUHJvdmlkZXIuaW50ZXJjZXB0b3JzLnB1c2goJ3NlcnZlckVycm9ySW50ZXJjZXB0b3InKVxuXG4uZmFjdG9yeSAnc2VydmVyRXJyb3JJbnRlcmNlcHRvcicsICgkbG9jYXRpb24sICRxLCAkbG9nKSAtPlxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzcG9uc2VFcnJvcjogKHJlc3BvbnNlKSAtPlxuICAgICAgICAgICAgICAgIGlmIHJlc3BvbnNlLnN0YXR1cyA9PSAwIG9yIChyZXNwb25zZS5zdGF0dXMgPj0gNTAwIGFuZCByZXNwb25zZS5zdGF0dXMgPD0gNjAwKVxuICAgICAgICAgICAgICAgICAgICAkbG9nLmVycm9yKHJlc3BvbnNlKVxuIyAgICAgICAgICAgICAgICAgICAgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2Uuc3RhdHVzVGV4dCBvciAnJ1xuIyAgICAgICAgICAgICAgICAgICAgdG9hc3Rlci5wb3AoJ2Vycm9yJywgJ9Ce0YjQuNCx0LrQsCDRgdC10YDQstC10YDQsCcsIGVycm9yTWVzc2FnZSlcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlKVxuXG4gICAgICAgIH0iLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG4uY29udHJvbGxlciAnTWFpbkN0cmwnLCAoJHNjb3BlLCAkbG9nLCAkdGltZW91dCwgJHVpYk1vZGFsLCBzd1dlYlNvY2tldCxcbiAgICAgICAgICAgICAgICAgICAgICAgICBtb25pdFN0YXR1cywgTU9OSVRfU1RBVFVTX1VQREFURSwgTU9OSVRfU0NIRURVTEVfVVBEQVRFLCBNb25pdFNjaGVkdWxlQ29sbGVjdGlvbikgLT5cblxuICAgIHNjaGVkdWxlQ29sbGVjdGlvbiA9IG5ldyBNb25pdFNjaGVkdWxlQ29sbGVjdGlvbigpXG4gICAgc2NoZWR1bGVDb2xsZWN0aW9uLmxvYWRBbGwoKVxuICAgIHNjaGVkdWxlQ29sbGVjdGlvbi5zdGFydFdhdGNoKClcbiAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsIHNjaGVkdWxlQ29sbGVjdGlvbi5zdG9wV2F0Y2gpXG4gICAgJHNjb3BlLm1vbml0U2NoZWR1bGVzID0gc2NoZWR1bGVDb2xsZWN0aW9uLnNjaGVkdWxlc1xuXG4gICAgJHNjb3BlLndhaXRpbmdUYXNrcyA9IG1vbml0U3RhdHVzLmdldFdhaXRpbmcoKVxuICAgICRzY29wZS5tb25pdFdvcmtlcnMgPSBtb25pdFN0YXR1cy5nZXRXb3JrZXJzKClcblxuXG4gICAgJHNjb3BlLm9wZW5UYXNrID0gKHRhc2tzKSAtPlxuICAgICAgICBpZiBub3QgdGFza3MubGVuZ3RoXG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgJHVpYk1vZGFsLm9wZW4oe1xuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdjb250cm9sbGVycy9tb25pdF90YXNrc19tb2RhbC5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdNb25pdFRhc2tzTW9kYWxDdHJsJyxcbiAgICAgICAgICAgIHNpemU6ICdsZycsXG4gICAgICAgICAgICByZXNvbHZlOlxuICAgICAgICAgICAgICAgIHRhc2tzOiAtPiB0YXNrc1xuICAgICAgICB9KSIsImFuZ3VsYXIubW9kdWxlKCdwYXJrS2VlcGVyJylcbi5jb250cm9sbGVyICdNb25pdFRhc2tzTW9kYWxDdHJsJywgKCRzY29wZSwgJHVpYk1vZGFsSW5zdGFuY2UsIHRhc2tzKSAtPlxuICAgICRzY29wZS50YXNrcyA9IHRhc2tzXG5cbiAgICAkc2NvcGUuY2FuY2VsID0gLT5cbiAgICAgICAgJHVpYk1vZGFsSW5zdGFuY2UuZGlzbWlzcygnY2FuY2VsJykiLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG5cbi5mYWN0b3J5ICdIb3N0UmVzb3VyY2UnLCAoJHJlc291cmNlLCBjb25maWcpIC0+XG4gICAgdXJsID0gXCIjeyBjb25maWcuc2VydmVyQWRkcmVzcyB9L2hvc3QvOmlkL1wiXG4gICAgcmV0dXJuICRyZXNvdXJjZSh1cmwpXG5cblxuIy5mYWN0b3J5ICdIb3N0U3RhdHVzJywgLT5cbiMgICAgY2xhc3MgSG9zdFN0YXR1c1xuIyAgICAgICAgbW9uaXROYW1lOiB1bmRlZmluZWRcbiMgICAgICAgIGR0OiB1bmRlZmluZWRcbiMgICAgICAgIGV4dHJhOiB1bmRlZmluZWRcbiMgICAgICAgIGlzU3VjY2VzczogdW5kZWZpbmVkXG4jXG4jICAgICAgICBjb25zdHJ1Y3RvcjogKGRhdGEpIC0+XG4jICAgICAgICAgICAgYW5ndWxhci5leHRlbmQodGhpcywgZGF0YSBvciB7fSlcbiNcbiMgICAgcmV0dXJuIEhvc3RTdGF0dXMiLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG5cbi5mYWN0b3J5ICdIb3N0R3JvdXBSZXNvdXJjZScsICgkcmVzb3VyY2UsIGNvbmZpZykgLT5cbiAgICB1cmwgPSBcIiN7IGNvbmZpZy5zZXJ2ZXJBZGRyZXNzIH0vaG9zdF9ncm91cC86aWQvXCJcbiAgICByZXR1cm4gJHJlc291cmNlKHVybCkiLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG5cbi5mYWN0b3J5ICdNb25pdFNjaGVkdWxlUmVzb3VyY2UnLCAoJHJlc291cmNlLCBjb25maWcpIC0+XG4gICAgdXJsID0gXCIjeyBjb25maWcuc2VydmVyQWRkcmVzcyB9L21vbml0X3NjaGVkdWxlLzppZC9cIlxuICAgIHJldHVybiAkcmVzb3VyY2UodXJsKVxuXG5cbi5mYWN0b3J5ICdNb25pdFNjaGVkdWxlJywgKCRsb2cpIC0+XG4gICAgY2xhc3MgTW9uaXRTY2hlZHVsZVxuXG4gICAgICAgIGNvbnN0cnVjdG9yOiAoZGF0YSkgLT5cbiAgICAgICAgICAgIHRoaXMubGF0ZXN0U3RhdHVzRHQgPSB1bmRlZmluZWRcbiAgICAgICAgICAgIHRoaXMubGF0ZXN0U3RhdHVzTGV2ZWwgPSB1bmRlZmluZWRcbiAgICAgICAgICAgIGFuZ3VsYXIuZXh0ZW5kKHRoaXMsIGRhdGEgb3Ige30pXG5cbiAgICAgICAgZ2V0TGFiZWw6IC0+XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5uYW1lIG9yIHRoaXMubW9uaXQubmFtZVxuXG4gICAgICAgIHVwZGF0ZTogKGRhdGEpIC0+XG4gICAgICAgICAgICBhbmd1bGFyLmV4dGVuZCh0aGlzLCBkYXRhIG9yIHt9KVxuXG4gICAgICAgIHVwZGF0ZUhvc3RzU3RhdHVzOiAoc3RhdHVzZXMpIC0+XG4gICAgICAgICAgICBmb3Igc3RhdHVzSXRlbSBpbiBzdGF0dXNlc1xuICAgICAgICAgICAgICAgIGlmIHN0YXR1c0l0ZW0uc2NoZWR1bGVfaWQgIT0gdGhpcy5pZFxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZVxuXG4gICAgICAgICAgICAgICAgaG9zdCA9IHRoaXMuZ2V0SG9zdChzdGF0dXNJdGVtLmhvc3RfYWRkcmVzcylcbiAgICAgICAgICAgICAgICBpZiBub3QgaG9zdFxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZVxuXG4gICAgICAgICAgICAgICAgdGhpcy5sYXRlc3RTdGF0dXNMZXZlbCA9IHVuZGVmaW5lZFxuXG4gICAgICAgICAgICAgICAgaWYgc3RhdHVzSXRlbS5yZXN1bHRfZHRcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzSXRlbS5yZXN1bHRfZHQgPSBtb21lbnQoc3RhdHVzSXRlbS5yZXN1bHRfZHQpLnRvRGF0ZSgpXG5cbiAgICAgICAgICAgICAgICBob3N0LnN0YXR1cyA9IHN0YXR1c0l0ZW1cbiAgICAgICAgICAgICAgICBpZiBub3QgdGhpcy5sYXRlc3RTdGF0dXNEdCBvciBob3N0LnN0YXR1cy5yZXN1bHRfZHQgPiB0aGlzLmxhdGVzdFN0YXR1c0R0XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGF0ZXN0U3RhdHVzRHQgPSBob3N0LnN0YXR1cy5yZXN1bHRfZHRcblxuICAgICAgICAgICAgICAgIGlmIG5vdCB0aGlzLmxhdGVzdFN0YXR1c0xldmVsIG9yIHRoaXMubGF0ZXN0U3RhdHVzTGV2ZWwgPCBob3N0LnN0YXR1cy5sZXZlbFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxhdGVzdFN0YXR1c0xldmVsID0gaG9zdC5zdGF0dXMubGV2ZWxcblxuICAgICAgICAgICAgICAgIGlmIG5vdCB0aGlzLmxhdGVzdFN0YXR1c0R0IG9yIHRoaXMubGF0ZXN0U3RhdHVzRHQgPCBob3N0LnN0YXR1cy5yZXN1bHRfZHRcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sYXRlc3RTdGF0dXNEdCA9IGhvc3Quc3RhdHVzLnJlc3VsdF9kdFxuXG4gICAgICAgIGdldEhvc3Q6IChob3N0QWRkcmVzcykgLT5cbiAgICAgICAgICAgIGZvciBob3N0IGluIHRoaXMuYWxsX2hvc3RzXG4gICAgICAgICAgICAgICAgaWYgaG9zdC5hZGRyZXNzID09IGhvc3RBZGRyZXNzXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBob3N0XG5cbiAgICAgICAgaXNVbmRlZmluZWQ6IC0+XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5sYXRlc3RTdGF0dXNMZXZlbCA9PSB1bmRlZmluZWRcbiAgICAgICAgaXNPazogLT5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxhdGVzdFN0YXR1c0xldmVsID09IDFcbiAgICAgICAgaXNXYXJuaW5nOiAtPlxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubGF0ZXN0U3RhdHVzTGV2ZWwgPT0gMlxuICAgICAgICBpc0ZhaWw6IC0+XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5sYXRlc3RTdGF0dXNMZXZlbCA9PSAzXG5cbiAgICAgICAgaXNGcmVzaDogLT5cbiAgICAgICAgICAgIGRlYWRsaW5lID0gbW9tZW50KCkuc3VidHJhY3QodGhpcy5wZXJpb2QgKiAyLCAnc2Vjb25kcycpLnRvRGF0ZSgpXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5sYXRlc3RTdGF0dXNEdCA+IGRlYWRsaW5lXG5cbiAgICByZXR1cm4gTW9uaXRTY2hlZHVsZVxuXG5cbi5mYWN0b3J5ICdNb25pdFNjaGVkdWxlQ29sbGVjdGlvbicsICgkbG9nLCAkcm9vdFNjb3BlLCBNb25pdFNjaGVkdWxlLCBNb25pdFNjaGVkdWxlUmVzb3VyY2UsIG1vbml0U3RhdHVzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBNT05JVF9TVEFUVVNfVVBEQVRFLCBNT05JVF9TQ0hFRFVMRV9VUERBVEUpIC0+XG4gICAgY2xhc3MgTW9uaXRTY2hlZHVsZUNvbGxlY3Rpb25cblxuICAgICAgICBjb25zdHJ1Y3RvcjogLT5cbiAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVzID0gW11cbiAgICAgICAgICAgIHRoaXMuc3RhdHVzTGlzdGVuZXIgPSB1bmRlZmluZWRcbiAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVMaXN0ZW5lciA9IHVuZGVmaW5lZFxuXG4gICAgICAgIGxvYWRBbGw6IC0+XG4gICAgICAgICAgICB0aGlzLnNjaGVkdWxlcy5sZW5ndGggPSAwXG4gICAgICAgICAgICBzY2hlZHVsZXNEYXRhID0gTW9uaXRTY2hlZHVsZVJlc291cmNlLnF1ZXJ5ID0+XG4gICAgICAgICAgICAgICAgZm9yIGl0ZW1EYXRhIGluIHNjaGVkdWxlc0RhdGFcbiAgICAgICAgICAgICAgICAgICAgc2NoZWR1bGUgPSBuZXcgTW9uaXRTY2hlZHVsZShpdGVtRGF0YSlcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zY2hlZHVsZXMucHVzaChzY2hlZHVsZSlcbiAgICAgICAgICAgICAgICB0aGlzLl91cGRhdGVTdGF0dXNlcygpXG5cbiAgICAgICAgc3RhcnRXYXRjaDogLT5cbiAgICAgICAgICAgIHRoaXMuc3RhdHVzTGlzdGVuZXIgPSAkcm9vdFNjb3BlLiRvbihNT05JVF9TVEFUVVNfVVBEQVRFLCA9PiB0aGlzLl91cGRhdGVTdGF0dXNlcygpKVxuICAgICAgICAgICAgdGhpcy5zY2hlZHVsZUxpc3RlbmVyID0gJHJvb3RTY29wZS4kb24oTU9OSVRfU0NIRURVTEVfVVBEQVRFLCAoZSwgZGF0YSkgPT4gdGhpcy5fcHJvY2Vzc1NjaGVkdWxlRXZlbnQoZSwgZGF0YSkpXG5cbiAgICAgICAgc3RvcFdhdGNoOiAtPlxuICAgICAgICAgICAgaWYgdGhpcy5zdGF0dXNMaXN0ZW5lclxuICAgICAgICAgICAgICAgIHRoaXMuc3RhdHVzTGlzdGVuZXIoKVxuICAgICAgICAgICAgICAgIHRoaXMuc3RhdHVzTGlzdGVuZXIgPSB1bmRlZmluZWRcblxuICAgICAgICAgICAgaWYgdGhpcy5zY2hlZHVsZUxpc3RlbmVyXG4gICAgICAgICAgICAgICAgdGhpcy5zY2hlZHVsZUxpc3RlbmVyKClcbiAgICAgICAgICAgICAgICB0aGlzLnNjaGVkdWxlTGlzdGVuZXIgPSB1bmRlZmluZWRcblxuICAgICAgICBnZXRJbmRleDogKHNjaGVkdWxlSWQpIC0+XG4gICAgICAgICAgICBmb3Igc2NoZWR1bGUsIGkgaW4gdGhpcy5zY2hlZHVsZXNcbiAgICAgICAgICAgICAgICBpZiBzY2hlZHVsZS5pZCA9PSBzY2hlZHVsZUlkXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpXG5cbiAgICAgICAgZ2V0U2NoZWR1bGU6IChzY2hlZHVsZUlkKSAtPlxuICAgICAgICAgICAgaW5kZXggPSB0aGlzLmdldEluZGV4KHNjaGVkdWxlSWQpXG4gICAgICAgICAgICBzY2hlZHVsZSA9IHRoaXMuc2NoZWR1bGVzW2luZGV4XVxuICAgICAgICAgICAgcmV0dXJuIHNjaGVkdWxlXG5cbiAgICAgICAgX3VwZGF0ZVN0YXR1c2VzOiAtPlxuICAgICAgICAgICAgZm9yIHNjaGVkdWxlIGluIHRoaXMuc2NoZWR1bGVzXG4gICAgICAgICAgICAgICAgc2NoZWR1bGUudXBkYXRlSG9zdHNTdGF0dXMobW9uaXRTdGF0dXMuZ2V0U3RhdHVzKCkpXG5cbiAgICAgICAgX3Byb2Nlc3NTY2hlZHVsZUV2ZW50OiAoZSwgZGF0YSkgLT5cbiAgICAgICAgICAgIGlmIGRhdGEuZXZlbnQgPT0gJ2NyZWF0ZScgb3IgZGF0YS5ldmVudCA9PSAndXBkYXRlJ1xuICAgICAgICAgICAgICAgIHRoaXMuX3VwZGF0ZVNjaGVkdWxlKGRhdGEuaW5zdGFuY2UpXG4gICAgICAgICAgICBlbHNlIGlmIGRhdGEuZXZlbnQgPT0gJ2RlbGV0ZSdcbiAgICAgICAgICAgICAgICB0aGlzLl9kZWxldGVTY2hlZHVsZShkYXRhLmluc3RhbmNlKVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICRsb2cuZXJyb3IoJ1VuZXhwZWN0ZWQgbW9uaXRTY2hlZHVsZUxpc3RlbmVyIGRhdGEnLCBkYXRhKVxuICAgICAgICAgICAgdGhpcy5fdXBkYXRlU3RhdHVzZXMoKVxuXG4gICAgICAgIF91cGRhdGVTY2hlZHVsZTogKHNjaGVkdWxlRGF0YSkgLT5cbiAgICAgICAgICAgIHNjaGVkdWxlID0gdGhpcy5nZXRTY2hlZHVsZShzY2hlZHVsZURhdGEuaWQpXG4gICAgICAgICAgICBpZiBzY2hlZHVsZVxuICAgICAgICAgICAgICAgIHNjaGVkdWxlLnVwZGF0ZShzY2hlZHVsZURhdGEpXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgbmV3X3NjaGVkdWxlID0gbmV3IE1vbml0U2NoZWR1bGUoc2NoZWR1bGVEYXRhKVxuICAgICAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVzLnB1c2gobmV3X3NjaGVkdWxlKVxuICAgICAgICAgICAgJGxvZy5kZWJ1ZygnX3VwZGF0ZVNjaGVkdWxlJylcblxuICAgICAgICBfZGVsZXRlU2NoZWR1bGU6IChzY2hlZHVsZURhdGEpIC0+XG4gICAgICAgICAgICBpbmRleCA9IHRoaXMuZ2V0SW5kZXgoc2NoZWR1bGVEYXRhLmlkKVxuICAgICAgICAgICAgaWYgaW5kZXhcbiAgICAgICAgICAgICAgICB0aGlzLnNjaGVkdWxlcy5zcGxpY2UoaW5kZXgsIDEpXG4gICAgICAgICAgICAkbG9nLmRlYnVnKCdfZGVsZXRlU2NoZWR1bGUnKVxuXG4gICAgcmV0dXJuIE1vbml0U2NoZWR1bGVDb2xsZWN0aW9uXG4iLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG5cbi5jb25zdGFudCgnTU9OSVRfU0NIRURVTEVfVVBEQVRFJywgJ01PTklUX1NDSEVEVUxFX1VQREFURScpXG4uY29uc3RhbnQoJ01PTklUX1NUQVRVU19VUERBVEUnLCAnTU9OSVRfU1RBVFVTX1VQREFURScpXG4uY29uc3RhbnQoJ1dBSVRJTkdfVEFTS1NfVVBEQVRFJywgJ1dBSVRJTkdfVEFTS1NfVVBEQVRFJylcbi5jb25zdGFudCgnV09SS0VSU19VUERBVEUnLCAnV09SS0VSU19VUERBVEUnKVxuXG4uc2VydmljZSAnbW9uaXRTdGF0dXMnLCAoXG4gICAgICAgICRsb2csICRyb290U2NvcGUsIHN3SHR0cEhlbHBlciwgc3dXZWJTb2NrZXQsIGNvbmZpZyxcbiAgICAgICAgTU9OSVRfU0NIRURVTEVfVVBEQVRFLCBNT05JVF9TVEFUVVNfVVBEQVRFLCBXQUlUSU5HX1RBU0tTX1VQREFURSwgV09SS0VSU19VUERBVEUpIC0+XG4gICAgc3RhdHVzID0gW11cbiAgICB3YWl0aW5nID0gW11cbiAgICB3b3JrZXJzID0gW11cblxuICAgIHVwZGF0ZVN0YXR1cyA9IChzdGF0dXNJdGVtKSAtPlxuICAgICAgICBmb3IgaXRlbSwgaSBpbiBzdGF0dXNcbiAgICAgICAgICAgIGlmIGl0ZW0ubW9uaXRfbmFtZSA9PSBzdGF0dXNJdGVtLm1vbml0X25hbWUgXFxcbiAgICAgICAgICAgICAgICBhbmQgaXRlbS5ob3N0X2FkZHJlc3MgPT0gc3RhdHVzSXRlbS5ob3N0X2FkZHJlc3MgXFxcbiAgICAgICAgICAgICAgICBhbmQgaXRlbS5zY2hlZHVsZV9pZCA9PSBzdGF0dXNJdGVtLnNjaGVkdWxlX2lkXG4gICAgICAgICAgICAgICAgICAgIHN0YXR1c1tpXSA9IHN0YXR1c0l0ZW1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgIHN0YXR1cy5wdXNoKHN0YXR1c0l0ZW0pXG5cbiAgICB1cGRhdGVXYWl0aW5nID0gKHdhaXRpbmdUYXNrcykgLT5cbiAgICAgICAgd2FpdGluZy5sZW5ndGggPSAwXG4gICAgICAgIGZvciB0YXNrIGluIHdhaXRpbmdUYXNrc1xuICAgICAgICAgICAgd2FpdGluZy5wdXNoKHRhc2spXG5cbiAgICB1cGRhdGVXb3JrZXJzID0gKGN1cnJlbnRXb3JrZXJzKSAtPlxuICAgICAgICB3b3JrZXJzLmxlbmd0aCA9IDBcbiAgICAgICAgZm9yIHdvcmtlciBpbiBjdXJyZW50V29ya2Vyc1xuICAgICAgICAgICAgd29ya2Vycy5wdXNoKHdvcmtlcilcblxuICAgIHN1YnNjcmliZU1vbml0U3RhdHVzID0gLT5cbiAgICAgICAgc29ja2V0ID0gbmV3IHN3V2ViU29ja2V0KFwiI3sgY29uZmlnLndzU2VydmVyQWRkcmVzcyB9L21vbml0c1wiKVxuXG4gICAgICAgIHNvY2tldC5vbk1lc3NhZ2UgKG1zZykgLT5cbiAgICAgICAgICAgIHN0YXR1c0l0ZW0gPSBKU09OLnBhcnNlKG1zZylcbiAgICAgICAgICAgIHVwZGF0ZVN0YXR1cyhzdGF0dXNJdGVtKVxuIyAgICAgICAgICAgICRsb2cuZGVidWcoc3RhdHVzSXRlbSlcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChNT05JVF9TVEFUVVNfVVBEQVRFLCBzdGF0dXMpXG5cbiAgICAgICAgZHVyYWJsZSA9IHRydWVcbiAgICAgICAgc29ja2V0LnN0YXJ0KGR1cmFibGUpXG4jICAgICAgICAkbG9nLmRlYnVnKCdzdGFydCBzdWJzY3JpYmVNb25pdFN0YXR1cycpXG5cblxuICAgIHN1YnNjcmliZU1vbml0U2NoZWR1bGUgPSAtPlxuICAgICAgICBzb2NrZXQgPSBuZXcgc3dXZWJTb2NrZXQoXCIjeyBjb25maWcud3NTZXJ2ZXJBZGRyZXNzIH0vbW9uaXRfc2NoZWR1bGVzXCIpXG5cbiAgICAgICAgc29ja2V0Lm9uTWVzc2FnZSAobXNnKSAtPlxuICAgICAgICAgICAgbW9uaXRTY2hlZHVsZSA9IEpTT04ucGFyc2UobXNnKVxuIyAgICAgICAgICAgICRsb2cuZGVidWcoJ3N1YnNjcmliZU1vbml0U2NoZWR1bGUnLCBtb25pdFNjaGVkdWxlKVxuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KE1PTklUX1NDSEVEVUxFX1VQREFURSwgbW9uaXRTY2hlZHVsZSlcblxuICAgICAgICBkdXJhYmxlID0gdHJ1ZVxuICAgICAgICBzb2NrZXQuc3RhcnQoZHVyYWJsZSlcblxuXG4gICAgc3Vic2NyaWJlV2FpdGluZ1Rhc2tzID0gLT5cbiAgICAgICAgc29ja2V0ID0gbmV3IHN3V2ViU29ja2V0KFwiI3sgY29uZmlnLndzU2VydmVyQWRkcmVzcyB9L3dhaXRpbmdfdGFza3NcIilcblxuICAgICAgICBzb2NrZXQub25NZXNzYWdlIChtc2cpIC0+XG4gICAgICAgICAgICB3YWl0aW5nVGFza3MgPSBKU09OLnBhcnNlKG1zZykud2FpdGluZ190YXNrc1xuICAgICAgICAgICAgdXBkYXRlV2FpdGluZyh3YWl0aW5nVGFza3MpXG4jICAgICAgICAgICAgJGxvZy5kZWJ1Zygnc3Vic2NyaWJlV2FpdGluZ1Rhc2tzJywgd2FpdGluZ1Rhc2tzKVxuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KFdBSVRJTkdfVEFTS1NfVVBEQVRFLCB3YWl0aW5nKVxuXG4gICAgICAgIGR1cmFibGUgPSB0cnVlXG4gICAgICAgIHNvY2tldC5zdGFydChkdXJhYmxlKVxuXG5cbiAgICBzdWJzY3JpYmVXb3JrZXJzVGFza3MgPSAtPlxuICAgICAgICBzb2NrZXQgPSBuZXcgc3dXZWJTb2NrZXQoXCIjeyBjb25maWcud3NTZXJ2ZXJBZGRyZXNzIH0vY3VycmVudF93b3JrZXJzXCIpXG5cbiAgICAgICAgc29ja2V0Lm9uTWVzc2FnZSAobXNnKSAtPlxuICAgICAgICAgICAgY3VycmVudFdvcmtlcnMgPSBKU09OLnBhcnNlKG1zZykuY3VycmVudF93b3JrZXJzXG4gICAgICAgICAgICB1cGRhdGVXb3JrZXJzKGN1cnJlbnRXb3JrZXJzKVxuIyAgICAgICAgICAgICRsb2cuZGVidWcoJ3N1YnNjcmliZVdvcmtlcnNUYXNrcycsIGN1cnJlbnRXb3JrZXJzKVxuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KFdPUktFUlNfVVBEQVRFLCB3b3JrZXJzKVxuXG4gICAgICAgIGR1cmFibGUgPSB0cnVlXG4gICAgICAgIHNvY2tldC5zdGFydChkdXJhYmxlKVxuXG5cbiAgICB0aGlzLnN0YXJ0ID0gLT5cbiMgICAgICAgICRsb2cuaW5mbyAnc3RhcnQgTW9uaXRTdGF0dXMnXG4gICAgICAgIHRoaXMuZ2V0TGF0ZXN0KCkudGhlbihzdWJzY3JpYmVNb25pdFN0YXR1cylcbiAgICAgICAgc3Vic2NyaWJlTW9uaXRTY2hlZHVsZSgpXG4gICAgICAgIHN1YnNjcmliZVdhaXRpbmdUYXNrcygpXG4gICAgICAgIHN1YnNjcmliZVdvcmtlcnNUYXNrcygpXG5cbiAgICB0aGlzLmdldExhdGVzdCA9IC0+XG4gICAgICAgIHJldHVybiBzd0h0dHBIZWxwZXIuZ2V0KFwiI3sgY29uZmlnLnNlcnZlckFkZHJlc3MgfS9tb25pdF9zdGF0dXNfbGF0ZXN0L1wiKS50aGVuIChyZXNwb25zZSkgLT5cbiAgICAgICAgICAgIHN0YXR1cy5sZW5ndGggPSAwXG4gICAgICAgICAgICBmb3IgaXRlbSBpbiByZXNwb25zZS5kYXRhLm1vbml0X3N0YXR1c19sYXRlc3RcbiAgICAgICAgICAgICAgICBzdGF0dXMucHVzaChpdGVtKVxuXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoTU9OSVRfU1RBVFVTX1VQREFURSwgc3RhdHVzKVxuXG4gICAgICAgICAgICByZXR1cm4gc3RhdHVzXG5cbiAgICB0aGlzLmdldFN0YXR1cyA9IC0+XG4gICAgICAgIHJldHVybiBzdGF0dXNcblxuICAgIHRoaXMuZ2V0V2FpdGluZyA9IC0+XG4gICAgICAgIHJldHVybiB3YWl0aW5nXG5cbiAgICB0aGlzLmdldFdvcmtlcnMgPSAtPlxuICAgICAgICByZXR1cm4gd29ya2Vyc1xuXG4gICAgcmV0dXJuIHRoaXMiLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG4uY29udHJvbGxlciAnTW9uaXRTY2hlZHVsZUxhdGVzdFJlc3VsdHNDdHJsJywgKCRzY29wZSwgJGxvZywgJHRpbWVvdXQsIG1vbml0U3RhdHVzLFxuICAgIE1PTklUX1NUQVRVU19VUERBVEUsIE1PTklUX1NDSEVEVUxFX1VQREFURSwgTW9uaXRTY2hlZHVsZSkgLT5cbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==

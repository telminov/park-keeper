(function() {
  angular.module('parkKeeper', ['ngResource', 'ngSanitize', 'ngRoute', 'ngAnimate', 'angular.filter', 'ui.bootstrap', 'swUtils', 'swWebSocket', 'swAuth']).config(function($routeProvider) {
    return $routeProvider.when('/', {
      templateUrl: 'controllers/main.html',
      controller: 'MainCtrl',
      label: ''
    }).when('/monit_schedule/:id/latest_result/', {
      templateUrl: 'controllers/monit_schedule/latest_results.html',
      controller: 'MonitScheduleLatestResultsCtrl',
      label: 'latest results'
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
  angular.module('parkKeeper').controller('MainCtrl', function($scope, $log, $uibModal, monitStatus, MonitScheduleCollection) {
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
  }).factory('MonitSchedule', function($log, monitStatus, MonitScheduleResource) {
    var MonitSchedule;
    MonitSchedule = (function() {
      MonitSchedule.load = function(id) {
        var schedule, scheduleData;
        schedule = new MonitSchedule();
        scheduleData = MonitScheduleResource.get({
          id: id
        }, function() {
          schedule = schedule.update(scheduleData);
          return schedule.updateHostsStatus();
        });
        return schedule;
      };

      function MonitSchedule(data) {
        this.latestStatusDt = void 0;
        this.latestStatusLevel = void 0;
        angular.extend(this, data || {});
      }

      MonitSchedule.prototype.getLabel = function() {
        var ref;
        return this.name || ((ref = this.monit) != null ? ref.name : void 0);
      };

      MonitSchedule.prototype.update = function(data) {
        return angular.extend(this, data || {});
      };

      MonitSchedule.prototype.updateHostsStatus = function() {
        var host, j, len, ref, results, statusItem;
        ref = monitStatus.getStatus();
        results = [];
        for (j = 0, len = ref.length; j < len; j++) {
          statusItem = ref[j];
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

      MonitSchedule.prototype.getLevelLabel = function() {
        if (this.isUndefined()) {
          return 'Undefined';
        } else if (this.isOk()) {
          return 'Ok';
        } else if (this.isWarning()) {
          return 'Warning';
        } else if (this.isFail()) {
          return 'Fail';
        }
      };

      MonitSchedule.prototype.isFresh = function() {
        var deadline;
        deadline = moment().subtract(this.period * 2, 'seconds').toDate();
        return this.latestStatusDt > deadline;
      };

      return MonitSchedule;

    })();
    return MonitSchedule;
  }).factory('MonitScheduleCollection', function($log, $rootScope, MonitSchedule, MonitScheduleResource, MONIT_STATUS_UPDATE, MONIT_SCHEDULE_UPDATE) {
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
          results.push(schedule.updateHostsStatus());
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
  angular.module('parkKeeper').controller('MonitScheduleLatestResultsCtrl', function($scope, $routeParams, $log, $uibModal, MonitSchedule, MONIT_STATUS_UPDATE) {
    var statusListener;
    $scope.schedule = MonitSchedule.load($routeParams.id);
    statusListener = $scope.$on(MONIT_STATUS_UPDATE, function() {
      return $scope.schedule.updateHostsStatus();
    });
    return $scope.$on('$destroy', statusListener);
  });

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9hcHAuY29mZmVlIiwiYXBwL2NvbmZpZy5jb2ZmZWUiLCJhcHAvaW50ZXJjZXB0b3JzLmNvZmZlZSIsImFwcC9jb250cm9sbGVycy9tYWluLmNvZmZlZSIsImFwcC9jb250cm9sbGVycy9tb25pdF90YXNrc19tb2RhbC5jb2ZmZWUiLCJhcHAvcmVzb3VyY2VzL2hvc3QuY29mZmVlIiwiYXBwL3Jlc291cmNlcy9ob3N0X2dyb3VwLmNvZmZlZSIsImFwcC9yZXNvdXJjZXMvbW9uaXRfc2NoZWR1bGUuY29mZmVlIiwiYXBwL3Jlc291cmNlcy9tb25pdF9zdGF0dXMuY29mZmVlIiwiYXBwL2NvbnRyb2xsZXJzL21vbml0X3NjaGVkdWxlL2xhdGVzdF9yZXN1bHRzLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtFQUFBLE9BQU8sQ0FBQyxNQUFSLENBQWUsWUFBZixFQUE2QixDQUN6QixZQUR5QixFQUV6QixZQUZ5QixFQUd6QixTQUh5QixFQUl6QixXQUp5QixFQU16QixnQkFOeUIsRUFPekIsY0FQeUIsRUFTekIsU0FUeUIsRUFVekIsYUFWeUIsRUFXekIsUUFYeUIsQ0FBN0IsQ0FjQSxDQUFDLE1BZEQsQ0FjUSxTQUFDLGNBQUQ7V0FDSixjQUNBLENBQUMsSUFERCxDQUNNLEdBRE4sRUFFRTtNQUFBLFdBQUEsRUFBYSx1QkFBYjtNQUNBLFVBQUEsRUFBWSxVQURaO01BRUEsS0FBQSxFQUFPLEVBRlA7S0FGRixDQU9BLENBQUMsSUFQRCxDQU9NLG9DQVBOLEVBUUU7TUFBQSxXQUFBLEVBQWEsZ0RBQWI7TUFDQSxVQUFBLEVBQVksZ0NBRFo7TUFFQSxLQUFBLEVBQU8sZ0JBRlA7S0FSRixDQWFBLENBQUMsSUFiRCxDQWFNLFNBYk4sRUFjSTtNQUFBLFdBQUEsRUFBYSx3QkFBYjtNQUNBLFVBQUEsRUFBWSxlQURaO01BRUEsS0FBQSxFQUFPLE9BRlA7S0FkSixDQWtCQSxDQUFDLElBbEJELENBa0JNLFVBbEJOLEVBbUJJO01BQUEsV0FB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LFdBQU87RUF4R2EsQ0FQeEI7QUFBQTs7O0FDQUE7RUFBQSxPQUFPLENBQUMsTUFBUixDQUFlLFlBQWYsQ0FDQSxDQUFDLFVBREQsQ0FDWSxnQ0FEWixFQUM4QyxTQUFDLE1BQUQsRUFBUyxZQUFULEVBQXVCLElBQXZCLEVBQTZCLFNBQTdCLEVBQ0UsYUFERixFQUNpQixtQkFEakI7QUFFMUMsUUFBQTtJQUFBLE1BQU0sQ0FBQyxRQUFQLEdBQWtCLGFBQWEsQ0FBQyxJQUFkLENBQW1CLFlBQVksQ0FBQyxFQUFoQztJQUVsQixjQUFBLEdBQWlCLE1BQU0sQ0FBQyxHQUFQLENBQVcsbUJBQVgsRUFBZ0MsU0FBQTthQUM3QyxNQUFNLENBQUMsUUFBUSxDQUFDLGlCQUFoQixDQUFBO0lBRDZDLENBQWhDO1dBR2pCLE1BQU0sQ0FBQyxHQUFQLENBQVcsVUFBWCxFQUF1QixjQUF2QjtFQVAwQyxDQUQ5QztBQUFBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbImFuZ3VsYXIubW9kdWxlKCdwYXJrS2VlcGVyJywgW1xuICAgICduZ1Jlc291cmNlJ1xuICAgICduZ1Nhbml0aXplJ1xuICAgICduZ1JvdXRlJ1xuICAgICduZ0FuaW1hdGUnXG5cbiAgICAnYW5ndWxhci5maWx0ZXInXG4gICAgJ3VpLmJvb3RzdHJhcCdcblxuICAgICdzd1V0aWxzJ1xuICAgICdzd1dlYlNvY2tldCdcbiAgICAnc3dBdXRoJ1xuXSlcblxuLmNvbmZpZyAoJHJvdXRlUHJvdmlkZXIpIC0+XG4gICAgJHJvdXRlUHJvdmlkZXJcbiAgICAud2hlbignLycsXG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbnRyb2xsZXJzL21haW4uaHRtbCdcbiAgICAgIGNvbnRyb2xsZXI6ICdNYWluQ3RybCdcbiAgICAgIGxhYmVsOiAnJ1xuICAgIClcblxuICAgIC53aGVuKCcvbW9uaXRfc2NoZWR1bGUvOmlkL2xhdGVzdF9yZXN1bHQvJyxcbiAgICAgIHRlbXBsYXRlVXJsOiAnY29udHJvbGxlcnMvbW9uaXRfc2NoZWR1bGUvbGF0ZXN0X3Jlc3VsdHMuaHRtbCdcbiAgICAgIGNvbnRyb2xsZXI6ICdNb25pdFNjaGVkdWxlTGF0ZXN0UmVzdWx0c0N0cmwnXG4gICAgICBsYWJlbDogJ2xhdGVzdCByZXN1bHRzJ1xuICAgIClcblxuICAgIC53aGVuKCcvbG9naW4vJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdjb250cm9sbGVycy9sb2dpbi5odG1sJ1xuICAgICAgICBjb250cm9sbGVyOiAnQXV0aExvZ2luQ3RybCdcbiAgICAgICAgbGFiZWw6ICdMb2dpbidcbiAgICApXG4gICAgLndoZW4oJy9sb2dvdXQvJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdjb250cm9sbGVycy9sb2dvdXQuaHRtbCdcbiAgICAgICAgY29udHJvbGxlcjogJ0F1dGhMb2dvdXRDdHJsJ1xuICAgICAgICBsYWJlbDogJ0xvZ291dCdcbiAgICApXG5cbi5ydW4gKCRsb2NhdGlvbiwgJHJvb3RTY29wZSwgc3dUaXRsZSkgLT5cbiAgICAkcm9vdFNjb3BlLnN3VGl0bGUgPSBzd1RpdGxlXG4gICAgJHJvb3RTY29wZS4kb24gJyRyb3V0ZUNoYW5nZVN1Y2Nlc3MnLCAoZXZlbnQsIGN1cnJlbnQsIHByZXZpb3VzKSAtPlxuICAgICAgICBiYXNlVGl0bGUgPSBjdXJyZW50LiQkcm91dGU/LmxhYmVsIG9yICcnXG4gICAgICAgIHN3VGl0bGUuc2V0VGl0bGVCYXNlKGJhc2VUaXRsZSlcbiAgICAgICAgc3dUaXRsZS5zZXRUaXRsZVN0YXJ0KCcnKVxuICAgICAgICBzd1RpdGxlLnNldFRpdGxlRW5kKCcnKVxuXG4ucnVuIChtb25pdFN0YXR1cykgLT5cbiAgICBtb25pdFN0YXR1cy5zdGFydCgpXG5cbi5jb25maWcgKGF1dGhDb25maWdQcm92aWRlciwgY29uZmlnKSAtPlxuICAgIGF1dGhDb25maWdQcm92aWRlci5zZXRTeXN0ZW1MYWJlbCgncGFya0tlZXBlcicpXG4gICAgYXV0aENvbmZpZ1Byb3ZpZGVyLnNldFNlcnZlckFkZHJlc3MoY29uZmlnLnNlcnZlckFkZHJlc3MpXG4gICAgYXV0aENvbmZpZ1Byb3ZpZGVyLnNldEZyZWVVcmxzKFtdKVxuXG4uY29uZmlnICgkaHR0cFByb3ZpZGVyKSAtPlxuICAgICRodHRwUHJvdmlkZXIuZGVmYXVsdHMuaGVhZGVycy5wb3N0WydDb250ZW50LVR5cGUnXSA9ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnIiwiYW5ndWxhci5tb2R1bGUoJ3BhcmtLZWVwZXInKVxuICAgIC5jb25zdGFudCgnY29uZmlnJywge1xuIyAgICAgICAgc2VydmVyQWRkcmVzczogJ2h0dHA6Ly8xMjcuMC4wLjE6ODA4MCcsXG4gICAgICAgIHNlcnZlckFkZHJlc3M6ICcnLFxuICAgICAgICB3c1NlcnZlckFkZHJlc3M6ICd3czovLzEyNy4wLjAuMTo4MDgxJyxcbiAgICB9KSIsImFuZ3VsYXIubW9kdWxlKCdwYXJrS2VlcGVyJylcblxuIyBpbnRlcmNlcHRvciA1MDAgc3RhdHVzIGVycm9yXG4uY29uZmlnICgkaHR0cFByb3ZpZGVyKSAtPlxuICAgICRodHRwUHJvdmlkZXIuaW50ZXJjZXB0b3JzLnB1c2goJ3NlcnZlckVycm9ySW50ZXJjZXB0b3InKVxuXG4uZmFjdG9yeSAnc2VydmVyRXJyb3JJbnRlcmNlcHRvcicsICgkbG9jYXRpb24sICRxLCAkbG9nKSAtPlxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzcG9uc2VFcnJvcjogKHJlc3BvbnNlKSAtPlxuICAgICAgICAgICAgICAgIGlmIHJlc3BvbnNlLnN0YXR1cyA9PSAwIG9yIChyZXNwb25zZS5zdGF0dXMgPj0gNTAwIGFuZCByZXNwb25zZS5zdGF0dXMgPD0gNjAwKVxuICAgICAgICAgICAgICAgICAgICAkbG9nLmVycm9yKHJlc3BvbnNlKVxuIyAgICAgICAgICAgICAgICAgICAgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2Uuc3RhdHVzVGV4dCBvciAnJ1xuIyAgICAgICAgICAgICAgICAgICAgdG9hc3Rlci5wb3AoJ2Vycm9yJywgJ9Ce0YjQuNCx0LrQsCDRgdC10YDQstC10YDQsCcsIGVycm9yTWVzc2FnZSlcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlKVxuXG4gICAgICAgIH0iLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG4uY29udHJvbGxlciAnTWFpbkN0cmwnLCAoJHNjb3BlLCAkbG9nLCAkdWliTW9kYWwsIG1vbml0U3RhdHVzLCBNb25pdFNjaGVkdWxlQ29sbGVjdGlvbikgLT5cblxuICAgIHNjaGVkdWxlQ29sbGVjdGlvbiA9IG5ldyBNb25pdFNjaGVkdWxlQ29sbGVjdGlvbigpXG4gICAgc2NoZWR1bGVDb2xsZWN0aW9uLmxvYWRBbGwoKVxuICAgIHNjaGVkdWxlQ29sbGVjdGlvbi5zdGFydFdhdGNoKClcbiAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsIHNjaGVkdWxlQ29sbGVjdGlvbi5zdG9wV2F0Y2gpXG4gICAgJHNjb3BlLm1vbml0U2NoZWR1bGVzID0gc2NoZWR1bGVDb2xsZWN0aW9uLnNjaGVkdWxlc1xuXG4gICAgJHNjb3BlLndhaXRpbmdUYXNrcyA9IG1vbml0U3RhdHVzLmdldFdhaXRpbmcoKVxuICAgICRzY29wZS5tb25pdFdvcmtlcnMgPSBtb25pdFN0YXR1cy5nZXRXb3JrZXJzKClcblxuXG4gICAgJHNjb3BlLm9wZW5UYXNrID0gKHRhc2tzKSAtPlxuICAgICAgICBpZiBub3QgdGFza3MubGVuZ3RoXG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgJHVpYk1vZGFsLm9wZW4oe1xuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdjb250cm9sbGVycy9tb25pdF90YXNrc19tb2RhbC5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdNb25pdFRhc2tzTW9kYWxDdHJsJyxcbiAgICAgICAgICAgIHNpemU6ICdsZycsXG4gICAgICAgICAgICByZXNvbHZlOlxuICAgICAgICAgICAgICAgIHRhc2tzOiAtPiB0YXNrc1xuICAgICAgICB9KSIsImFuZ3VsYXIubW9kdWxlKCdwYXJrS2VlcGVyJylcbi5jb250cm9sbGVyICdNb25pdFRhc2tzTW9kYWxDdHJsJywgKCRzY29wZSwgJHVpYk1vZGFsSW5zdGFuY2UsIHRhc2tzKSAtPlxuICAgICRzY29wZS50YXNrcyA9IHRhc2tzXG5cbiAgICAkc2NvcGUuY2FuY2VsID0gLT5cbiAgICAgICAgJHVpYk1vZGFsSW5zdGFuY2UuZGlzbWlzcygnY2FuY2VsJykiLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG5cbi5mYWN0b3J5ICdIb3N0UmVzb3VyY2UnLCAoJHJlc291cmNlLCBjb25maWcpIC0+XG4gICAgdXJsID0gXCIjeyBjb25maWcuc2VydmVyQWRkcmVzcyB9L2hvc3QvOmlkL1wiXG4gICAgcmV0dXJuICRyZXNvdXJjZSh1cmwpXG5cblxuIy5mYWN0b3J5ICdIb3N0U3RhdHVzJywgLT5cbiMgICAgY2xhc3MgSG9zdFN0YXR1c1xuIyAgICAgICAgbW9uaXROYW1lOiB1bmRlZmluZWRcbiMgICAgICAgIGR0OiB1bmRlZmluZWRcbiMgICAgICAgIGV4dHJhOiB1bmRlZmluZWRcbiMgICAgICAgIGlzU3VjY2VzczogdW5kZWZpbmVkXG4jXG4jICAgICAgICBjb25zdHJ1Y3RvcjogKGRhdGEpIC0+XG4jICAgICAgICAgICAgYW5ndWxhci5leHRlbmQodGhpcywgZGF0YSBvciB7fSlcbiNcbiMgICAgcmV0dXJuIEhvc3RTdGF0dXMiLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG5cbi5mYWN0b3J5ICdIb3N0R3JvdXBSZXNvdXJjZScsICgkcmVzb3VyY2UsIGNvbmZpZykgLT5cbiAgICB1cmwgPSBcIiN7IGNvbmZpZy5zZXJ2ZXJBZGRyZXNzIH0vaG9zdF9ncm91cC86aWQvXCJcbiAgICByZXR1cm4gJHJlc291cmNlKHVybCkiLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG5cbi5mYWN0b3J5ICdNb25pdFNjaGVkdWxlUmVzb3VyY2UnLCAoJHJlc291cmNlLCBjb25maWcpIC0+XG4gICAgdXJsID0gXCIjeyBjb25maWcuc2VydmVyQWRkcmVzcyB9L21vbml0X3NjaGVkdWxlLzppZC9cIlxuICAgIHJldHVybiAkcmVzb3VyY2UodXJsKVxuXG5cbi5mYWN0b3J5ICdNb25pdFNjaGVkdWxlJywgKCRsb2csIG1vbml0U3RhdHVzLCBNb25pdFNjaGVkdWxlUmVzb3VyY2UpIC0+XG4gICAgY2xhc3MgTW9uaXRTY2hlZHVsZVxuXG4gICAgICAgIEBsb2FkOiAoaWQpIC0+XG4gICAgICAgICAgICBzY2hlZHVsZSA9IG5ldyBNb25pdFNjaGVkdWxlKClcbiAgICAgICAgICAgIHNjaGVkdWxlRGF0YSA9IE1vbml0U2NoZWR1bGVSZXNvdXJjZS5nZXQge2lkOiBpZH0sIC0+XG4gICAgICAgICAgICAgICAgc2NoZWR1bGUgPSBzY2hlZHVsZS51cGRhdGUoc2NoZWR1bGVEYXRhKVxuICAgICAgICAgICAgICAgIHNjaGVkdWxlLnVwZGF0ZUhvc3RzU3RhdHVzKClcbiAgICAgICAgICAgIHJldHVybiBzY2hlZHVsZVxuXG4gICAgICAgIGNvbnN0cnVjdG9yOiAoZGF0YSkgLT5cbiAgICAgICAgICAgIHRoaXMubGF0ZXN0U3RhdHVzRHQgPSB1bmRlZmluZWRcbiAgICAgICAgICAgIHRoaXMubGF0ZXN0U3RhdHVzTGV2ZWwgPSB1bmRlZmluZWRcbiAgICAgICAgICAgIGFuZ3VsYXIuZXh0ZW5kKHRoaXMsIGRhdGEgb3Ige30pXG5cbiAgICAgICAgZ2V0TGFiZWw6IC0+XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5uYW1lIG9yIHRoaXMubW9uaXQ/Lm5hbWVcblxuICAgICAgICB1cGRhdGU6IChkYXRhKSAtPlxuICAgICAgICAgICAgYW5ndWxhci5leHRlbmQodGhpcywgZGF0YSBvciB7fSlcblxuICAgICAgICB1cGRhdGVIb3N0c1N0YXR1czogLT5cbiAgICAgICAgICAgIGZvciBzdGF0dXNJdGVtIGluIG1vbml0U3RhdHVzLmdldFN0YXR1cygpXG4gICAgICAgICAgICAgICAgaWYgc3RhdHVzSXRlbS5zY2hlZHVsZV9pZCAhPSB0aGlzLmlkXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlXG5cbiAgICAgICAgICAgICAgICBob3N0ID0gdGhpcy5nZXRIb3N0KHN0YXR1c0l0ZW0uaG9zdF9hZGRyZXNzKVxuICAgICAgICAgICAgICAgIGlmIG5vdCBob3N0XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlXG5cbiAgICAgICAgICAgICAgICB0aGlzLmxhdGVzdFN0YXR1c0xldmVsID0gdW5kZWZpbmVkXG5cbiAgICAgICAgICAgICAgICBpZiBzdGF0dXNJdGVtLnJlc3VsdF9kdFxuICAgICAgICAgICAgICAgICAgICBzdGF0dXNJdGVtLnJlc3VsdF9kdCA9IG1vbWVudChzdGF0dXNJdGVtLnJlc3VsdF9kdCkudG9EYXRlKClcblxuICAgICAgICAgICAgICAgIGhvc3Quc3RhdHVzID0gc3RhdHVzSXRlbVxuICAgICAgICAgICAgICAgIGlmIG5vdCB0aGlzLmxhdGVzdFN0YXR1c0R0IG9yIGhvc3Quc3RhdHVzLnJlc3VsdF9kdCA+IHRoaXMubGF0ZXN0U3RhdHVzRHRcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sYXRlc3RTdGF0dXNEdCA9IGhvc3Quc3RhdHVzLnJlc3VsdF9kdFxuXG4gICAgICAgICAgICAgICAgaWYgbm90IHRoaXMubGF0ZXN0U3RhdHVzTGV2ZWwgb3IgdGhpcy5sYXRlc3RTdGF0dXNMZXZlbCA8IGhvc3Quc3RhdHVzLmxldmVsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGF0ZXN0U3RhdHVzTGV2ZWwgPSBob3N0LnN0YXR1cy5sZXZlbFxuXG4gICAgICAgICAgICAgICAgaWYgbm90IHRoaXMubGF0ZXN0U3RhdHVzRHQgb3IgdGhpcy5sYXRlc3RTdGF0dXNEdCA8IGhvc3Quc3RhdHVzLnJlc3VsdF9kdFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxhdGVzdFN0YXR1c0R0ID0gaG9zdC5zdGF0dXMucmVzdWx0X2R0XG5cbiAgICAgICAgZ2V0SG9zdDogKGhvc3RBZGRyZXNzKSAtPlxuICAgICAgICAgICAgZm9yIGhvc3QgaW4gdGhpcy5hbGxfaG9zdHNcbiAgICAgICAgICAgICAgICBpZiBob3N0LmFkZHJlc3MgPT0gaG9zdEFkZHJlc3NcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGhvc3RcblxuICAgICAgICBpc1VuZGVmaW5lZDogLT5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxhdGVzdFN0YXR1c0xldmVsID09IHVuZGVmaW5lZFxuICAgICAgICBpc09rOiAtPlxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubGF0ZXN0U3RhdHVzTGV2ZWwgPT0gMVxuICAgICAgICBpc1dhcm5pbmc6IC0+XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5sYXRlc3RTdGF0dXNMZXZlbCA9PSAyXG4gICAgICAgIGlzRmFpbDogLT5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxhdGVzdFN0YXR1c0xldmVsID09IDNcbiAgICAgICAgICAgIFxuICAgICAgICBnZXRMZXZlbExhYmVsOiAtPlxuICAgICAgICAgICAgaWYgdGhpcy5pc1VuZGVmaW5lZCgpXG4gICAgICAgICAgICAgICAgcmV0dXJuICdVbmRlZmluZWQnXG4gICAgICAgICAgICBlbHNlIGlmIHRoaXMuaXNPaygpXG4gICAgICAgICAgICAgICAgcmV0dXJuICdPaydcbiAgICAgICAgICAgIGVsc2UgaWYgdGhpcy5pc1dhcm5pbmcoKVxuICAgICAgICAgICAgICAgIHJldHVybiAnV2FybmluZydcbiAgICAgICAgICAgIGVsc2UgaWYgdGhpcy5pc0ZhaWwoKVxuICAgICAgICAgICAgICAgIHJldHVybiAnRmFpbCdcblxuICAgICAgICBpc0ZyZXNoOiAtPlxuICAgICAgICAgICAgZGVhZGxpbmUgPSBtb21lbnQoKS5zdWJ0cmFjdCh0aGlzLnBlcmlvZCAqIDIsICdzZWNvbmRzJykudG9EYXRlKClcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxhdGVzdFN0YXR1c0R0ID4gZGVhZGxpbmVcblxuICAgIHJldHVybiBNb25pdFNjaGVkdWxlXG5cblxuLmZhY3RvcnkgJ01vbml0U2NoZWR1bGVDb2xsZWN0aW9uJywgKCRsb2csICRyb290U2NvcGUsIE1vbml0U2NoZWR1bGUsIE1vbml0U2NoZWR1bGVSZXNvdXJjZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE1PTklUX1NUQVRVU19VUERBVEUsIE1PTklUX1NDSEVEVUxFX1VQREFURSkgLT5cbiAgICBjbGFzcyBNb25pdFNjaGVkdWxlQ29sbGVjdGlvblxuXG4gICAgICAgIGNvbnN0cnVjdG9yOiAtPlxuICAgICAgICAgICAgdGhpcy5zY2hlZHVsZXMgPSBbXVxuICAgICAgICAgICAgdGhpcy5zdGF0dXNMaXN0ZW5lciA9IHVuZGVmaW5lZFxuICAgICAgICAgICAgdGhpcy5zY2hlZHVsZUxpc3RlbmVyID0gdW5kZWZpbmVkXG5cbiAgICAgICAgbG9hZEFsbDogLT5cbiAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVzLmxlbmd0aCA9IDBcbiAgICAgICAgICAgIHNjaGVkdWxlc0RhdGEgPSBNb25pdFNjaGVkdWxlUmVzb3VyY2UucXVlcnkgPT5cbiAgICAgICAgICAgICAgICBmb3IgaXRlbURhdGEgaW4gc2NoZWR1bGVzRGF0YVxuICAgICAgICAgICAgICAgICAgICBzY2hlZHVsZSA9IG5ldyBNb25pdFNjaGVkdWxlKGl0ZW1EYXRhKVxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNjaGVkdWxlcy5wdXNoKHNjaGVkdWxlKVxuICAgICAgICAgICAgICAgIHRoaXMuX3VwZGF0ZVN0YXR1c2VzKClcblxuICAgICAgICBzdGFydFdhdGNoOiAtPlxuICAgICAgICAgICAgdGhpcy5zdGF0dXNMaXN0ZW5lciA9ICRyb290U2NvcGUuJG9uKE1PTklUX1NUQVRVU19VUERBVEUsID0+IHRoaXMuX3VwZGF0ZVN0YXR1c2VzKCkpXG4gICAgICAgICAgICB0aGlzLnNjaGVkdWxlTGlzdGVuZXIgPSAkcm9vdFNjb3BlLiRvbihNT05JVF9TQ0hFRFVMRV9VUERBVEUsIChlLCBkYXRhKSA9PiB0aGlzLl9wcm9jZXNzU2NoZWR1bGVFdmVudChlLCBkYXRhKSlcblxuICAgICAgICBzdG9wV2F0Y2g6IC0+XG4gICAgICAgICAgICBpZiB0aGlzLnN0YXR1c0xpc3RlbmVyXG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0dXNMaXN0ZW5lcigpXG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0dXNMaXN0ZW5lciA9IHVuZGVmaW5lZFxuXG4gICAgICAgICAgICBpZiB0aGlzLnNjaGVkdWxlTGlzdGVuZXJcbiAgICAgICAgICAgICAgICB0aGlzLnNjaGVkdWxlTGlzdGVuZXIoKVxuICAgICAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVMaXN0ZW5lciA9IHVuZGVmaW5lZFxuXG4gICAgICAgIGdldEluZGV4OiAoc2NoZWR1bGVJZCkgLT5cbiAgICAgICAgICAgIGZvciBzY2hlZHVsZSwgaSBpbiB0aGlzLnNjaGVkdWxlc1xuICAgICAgICAgICAgICAgIGlmIHNjaGVkdWxlLmlkID09IHNjaGVkdWxlSWRcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGlcblxuICAgICAgICBnZXRTY2hlZHVsZTogKHNjaGVkdWxlSWQpIC0+XG4gICAgICAgICAgICBpbmRleCA9IHRoaXMuZ2V0SW5kZXgoc2NoZWR1bGVJZClcbiAgICAgICAgICAgIHNjaGVkdWxlID0gdGhpcy5zY2hlZHVsZXNbaW5kZXhdXG4gICAgICAgICAgICByZXR1cm4gc2NoZWR1bGVcblxuICAgICAgICBfdXBkYXRlU3RhdHVzZXM6IC0+XG4gICAgICAgICAgICBmb3Igc2NoZWR1bGUgaW4gdGhpcy5zY2hlZHVsZXNcbiAgICAgICAgICAgICAgICBzY2hlZHVsZS51cGRhdGVIb3N0c1N0YXR1cygpXG5cbiAgICAgICAgX3Byb2Nlc3NTY2hlZHVsZUV2ZW50OiAoZSwgZGF0YSkgLT5cbiAgICAgICAgICAgIGlmIGRhdGEuZXZlbnQgPT0gJ2NyZWF0ZScgb3IgZGF0YS5ldmVudCA9PSAndXBkYXRlJ1xuICAgICAgICAgICAgICAgIHRoaXMuX3VwZGF0ZVNjaGVkdWxlKGRhdGEuaW5zdGFuY2UpXG4gICAgICAgICAgICBlbHNlIGlmIGRhdGEuZXZlbnQgPT0gJ2RlbGV0ZSdcbiAgICAgICAgICAgICAgICB0aGlzLl9kZWxldGVTY2hlZHVsZShkYXRhLmluc3RhbmNlKVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICRsb2cuZXJyb3IoJ1VuZXhwZWN0ZWQgbW9uaXRTY2hlZHVsZUxpc3RlbmVyIGRhdGEnLCBkYXRhKVxuICAgICAgICAgICAgdGhpcy5fdXBkYXRlU3RhdHVzZXMoKVxuXG4gICAgICAgIF91cGRhdGVTY2hlZHVsZTogKHNjaGVkdWxlRGF0YSkgLT5cbiAgICAgICAgICAgIHNjaGVkdWxlID0gdGhpcy5nZXRTY2hlZHVsZShzY2hlZHVsZURhdGEuaWQpXG4gICAgICAgICAgICBpZiBzY2hlZHVsZVxuICAgICAgICAgICAgICAgIHNjaGVkdWxlLnVwZGF0ZShzY2hlZHVsZURhdGEpXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgbmV3X3NjaGVkdWxlID0gbmV3IE1vbml0U2NoZWR1bGUoc2NoZWR1bGVEYXRhKVxuICAgICAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVzLnB1c2gobmV3X3NjaGVkdWxlKVxuICAgICAgICAgICAgJGxvZy5kZWJ1ZygnX3VwZGF0ZVNjaGVkdWxlJylcblxuICAgICAgICBfZGVsZXRlU2NoZWR1bGU6IChzY2hlZHVsZURhdGEpIC0+XG4gICAgICAgICAgICBpbmRleCA9IHRoaXMuZ2V0SW5kZXgoc2NoZWR1bGVEYXRhLmlkKVxuICAgICAgICAgICAgaWYgaW5kZXhcbiAgICAgICAgICAgICAgICB0aGlzLnNjaGVkdWxlcy5zcGxpY2UoaW5kZXgsIDEpXG4gICAgICAgICAgICAkbG9nLmRlYnVnKCdfZGVsZXRlU2NoZWR1bGUnKVxuXG4gICAgcmV0dXJuIE1vbml0U2NoZWR1bGVDb2xsZWN0aW9uXG4iLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG5cbi5jb25zdGFudCgnTU9OSVRfU0NIRURVTEVfVVBEQVRFJywgJ01PTklUX1NDSEVEVUxFX1VQREFURScpXG4uY29uc3RhbnQoJ01PTklUX1NUQVRVU19VUERBVEUnLCAnTU9OSVRfU1RBVFVTX1VQREFURScpXG4uY29uc3RhbnQoJ1dBSVRJTkdfVEFTS1NfVVBEQVRFJywgJ1dBSVRJTkdfVEFTS1NfVVBEQVRFJylcbi5jb25zdGFudCgnV09SS0VSU19VUERBVEUnLCAnV09SS0VSU19VUERBVEUnKVxuXG4uc2VydmljZSAnbW9uaXRTdGF0dXMnLCAoXG4gICAgICAgICRsb2csICRyb290U2NvcGUsIHN3SHR0cEhlbHBlciwgc3dXZWJTb2NrZXQsIGNvbmZpZyxcbiAgICAgICAgTU9OSVRfU0NIRURVTEVfVVBEQVRFLCBNT05JVF9TVEFUVVNfVVBEQVRFLCBXQUlUSU5HX1RBU0tTX1VQREFURSwgV09SS0VSU19VUERBVEUpIC0+XG4gICAgc3RhdHVzID0gW11cbiAgICB3YWl0aW5nID0gW11cbiAgICB3b3JrZXJzID0gW11cblxuICAgIHVwZGF0ZVN0YXR1cyA9IChzdGF0dXNJdGVtKSAtPlxuICAgICAgICBmb3IgaXRlbSwgaSBpbiBzdGF0dXNcbiAgICAgICAgICAgIGlmIGl0ZW0ubW9uaXRfbmFtZSA9PSBzdGF0dXNJdGVtLm1vbml0X25hbWUgXFxcbiAgICAgICAgICAgICAgICBhbmQgaXRlbS5ob3N0X2FkZHJlc3MgPT0gc3RhdHVzSXRlbS5ob3N0X2FkZHJlc3MgXFxcbiAgICAgICAgICAgICAgICBhbmQgaXRlbS5zY2hlZHVsZV9pZCA9PSBzdGF0dXNJdGVtLnNjaGVkdWxlX2lkXG4gICAgICAgICAgICAgICAgICAgIHN0YXR1c1tpXSA9IHN0YXR1c0l0ZW1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgIHN0YXR1cy5wdXNoKHN0YXR1c0l0ZW0pXG5cbiAgICB1cGRhdGVXYWl0aW5nID0gKHdhaXRpbmdUYXNrcykgLT5cbiAgICAgICAgd2FpdGluZy5sZW5ndGggPSAwXG4gICAgICAgIGZvciB0YXNrIGluIHdhaXRpbmdUYXNrc1xuICAgICAgICAgICAgd2FpdGluZy5wdXNoKHRhc2spXG5cbiAgICB1cGRhdGVXb3JrZXJzID0gKGN1cnJlbnRXb3JrZXJzKSAtPlxuICAgICAgICB3b3JrZXJzLmxlbmd0aCA9IDBcbiAgICAgICAgZm9yIHdvcmtlciBpbiBjdXJyZW50V29ya2Vyc1xuICAgICAgICAgICAgd29ya2Vycy5wdXNoKHdvcmtlcilcblxuICAgIHN1YnNjcmliZU1vbml0U3RhdHVzID0gLT5cbiAgICAgICAgc29ja2V0ID0gbmV3IHN3V2ViU29ja2V0KFwiI3sgY29uZmlnLndzU2VydmVyQWRkcmVzcyB9L21vbml0c1wiKVxuXG4gICAgICAgIHNvY2tldC5vbk1lc3NhZ2UgKG1zZykgLT5cbiAgICAgICAgICAgIHN0YXR1c0l0ZW0gPSBKU09OLnBhcnNlKG1zZylcbiAgICAgICAgICAgIHVwZGF0ZVN0YXR1cyhzdGF0dXNJdGVtKVxuIyAgICAgICAgICAgICRsb2cuZGVidWcoc3RhdHVzSXRlbSlcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChNT05JVF9TVEFUVVNfVVBEQVRFLCBzdGF0dXMpXG5cbiAgICAgICAgZHVyYWJsZSA9IHRydWVcbiAgICAgICAgc29ja2V0LnN0YXJ0KGR1cmFibGUpXG4jICAgICAgICAkbG9nLmRlYnVnKCdzdGFydCBzdWJzY3JpYmVNb25pdFN0YXR1cycpXG5cblxuICAgIHN1YnNjcmliZU1vbml0U2NoZWR1bGUgPSAtPlxuICAgICAgICBzb2NrZXQgPSBuZXcgc3dXZWJTb2NrZXQoXCIjeyBjb25maWcud3NTZXJ2ZXJBZGRyZXNzIH0vbW9uaXRfc2NoZWR1bGVzXCIpXG5cbiAgICAgICAgc29ja2V0Lm9uTWVzc2FnZSAobXNnKSAtPlxuICAgICAgICAgICAgbW9uaXRTY2hlZHVsZSA9IEpTT04ucGFyc2UobXNnKVxuIyAgICAgICAgICAgICRsb2cuZGVidWcoJ3N1YnNjcmliZU1vbml0U2NoZWR1bGUnLCBtb25pdFNjaGVkdWxlKVxuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KE1PTklUX1NDSEVEVUxFX1VQREFURSwgbW9uaXRTY2hlZHVsZSlcblxuICAgICAgICBkdXJhYmxlID0gdHJ1ZVxuICAgICAgICBzb2NrZXQuc3RhcnQoZHVyYWJsZSlcblxuXG4gICAgc3Vic2NyaWJlV2FpdGluZ1Rhc2tzID0gLT5cbiAgICAgICAgc29ja2V0ID0gbmV3IHN3V2ViU29ja2V0KFwiI3sgY29uZmlnLndzU2VydmVyQWRkcmVzcyB9L3dhaXRpbmdfdGFza3NcIilcblxuICAgICAgICBzb2NrZXQub25NZXNzYWdlIChtc2cpIC0+XG4gICAgICAgICAgICB3YWl0aW5nVGFza3MgPSBKU09OLnBhcnNlKG1zZykud2FpdGluZ190YXNrc1xuICAgICAgICAgICAgdXBkYXRlV2FpdGluZyh3YWl0aW5nVGFza3MpXG4jICAgICAgICAgICAgJGxvZy5kZWJ1Zygnc3Vic2NyaWJlV2FpdGluZ1Rhc2tzJywgd2FpdGluZ1Rhc2tzKVxuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KFdBSVRJTkdfVEFTS1NfVVBEQVRFLCB3YWl0aW5nKVxuXG4gICAgICAgIGR1cmFibGUgPSB0cnVlXG4gICAgICAgIHNvY2tldC5zdGFydChkdXJhYmxlKVxuXG5cbiAgICBzdWJzY3JpYmVXb3JrZXJzVGFza3MgPSAtPlxuICAgICAgICBzb2NrZXQgPSBuZXcgc3dXZWJTb2NrZXQoXCIjeyBjb25maWcud3NTZXJ2ZXJBZGRyZXNzIH0vY3VycmVudF93b3JrZXJzXCIpXG5cbiAgICAgICAgc29ja2V0Lm9uTWVzc2FnZSAobXNnKSAtPlxuICAgICAgICAgICAgY3VycmVudFdvcmtlcnMgPSBKU09OLnBhcnNlKG1zZykuY3VycmVudF93b3JrZXJzXG4gICAgICAgICAgICB1cGRhdGVXb3JrZXJzKGN1cnJlbnRXb3JrZXJzKVxuIyAgICAgICAgICAgICRsb2cuZGVidWcoJ3N1YnNjcmliZVdvcmtlcnNUYXNrcycsIGN1cnJlbnRXb3JrZXJzKVxuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KFdPUktFUlNfVVBEQVRFLCB3b3JrZXJzKVxuXG4gICAgICAgIGR1cmFibGUgPSB0cnVlXG4gICAgICAgIHNvY2tldC5zdGFydChkdXJhYmxlKVxuXG5cbiAgICB0aGlzLnN0YXJ0ID0gLT5cbiMgICAgICAgICRsb2cuaW5mbyAnc3RhcnQgTW9uaXRTdGF0dXMnXG4gICAgICAgIHRoaXMuZ2V0TGF0ZXN0KCkudGhlbihzdWJzY3JpYmVNb25pdFN0YXR1cylcbiAgICAgICAgc3Vic2NyaWJlTW9uaXRTY2hlZHVsZSgpXG4gICAgICAgIHN1YnNjcmliZVdhaXRpbmdUYXNrcygpXG4gICAgICAgIHN1YnNjcmliZVdvcmtlcnNUYXNrcygpXG5cbiAgICB0aGlzLmdldExhdGVzdCA9IC0+XG4gICAgICAgIHJldHVybiBzd0h0dHBIZWxwZXIuZ2V0KFwiI3sgY29uZmlnLnNlcnZlckFkZHJlc3MgfS9tb25pdF9zdGF0dXNfbGF0ZXN0L1wiKS50aGVuIChyZXNwb25zZSkgLT5cbiAgICAgICAgICAgIHN0YXR1cy5sZW5ndGggPSAwXG4gICAgICAgICAgICBmb3IgaXRlbSBpbiByZXNwb25zZS5kYXRhLm1vbml0X3N0YXR1c19sYXRlc3RcbiAgICAgICAgICAgICAgICBzdGF0dXMucHVzaChpdGVtKVxuXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoTU9OSVRfU1RBVFVTX1VQREFURSwgc3RhdHVzKVxuXG4gICAgICAgICAgICByZXR1cm4gc3RhdHVzXG5cbiAgICB0aGlzLmdldFN0YXR1cyA9IC0+XG4gICAgICAgIHJldHVybiBzdGF0dXNcblxuICAgIHRoaXMuZ2V0V2FpdGluZyA9IC0+XG4gICAgICAgIHJldHVybiB3YWl0aW5nXG5cbiAgICB0aGlzLmdldFdvcmtlcnMgPSAtPlxuICAgICAgICByZXR1cm4gd29ya2Vyc1xuXG4gICAgcmV0dXJuIHRoaXMiLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG4uY29udHJvbGxlciAnTW9uaXRTY2hlZHVsZUxhdGVzdFJlc3VsdHNDdHJsJywgKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9nLCAkdWliTW9kYWwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBNb25pdFNjaGVkdWxlLCBNT05JVF9TVEFUVVNfVVBEQVRFKSAtPlxuICAgICRzY29wZS5zY2hlZHVsZSA9IE1vbml0U2NoZWR1bGUubG9hZCgkcm91dGVQYXJhbXMuaWQpXG5cbiAgICBzdGF0dXNMaXN0ZW5lciA9ICRzY29wZS4kb24oTU9OSVRfU1RBVFVTX1VQREFURSwgLT5cbiAgICAgICAgJHNjb3BlLnNjaGVkdWxlLnVwZGF0ZUhvc3RzU3RhdHVzKClcbiAgICApXG4gICAgJHNjb3BlLiRvbignJGRlc3Ryb3knLCBzdGF0dXNMaXN0ZW5lcilcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==

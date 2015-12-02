(function() {
  angular.module('parkKeeper', ['ngResource', 'ngSanitize', 'ngRoute', 'ngAnimate', 'angular.filter', 'ui.bootstrap', 'swUtils', 'swWebSocket', 'swAuth']).config(function($routeProvider) {
    return $routeProvider.when('/', {
      templateUrl: 'controllers/main.html',
      controller: 'MainCtrl',
      label: ''
    }).when('/monit_schedule/:id/latest_result/', {
      templateUrl: 'controllers/monit_schedule/latest_results.html',
      controller: 'MonitScheduleLatestResultsCtrl',
      label: 'Latest results'
    }).when('/monit_task/:id/', {
      templateUrl: 'controllers/monit_task/detail.html',
      controller: 'MonitTaskDetailCtrl',
      label: 'Monit task'
    }).when('/work_schedule/:id/latest_result/', {
      templateUrl: 'controllers/work_schedule/latest_results.html',
      controller: 'WorkScheduleLatestResultsCtrl',
      label: 'Latest results'
    }).when('/work_task/:id/', {
      templateUrl: 'controllers/work_task/detail.html',
      controller: 'WorkTaskDetailCtrl',
      label: 'Work task'
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
  }).run(function(workStatus) {
    return workStatus.start();
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
  angular.module('parkKeeper').controller('MainCtrl', function($scope, $log, $uibModal, monitStatus, MonitScheduleCollection, workStatus, WorkScheduleCollection) {
    var monitScheduleCollection, workScheduleCollection;
    monitScheduleCollection = new MonitScheduleCollection();
    monitScheduleCollection.loadAll();
    monitScheduleCollection.startWatch();
    $scope.$on('$destroy', monitScheduleCollection.stopWatch);
    $scope.monitSchedules = monitScheduleCollection.schedules;
    workScheduleCollection = new WorkScheduleCollection();
    workScheduleCollection.loadAll();
    workScheduleCollection.startWatch();
    $scope.$on('$destroy', workScheduleCollection.stopWatch);
    $scope.workSchedules = workScheduleCollection.schedules;
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
  angular.module('parkKeeper').factory('MonitTask', function(config, swHttpHelper) {
    var MonitTask;
    MonitTask = (function() {
      function MonitTask(data) {
        angular.extend(this, data || {});
      }

      MonitTask.get = function(taskId) {
        return swHttpHelper.get(config.serverAddress + "/monit_task/" + taskId).then(function(response) {
          var task;
          task = new MonitTask(response.data);
          return task;
        });
      };

      return MonitTask;

    })();
    return MonitTask;
  });

}).call(this);

(function() {
  angular.module('parkKeeper').factory('WorkScheduleResource', function($resource, config) {
    var url;
    url = config.serverAddress + "/work_schedule/:id/";
    return $resource(url);
  }).factory('WorkSchedule', function($log, workStatus, WorkScheduleResource) {
    var WorkSchedule;
    WorkSchedule = (function() {
      WorkSchedule.load = function(id) {
        var schedule, scheduleData;
        schedule = new WorkSchedule();
        scheduleData = WorkScheduleResource.get({
          id: id
        }, function() {
          schedule = schedule.update(scheduleData);
          return schedule.updateHostsStatus();
        });
        return schedule;
      };

      function WorkSchedule(data) {
        this.latestStatusDt = void 0;
        this.latestStatusLevel = void 0;
        angular.extend(this, data || {});
      }

      WorkSchedule.prototype.getLabel = function() {
        var ref;
        return this.name || ((ref = this.work) != null ? ref.name : void 0);
      };

      WorkSchedule.prototype.update = function(data) {
        return angular.extend(this, data || {});
      };

      WorkSchedule.prototype.updateHostsStatus = function() {
        var host, j, len, ref, results, statusItem;
        ref = workStatus.getStatus();
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

      WorkSchedule.prototype.getHost = function(hostAddress) {
        var host, j, len, ref;
        ref = this.all_hosts;
        for (j = 0, len = ref.length; j < len; j++) {
          host = ref[j];
          if (host.address === hostAddress) {
            return host;
          }
        }
      };

      WorkSchedule.prototype.isUndefined = function() {
        return this.latestStatusLevel === void 0;
      };

      WorkSchedule.prototype.isOk = function() {
        return this.latestStatusLevel === 1;
      };

      WorkSchedule.prototype.isWarning = function() {
        return this.latestStatusLevel === 2;
      };

      WorkSchedule.prototype.isFail = function() {
        return this.latestStatusLevel === 3;
      };

      WorkSchedule.prototype.getLevelLabel = function() {
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

      WorkSchedule.prototype.isFresh = function() {
        var deadline;
        deadline = moment().subtract(this.period * 2, 'seconds').toDate();
        return this.latestStatusDt > deadline;
      };

      return WorkSchedule;

    })();
    return WorkSchedule;
  }).factory('WorkScheduleCollection', function($log, $rootScope, WorkSchedule, WorkScheduleResource, WORK_STATUS_UPDATE, WORK_SCHEDULE_UPDATE) {
    var WorkScheduleCollection;
    WorkScheduleCollection = (function() {
      function WorkScheduleCollection() {
        this.schedules = [];
        this.statusListener = void 0;
        this.scheduleListener = void 0;
      }

      WorkScheduleCollection.prototype.loadAll = function() {
        var schedulesData;
        this.schedules.length = 0;
        return schedulesData = WorkScheduleResource.query((function(_this) {
          return function() {
            var itemData, j, len, schedule;
            for (j = 0, len = schedulesData.length; j < len; j++) {
              itemData = schedulesData[j];
              schedule = new WorkSchedule(itemData);
              _this.schedules.push(schedule);
            }
            return _this._updateStatuses();
          };
        })(this));
      };

      WorkScheduleCollection.prototype.startWatch = function() {
        this.statusListener = $rootScope.$on(WORK_STATUS_UPDATE, (function(_this) {
          return function() {
            return _this._updateStatuses();
          };
        })(this));
        return this.scheduleListener = $rootScope.$on(WORK_SCHEDULE_UPDATE, (function(_this) {
          return function(e, data) {
            return _this._processScheduleEvent(e, data);
          };
        })(this));
      };

      WorkScheduleCollection.prototype.stopWatch = function() {
        if (this.statusListener) {
          this.statusListener();
          this.statusListener = void 0;
        }
        if (this.scheduleListener) {
          this.scheduleListener();
          return this.scheduleListener = void 0;
        }
      };

      WorkScheduleCollection.prototype.getIndex = function(scheduleId) {
        var i, j, len, ref, schedule;
        ref = this.schedules;
        for (i = j = 0, len = ref.length; j < len; i = ++j) {
          schedule = ref[i];
          if (schedule.id === scheduleId) {
            return i;
          }
        }
      };

      WorkScheduleCollection.prototype.getSchedule = function(scheduleId) {
        var index, schedule;
        index = this.getIndex(scheduleId);
        schedule = this.schedules[index];
        return schedule;
      };

      WorkScheduleCollection.prototype._updateStatuses = function() {
        var j, len, ref, results, schedule;
        ref = this.schedules;
        results = [];
        for (j = 0, len = ref.length; j < len; j++) {
          schedule = ref[j];
          results.push(schedule.updateHostsStatus());
        }
        return results;
      };

      WorkScheduleCollection.prototype._processScheduleEvent = function(e, data) {
        if (data.event === 'create' || data.event === 'update') {
          this._updateSchedule(data.instance);
        } else if (data.event === 'delete') {
          this._deleteSchedule(data.instance);
        } else {
          $log.error('Unexpected workScheduleListener data', data);
        }
        return this._updateStatuses();
      };

      WorkScheduleCollection.prototype._updateSchedule = function(scheduleData) {
        var new_schedule, schedule;
        schedule = this.getSchedule(scheduleData.id);
        if (schedule) {
          schedule.update(scheduleData);
        } else {
          new_schedule = new WorkSchedule(scheduleData);
          this.schedules.push(new_schedule);
        }
        return $log.debug('_updateSchedule');
      };

      WorkScheduleCollection.prototype._deleteSchedule = function(scheduleData) {
        var index;
        index = this.getIndex(scheduleData.id);
        if (index) {
          this.schedules.splice(index, 1);
        }
        return $log.debug('_deleteSchedule');
      };

      return WorkScheduleCollection;

    })();
    return WorkScheduleCollection;
  });

}).call(this);

(function() {
  angular.module('parkKeeper').constant('WORK_SCHEDULE_UPDATE', 'WORK_SCHEDULE_UPDATE').constant('WORK_STATUS_UPDATE', 'WORK_STATUS_UPDATE').service('workStatus', function($log, $rootScope, swHttpHelper, swWebSocket, config, WORK_SCHEDULE_UPDATE, WORK_STATUS_UPDATE) {
    var status, subscribeWorkSchedule, subscribeWorkStatus, updateStatus;
    status = [];
    updateStatus = function(statusItem) {
      var i, item, j, len;
      for (i = j = 0, len = status.length; j < len; i = ++j) {
        item = status[i];
        if (item.work_name === statusItem.work_name && item.host_address === statusItem.host_address && item.schedule_id === statusItem.schedule_id) {
          status[i] = statusItem;
          return;
        }
      }
      return status.push(statusItem);
    };
    subscribeWorkStatus = function() {
      var durable, socket;
      socket = new swWebSocket(config.wsServerAddress + "/works");
      socket.onMessage(function(msg) {
        var statusItem;
        statusItem = JSON.parse(msg);
        updateStatus(statusItem);
        return $rootScope.$broadcast(WORK_STATUS_UPDATE, status);
      });
      durable = true;
      return socket.start(durable);
    };
    subscribeWorkSchedule = function() {
      var durable, socket;
      socket = new swWebSocket(config.wsServerAddress + "/work_schedules");
      socket.onMessage(function(msg) {
        var workSchedule;
        workSchedule = JSON.parse(msg);
        return $rootScope.$broadcast(WORK_SCHEDULE_UPDATE, workSchedule);
      });
      durable = true;
      return socket.start(durable);
    };
    this.start = function() {
      this.getLatest().then(subscribeWorkStatus);
      return subscribeWorkSchedule();
    };
    this.getLatest = function() {
      return swHttpHelper.get(config.serverAddress + "/work_status_latest/").then(function(response) {
        var item, j, len, ref;
        status.length = 0;
        ref = response.data.work_status_latest;
        for (j = 0, len = ref.length; j < len; j++) {
          item = ref[j];
          status.push(item);
        }
        $rootScope.$broadcast(WORK_STATUS_UPDATE, status);
        return status;
      });
    };
    this.getStatus = function() {
      return status;
    };
    return this;
  });

}).call(this);

(function() {
  angular.module('parkKeeper').factory('WorkTask', function(config, swHttpHelper) {
    var WorkTask;
    WorkTask = (function() {
      function WorkTask(data) {
        angular.extend(this, data || {});
      }

      WorkTask.get = function(taskId) {
        return swHttpHelper.get(config.serverAddress + "/work_task/" + taskId).then(function(response) {
          var task;
          task = new WorkTask(response.data);
          return task;
        });
      };

      return WorkTask;

    })();
    return WorkTask;
  });

}).call(this);

(function() {
  angular.module('parkKeeper').controller('MonitScheduleLatestResultsCtrl', function($scope, $routeParams, $log, MonitSchedule, MONIT_STATUS_UPDATE) {
    var statusListener;
    $scope.schedule = MonitSchedule.load($routeParams.id);
    statusListener = $scope.$on(MONIT_STATUS_UPDATE, function() {
      return $scope.schedule.updateHostsStatus();
    });
    return $scope.$on('$destroy', statusListener);
  });

}).call(this);

(function() {
  angular.module('parkKeeper').controller('MonitTaskDetailCtrl', function($scope, $routeParams, $log, MonitTask) {
    return MonitTask.get($routeParams.id).then(function(task) {
      return $scope.task = task;
    });
  });

}).call(this);

(function() {
  angular.module('parkKeeper').controller('WorkScheduleLatestResultsCtrl', function($scope, $routeParams, $log, WorkSchedule, WORK_STATUS_UPDATE) {
    var statusListener;
    $scope.schedule = WorkSchedule.load($routeParams.id);
    statusListener = $scope.$on(WORK_STATUS_UPDATE, function() {
      return $scope.schedule.updateHostsStatus();
    });
    return $scope.$on('$destroy', statusListener);
  });

}).call(this);

(function() {
  angular.module('parkKeeper').controller('WorkTaskDetailCtrl', function($scope, $routeParams, $log, WorkTask) {
    return WorkTask.get($routeParams.id).then(function(task) {
      return $scope.task = task;
    });
  });

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9hcHAuY29mZmVlIiwiYXBwL2NvbmZpZy5jb2ZmZWUiLCJhcHAvaW50ZXJjZXB0b3JzLmNvZmZlZSIsImFwcC9jb250cm9sbGVycy9tYWluLmNvZmZlZSIsImFwcC9jb250cm9sbGVycy9tb25pdF90YXNrc19tb2RhbC5jb2ZmZWUiLCJhcHAvcmVzb3VyY2VzL2hvc3QuY29mZmVlIiwiYXBwL3Jlc291cmNlcy9ob3N0X2dyb3VwLmNvZmZlZSIsImFwcC9yZXNvdXJjZXMvbW9uaXRfc2NoZWR1bGUuY29mZmVlIiwiYXBwL3Jlc291cmNlcy9tb25pdF9zdGF0dXMuY29mZmVlIiwiYXBwL3Jlc291cmNlcy9tb25pdF90YXNrLmNvZmZlZSIsImFwcC9yZXNvdXJjZXMvd29ya19zY2hlZHVsZS5jb2ZmZWUiLCJhcHAvcmVzb3VyY2VzL3dvcmtfc3RhdHVzLmNvZmZlZSIsImFwcC9yZXNvdXJjZXMvd29ya190YXNrLmNvZmZlZSIsImFwcC9jb250cm9sbGVycy9tb25pdF9zY2hlZHVsZS9sYXRlc3RfcmVzdWx0cy5jb2ZmZWUiLCJhcHAvY29udHJvbGxlcnMvbW9uaXRfdGFzay9kZXRhaWwuY29mZmVlIiwiYXBwL2NvbnRyb2xsZXJzL3dvcmtfc2NoZWR1bGUvbGF0ZXN0X3Jlc3VsdHMuY29mZmVlIiwiYXBwL2NvbnRyb2xsZXJzL3dvcmtfdGFzay9kZXRhaWwuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0VBQUEsT0FBTyxDQUFDLE1BQVIsQ0FBZSxZQUFmLEVBQTZCLENBQ3pCLFlBRHlCLEVBRXpCLFlBRnlCLEVBR3pCLFNBSHlCLEVBSXpCLFdBSnlCLEVBTXpCLGdCQU55QixFQU96QixjQVB5QixFQVN6QixTQVR5QixFQVV6QixhQVZ5QixFQVd6QixRQVh5QixDQUE3QixDQWNBLENBQUMsTUFkRCxDQWNRLFNBQUMsY0FBRDtXQUNKLGNBQ0EsQ0FBQyxJQURELENBQ00sR0FETixFQUVFO01BQUEsV0FBQSxFQUFhLHVCQUFiO01BQ0Es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LENBQWUsWUFBZixDQUNBLENBQUMsVUFERCxDQUNZLG9CQURaLEVBQ2tDLFNBQUMsTUFBRCxFQUFTLFlBQVQsRUFBdUIsSUFBdkIsRUFBNkIsUUFBN0I7V0FDOUIsUUFBUSxDQUFDLEdBQVQsQ0FBYSxZQUFZLENBQUMsRUFBMUIsQ0FBNkIsQ0FBQyxJQUE5QixDQUFtQyxTQUFDLElBQUQ7YUFDL0IsTUFBTSxDQUFDLElBQVAsR0FBYztJQURpQixDQUFuQztFQUQ4QixDQURsQztBQUFBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbImFuZ3VsYXIubW9kdWxlKCdwYXJrS2VlcGVyJywgW1xuICAgICduZ1Jlc291cmNlJ1xuICAgICduZ1Nhbml0aXplJ1xuICAgICduZ1JvdXRlJ1xuICAgICduZ0FuaW1hdGUnXG5cbiAgICAnYW5ndWxhci5maWx0ZXInXG4gICAgJ3VpLmJvb3RzdHJhcCdcblxuICAgICdzd1V0aWxzJ1xuICAgICdzd1dlYlNvY2tldCdcbiAgICAnc3dBdXRoJ1xuXSlcblxuLmNvbmZpZyAoJHJvdXRlUHJvdmlkZXIpIC0+XG4gICAgJHJvdXRlUHJvdmlkZXJcbiAgICAud2hlbignLycsXG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbnRyb2xsZXJzL21haW4uaHRtbCdcbiAgICAgIGNvbnRyb2xsZXI6ICdNYWluQ3RybCdcbiAgICAgIGxhYmVsOiAnJ1xuICAgIClcblxuICAgIC53aGVuKCcvbW9uaXRfc2NoZWR1bGUvOmlkL2xhdGVzdF9yZXN1bHQvJyxcbiAgICAgIHRlbXBsYXRlVXJsOiAnY29udHJvbGxlcnMvbW9uaXRfc2NoZWR1bGUvbGF0ZXN0X3Jlc3VsdHMuaHRtbCdcbiAgICAgIGNvbnRyb2xsZXI6ICdNb25pdFNjaGVkdWxlTGF0ZXN0UmVzdWx0c0N0cmwnXG4gICAgICBsYWJlbDogJ0xhdGVzdCByZXN1bHRzJ1xuICAgIClcbiAgICAud2hlbignL21vbml0X3Rhc2svOmlkLycsXG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbnRyb2xsZXJzL21vbml0X3Rhc2svZGV0YWlsLmh0bWwnXG4gICAgICBjb250cm9sbGVyOiAnTW9uaXRUYXNrRGV0YWlsQ3RybCdcbiAgICAgIGxhYmVsOiAnTW9uaXQgdGFzaydcbiAgICApXG5cblxuICAgIC53aGVuKCcvd29ya19zY2hlZHVsZS86aWQvbGF0ZXN0X3Jlc3VsdC8nLFxuICAgICAgdGVtcGxhdGVVcmw6ICdjb250cm9sbGVycy93b3JrX3NjaGVkdWxlL2xhdGVzdF9yZXN1bHRzLmh0bWwnXG4gICAgICBjb250cm9sbGVyOiAnV29ya1NjaGVkdWxlTGF0ZXN0UmVzdWx0c0N0cmwnXG4gICAgICBsYWJlbDogJ0xhdGVzdCByZXN1bHRzJ1xuICAgIClcbiAgICAud2hlbignL3dvcmtfdGFzay86aWQvJyxcbiAgICAgIHRlbXBsYXRlVXJsOiAnY29udHJvbGxlcnMvd29ya190YXNrL2RldGFpbC5odG1sJ1xuICAgICAgY29udHJvbGxlcjogJ1dvcmtUYXNrRGV0YWlsQ3RybCdcbiAgICAgIGxhYmVsOiAnV29yayB0YXNrJ1xuICAgIClcblxuICAgIC53aGVuKCcvbG9naW4vJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdjb250cm9sbGVycy9sb2dpbi5odG1sJ1xuICAgICAgICBjb250cm9sbGVyOiAnQXV0aExvZ2luQ3RybCdcbiAgICAgICAgbGFiZWw6ICdMb2dpbidcbiAgICApXG4gICAgLndoZW4oJy9sb2dvdXQvJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdjb250cm9sbGVycy9sb2dvdXQuaHRtbCdcbiAgICAgICAgY29udHJvbGxlcjogJ0F1dGhMb2dvdXRDdHJsJ1xuICAgICAgICBsYWJlbDogJ0xvZ291dCdcbiAgICApXG5cbi5ydW4gKCRsb2NhdGlvbiwgJHJvb3RTY29wZSwgc3dUaXRsZSkgLT5cbiAgICAkcm9vdFNjb3BlLnN3VGl0bGUgPSBzd1RpdGxlXG4gICAgJHJvb3RTY29wZS4kb24gJyRyb3V0ZUNoYW5nZVN1Y2Nlc3MnLCAoZXZlbnQsIGN1cnJlbnQsIHByZXZpb3VzKSAtPlxuICAgICAgICBiYXNlVGl0bGUgPSBjdXJyZW50LiQkcm91dGU/LmxhYmVsIG9yICcnXG4gICAgICAgIHN3VGl0bGUuc2V0VGl0bGVCYXNlKGJhc2VUaXRsZSlcbiAgICAgICAgc3dUaXRsZS5zZXRUaXRsZVN0YXJ0KCcnKVxuICAgICAgICBzd1RpdGxlLnNldFRpdGxlRW5kKCcnKVxuXG4ucnVuIChtb25pdFN0YXR1cykgLT5cbiAgICBtb25pdFN0YXR1cy5zdGFydCgpXG5cbi5ydW4gKHdvcmtTdGF0dXMpIC0+XG4gICAgd29ya1N0YXR1cy5zdGFydCgpXG5cbi5jb25maWcgKGF1dGhDb25maWdQcm92aWRlciwgY29uZmlnKSAtPlxuICAgIGF1dGhDb25maWdQcm92aWRlci5zZXRTeXN0ZW1MYWJlbCgncGFya0tlZXBlcicpXG4gICAgYXV0aENvbmZpZ1Byb3ZpZGVyLnNldFNlcnZlckFkZHJlc3MoY29uZmlnLnNlcnZlckFkZHJlc3MpXG4gICAgYXV0aENvbmZpZ1Byb3ZpZGVyLnNldEZyZWVVcmxzKFtdKVxuXG4uY29uZmlnICgkaHR0cFByb3ZpZGVyKSAtPlxuICAgICRodHRwUHJvdmlkZXIuZGVmYXVsdHMuaGVhZGVycy5wb3N0WydDb250ZW50LVR5cGUnXSA9ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnIiwiYW5ndWxhci5tb2R1bGUoJ3BhcmtLZWVwZXInKVxuICAgIC5jb25zdGFudCgnY29uZmlnJywge1xuIyAgICAgICAgc2VydmVyQWRkcmVzczogJ2h0dHA6Ly8xMjcuMC4wLjE6ODA4MCcsXG4gICAgICAgIHNlcnZlckFkZHJlc3M6ICcnLFxuICAgICAgICB3c1NlcnZlckFkZHJlc3M6ICd3czovLzEyNy4wLjAuMTo4MDgxJyxcbiAgICB9KSIsImFuZ3VsYXIubW9kdWxlKCdwYXJrS2VlcGVyJylcblxuIyBpbnRlcmNlcHRvciA1MDAgc3RhdHVzIGVycm9yXG4uY29uZmlnICgkaHR0cFByb3ZpZGVyKSAtPlxuICAgICRodHRwUHJvdmlkZXIuaW50ZXJjZXB0b3JzLnB1c2goJ3NlcnZlckVycm9ySW50ZXJjZXB0b3InKVxuXG4uZmFjdG9yeSAnc2VydmVyRXJyb3JJbnRlcmNlcHRvcicsICgkbG9jYXRpb24sICRxLCAkbG9nKSAtPlxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzcG9uc2VFcnJvcjogKHJlc3BvbnNlKSAtPlxuICAgICAgICAgICAgICAgIGlmIHJlc3BvbnNlLnN0YXR1cyA9PSAwIG9yIChyZXNwb25zZS5zdGF0dXMgPj0gNTAwIGFuZCByZXNwb25zZS5zdGF0dXMgPD0gNjAwKVxuICAgICAgICAgICAgICAgICAgICAkbG9nLmVycm9yKHJlc3BvbnNlKVxuIyAgICAgICAgICAgICAgICAgICAgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2Uuc3RhdHVzVGV4dCBvciAnJ1xuIyAgICAgICAgICAgICAgICAgICAgdG9hc3Rlci5wb3AoJ2Vycm9yJywgJ9Ce0YjQuNCx0LrQsCDRgdC10YDQstC10YDQsCcsIGVycm9yTWVzc2FnZSlcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlKVxuXG4gICAgICAgIH0iLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG4uY29udHJvbGxlciAnTWFpbkN0cmwnLCAoJHNjb3BlLCAkbG9nLCAkdWliTW9kYWwsIG1vbml0U3RhdHVzLCBNb25pdFNjaGVkdWxlQ29sbGVjdGlvbiwgd29ya1N0YXR1cywgV29ya1NjaGVkdWxlQ29sbGVjdGlvbikgLT5cblxuICAgIG1vbml0U2NoZWR1bGVDb2xsZWN0aW9uID0gbmV3IE1vbml0U2NoZWR1bGVDb2xsZWN0aW9uKClcbiAgICBtb25pdFNjaGVkdWxlQ29sbGVjdGlvbi5sb2FkQWxsKClcbiAgICBtb25pdFNjaGVkdWxlQ29sbGVjdGlvbi5zdGFydFdhdGNoKClcbiAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsIG1vbml0U2NoZWR1bGVDb2xsZWN0aW9uLnN0b3BXYXRjaClcbiAgICAkc2NvcGUubW9uaXRTY2hlZHVsZXMgPSBtb25pdFNjaGVkdWxlQ29sbGVjdGlvbi5zY2hlZHVsZXNcblxuICAgIHdvcmtTY2hlZHVsZUNvbGxlY3Rpb24gPSBuZXcgV29ya1NjaGVkdWxlQ29sbGVjdGlvbigpXG4gICAgd29ya1NjaGVkdWxlQ29sbGVjdGlvbi5sb2FkQWxsKClcbiAgICB3b3JrU2NoZWR1bGVDb2xsZWN0aW9uLnN0YXJ0V2F0Y2goKVxuICAgICRzY29wZS4kb24oJyRkZXN0cm95Jywgd29ya1NjaGVkdWxlQ29sbGVjdGlvbi5zdG9wV2F0Y2gpXG4gICAgJHNjb3BlLndvcmtTY2hlZHVsZXMgPSB3b3JrU2NoZWR1bGVDb2xsZWN0aW9uLnNjaGVkdWxlc1xuXG4gICAgJHNjb3BlLndhaXRpbmdUYXNrcyA9IG1vbml0U3RhdHVzLmdldFdhaXRpbmcoKVxuICAgICRzY29wZS5tb25pdFdvcmtlcnMgPSBtb25pdFN0YXR1cy5nZXRXb3JrZXJzKClcblxuXG4gICAgJHNjb3BlLm9wZW5UYXNrID0gKHRhc2tzKSAtPlxuICAgICAgICBpZiBub3QgdGFza3MubGVuZ3RoXG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgJHVpYk1vZGFsLm9wZW4oe1xuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdjb250cm9sbGVycy9tb25pdF90YXNrc19tb2RhbC5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdNb25pdFRhc2tzTW9kYWxDdHJsJyxcbiAgICAgICAgICAgIHNpemU6ICdsZycsXG4gICAgICAgICAgICByZXNvbHZlOlxuICAgICAgICAgICAgICAgIHRhc2tzOiAtPiB0YXNrc1xuICAgICAgICB9KSIsImFuZ3VsYXIubW9kdWxlKCdwYXJrS2VlcGVyJylcbi5jb250cm9sbGVyICdNb25pdFRhc2tzTW9kYWxDdHJsJywgKCRzY29wZSwgJHVpYk1vZGFsSW5zdGFuY2UsIHRhc2tzKSAtPlxuICAgICRzY29wZS50YXNrcyA9IHRhc2tzXG5cbiAgICAkc2NvcGUuY2FuY2VsID0gLT5cbiAgICAgICAgJHVpYk1vZGFsSW5zdGFuY2UuZGlzbWlzcygnY2FuY2VsJykiLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG5cbi5mYWN0b3J5ICdIb3N0UmVzb3VyY2UnLCAoJHJlc291cmNlLCBjb25maWcpIC0+XG4gICAgdXJsID0gXCIjeyBjb25maWcuc2VydmVyQWRkcmVzcyB9L2hvc3QvOmlkL1wiXG4gICAgcmV0dXJuICRyZXNvdXJjZSh1cmwpXG5cblxuIy5mYWN0b3J5ICdIb3N0U3RhdHVzJywgLT5cbiMgICAgY2xhc3MgSG9zdFN0YXR1c1xuIyAgICAgICAgbW9uaXROYW1lOiB1bmRlZmluZWRcbiMgICAgICAgIGR0OiB1bmRlZmluZWRcbiMgICAgICAgIGV4dHJhOiB1bmRlZmluZWRcbiMgICAgICAgIGlzU3VjY2VzczogdW5kZWZpbmVkXG4jXG4jICAgICAgICBjb25zdHJ1Y3RvcjogKGRhdGEpIC0+XG4jICAgICAgICAgICAgYW5ndWxhci5leHRlbmQodGhpcywgZGF0YSBvciB7fSlcbiNcbiMgICAgcmV0dXJuIEhvc3RTdGF0dXMiLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG5cbi5mYWN0b3J5ICdIb3N0R3JvdXBSZXNvdXJjZScsICgkcmVzb3VyY2UsIGNvbmZpZykgLT5cbiAgICB1cmwgPSBcIiN7IGNvbmZpZy5zZXJ2ZXJBZGRyZXNzIH0vaG9zdF9ncm91cC86aWQvXCJcbiAgICByZXR1cm4gJHJlc291cmNlKHVybCkiLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG5cbi5mYWN0b3J5ICdNb25pdFNjaGVkdWxlUmVzb3VyY2UnLCAoJHJlc291cmNlLCBjb25maWcpIC0+XG4gICAgdXJsID0gXCIjeyBjb25maWcuc2VydmVyQWRkcmVzcyB9L21vbml0X3NjaGVkdWxlLzppZC9cIlxuICAgIHJldHVybiAkcmVzb3VyY2UodXJsKVxuXG5cbi5mYWN0b3J5ICdNb25pdFNjaGVkdWxlJywgKCRsb2csIG1vbml0U3RhdHVzLCBNb25pdFNjaGVkdWxlUmVzb3VyY2UpIC0+XG4gICAgY2xhc3MgTW9uaXRTY2hlZHVsZVxuXG4gICAgICAgIEBsb2FkOiAoaWQpIC0+XG4gICAgICAgICAgICBzY2hlZHVsZSA9IG5ldyBNb25pdFNjaGVkdWxlKClcbiAgICAgICAgICAgIHNjaGVkdWxlRGF0YSA9IE1vbml0U2NoZWR1bGVSZXNvdXJjZS5nZXQge2lkOiBpZH0sIC0+XG4gICAgICAgICAgICAgICAgc2NoZWR1bGUgPSBzY2hlZHVsZS51cGRhdGUoc2NoZWR1bGVEYXRhKVxuICAgICAgICAgICAgICAgIHNjaGVkdWxlLnVwZGF0ZUhvc3RzU3RhdHVzKClcbiAgICAgICAgICAgIHJldHVybiBzY2hlZHVsZVxuXG4gICAgICAgIGNvbnN0cnVjdG9yOiAoZGF0YSkgLT5cbiAgICAgICAgICAgIHRoaXMubGF0ZXN0U3RhdHVzRHQgPSB1bmRlZmluZWRcbiAgICAgICAgICAgIHRoaXMubGF0ZXN0U3RhdHVzTGV2ZWwgPSB1bmRlZmluZWRcbiAgICAgICAgICAgIGFuZ3VsYXIuZXh0ZW5kKHRoaXMsIGRhdGEgb3Ige30pXG5cbiAgICAgICAgZ2V0TGFiZWw6IC0+XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5uYW1lIG9yIHRoaXMubW9uaXQ/Lm5hbWVcblxuICAgICAgICB1cGRhdGU6IChkYXRhKSAtPlxuICAgICAgICAgICAgYW5ndWxhci5leHRlbmQodGhpcywgZGF0YSBvciB7fSlcblxuICAgICAgICB1cGRhdGVIb3N0c1N0YXR1czogLT5cbiAgICAgICAgICAgIGZvciBzdGF0dXNJdGVtIGluIG1vbml0U3RhdHVzLmdldFN0YXR1cygpXG4gICAgICAgICAgICAgICAgaWYgc3RhdHVzSXRlbS5zY2hlZHVsZV9pZCAhPSB0aGlzLmlkXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlXG5cbiAgICAgICAgICAgICAgICBob3N0ID0gdGhpcy5nZXRIb3N0KHN0YXR1c0l0ZW0uaG9zdF9hZGRyZXNzKVxuICAgICAgICAgICAgICAgIGlmIG5vdCBob3N0XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlXG5cbiAgICAgICAgICAgICAgICB0aGlzLmxhdGVzdFN0YXR1c0xldmVsID0gdW5kZWZpbmVkXG5cbiAgICAgICAgICAgICAgICBpZiBzdGF0dXNJdGVtLnJlc3VsdF9kdFxuICAgICAgICAgICAgICAgICAgICBzdGF0dXNJdGVtLnJlc3VsdF9kdCA9IG1vbWVudChzdGF0dXNJdGVtLnJlc3VsdF9kdCkudG9EYXRlKClcblxuICAgICAgICAgICAgICAgIGhvc3Quc3RhdHVzID0gc3RhdHVzSXRlbVxuICAgICAgICAgICAgICAgIGlmIG5vdCB0aGlzLmxhdGVzdFN0YXR1c0R0IG9yIGhvc3Quc3RhdHVzLnJlc3VsdF9kdCA+IHRoaXMubGF0ZXN0U3RhdHVzRHRcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sYXRlc3RTdGF0dXNEdCA9IGhvc3Quc3RhdHVzLnJlc3VsdF9kdFxuXG4gICAgICAgICAgICAgICAgaWYgbm90IHRoaXMubGF0ZXN0U3RhdHVzTGV2ZWwgb3IgdGhpcy5sYXRlc3RTdGF0dXNMZXZlbCA8IGhvc3Quc3RhdHVzLmxldmVsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGF0ZXN0U3RhdHVzTGV2ZWwgPSBob3N0LnN0YXR1cy5sZXZlbFxuXG4gICAgICAgICAgICAgICAgaWYgbm90IHRoaXMubGF0ZXN0U3RhdHVzRHQgb3IgdGhpcy5sYXRlc3RTdGF0dXNEdCA8IGhvc3Quc3RhdHVzLnJlc3VsdF9kdFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxhdGVzdFN0YXR1c0R0ID0gaG9zdC5zdGF0dXMucmVzdWx0X2R0XG5cbiAgICAgICAgZ2V0SG9zdDogKGhvc3RBZGRyZXNzKSAtPlxuICAgICAgICAgICAgZm9yIGhvc3QgaW4gdGhpcy5hbGxfaG9zdHNcbiAgICAgICAgICAgICAgICBpZiBob3N0LmFkZHJlc3MgPT0gaG9zdEFkZHJlc3NcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGhvc3RcblxuICAgICAgICBpc1VuZGVmaW5lZDogLT5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxhdGVzdFN0YXR1c0xldmVsID09IHVuZGVmaW5lZFxuICAgICAgICBpc09rOiAtPlxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubGF0ZXN0U3RhdHVzTGV2ZWwgPT0gMVxuICAgICAgICBpc1dhcm5pbmc6IC0+XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5sYXRlc3RTdGF0dXNMZXZlbCA9PSAyXG4gICAgICAgIGlzRmFpbDogLT5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxhdGVzdFN0YXR1c0xldmVsID09IDNcbiAgICAgICAgICAgIFxuICAgICAgICBnZXRMZXZlbExhYmVsOiAtPlxuICAgICAgICAgICAgaWYgdGhpcy5pc1VuZGVmaW5lZCgpXG4gICAgICAgICAgICAgICAgcmV0dXJuICdVbmRlZmluZWQnXG4gICAgICAgICAgICBlbHNlIGlmIHRoaXMuaXNPaygpXG4gICAgICAgICAgICAgICAgcmV0dXJuICdPaydcbiAgICAgICAgICAgIGVsc2UgaWYgdGhpcy5pc1dhcm5pbmcoKVxuICAgICAgICAgICAgICAgIHJldHVybiAnV2FybmluZydcbiAgICAgICAgICAgIGVsc2UgaWYgdGhpcy5pc0ZhaWwoKVxuICAgICAgICAgICAgICAgIHJldHVybiAnRmFpbCdcblxuICAgICAgICBpc0ZyZXNoOiAtPlxuICAgICAgICAgICAgZGVhZGxpbmUgPSBtb21lbnQoKS5zdWJ0cmFjdCh0aGlzLnBlcmlvZCAqIDIsICdzZWNvbmRzJykudG9EYXRlKClcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxhdGVzdFN0YXR1c0R0ID4gZGVhZGxpbmVcblxuICAgIHJldHVybiBNb25pdFNjaGVkdWxlXG5cblxuLmZhY3RvcnkgJ01vbml0U2NoZWR1bGVDb2xsZWN0aW9uJywgKCRsb2csICRyb290U2NvcGUsIE1vbml0U2NoZWR1bGUsIE1vbml0U2NoZWR1bGVSZXNvdXJjZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE1PTklUX1NUQVRVU19VUERBVEUsIE1PTklUX1NDSEVEVUxFX1VQREFURSkgLT5cbiAgICBjbGFzcyBNb25pdFNjaGVkdWxlQ29sbGVjdGlvblxuXG4gICAgICAgIGNvbnN0cnVjdG9yOiAtPlxuICAgICAgICAgICAgdGhpcy5zY2hlZHVsZXMgPSBbXVxuICAgICAgICAgICAgdGhpcy5zdGF0dXNMaXN0ZW5lciA9IHVuZGVmaW5lZFxuICAgICAgICAgICAgdGhpcy5zY2hlZHVsZUxpc3RlbmVyID0gdW5kZWZpbmVkXG5cbiAgICAgICAgbG9hZEFsbDogLT5cbiAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVzLmxlbmd0aCA9IDBcbiAgICAgICAgICAgIHNjaGVkdWxlc0RhdGEgPSBNb25pdFNjaGVkdWxlUmVzb3VyY2UucXVlcnkgPT5cbiAgICAgICAgICAgICAgICBmb3IgaXRlbURhdGEgaW4gc2NoZWR1bGVzRGF0YVxuICAgICAgICAgICAgICAgICAgICBzY2hlZHVsZSA9IG5ldyBNb25pdFNjaGVkdWxlKGl0ZW1EYXRhKVxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNjaGVkdWxlcy5wdXNoKHNjaGVkdWxlKVxuICAgICAgICAgICAgICAgIHRoaXMuX3VwZGF0ZVN0YXR1c2VzKClcblxuICAgICAgICBzdGFydFdhdGNoOiAtPlxuICAgICAgICAgICAgdGhpcy5zdGF0dXNMaXN0ZW5lciA9ICRyb290U2NvcGUuJG9uKE1PTklUX1NUQVRVU19VUERBVEUsID0+IHRoaXMuX3VwZGF0ZVN0YXR1c2VzKCkpXG4gICAgICAgICAgICB0aGlzLnNjaGVkdWxlTGlzdGVuZXIgPSAkcm9vdFNjb3BlLiRvbihNT05JVF9TQ0hFRFVMRV9VUERBVEUsIChlLCBkYXRhKSA9PiB0aGlzLl9wcm9jZXNzU2NoZWR1bGVFdmVudChlLCBkYXRhKSlcblxuICAgICAgICBzdG9wV2F0Y2g6IC0+XG4gICAgICAgICAgICBpZiB0aGlzLnN0YXR1c0xpc3RlbmVyXG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0dXNMaXN0ZW5lcigpXG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0dXNMaXN0ZW5lciA9IHVuZGVmaW5lZFxuXG4gICAgICAgICAgICBpZiB0aGlzLnNjaGVkdWxlTGlzdGVuZXJcbiAgICAgICAgICAgICAgICB0aGlzLnNjaGVkdWxlTGlzdGVuZXIoKVxuICAgICAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVMaXN0ZW5lciA9IHVuZGVmaW5lZFxuXG4gICAgICAgIGdldEluZGV4OiAoc2NoZWR1bGVJZCkgLT5cbiAgICAgICAgICAgIGZvciBzY2hlZHVsZSwgaSBpbiB0aGlzLnNjaGVkdWxlc1xuICAgICAgICAgICAgICAgIGlmIHNjaGVkdWxlLmlkID09IHNjaGVkdWxlSWRcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGlcblxuICAgICAgICBnZXRTY2hlZHVsZTogKHNjaGVkdWxlSWQpIC0+XG4gICAgICAgICAgICBpbmRleCA9IHRoaXMuZ2V0SW5kZXgoc2NoZWR1bGVJZClcbiAgICAgICAgICAgIHNjaGVkdWxlID0gdGhpcy5zY2hlZHVsZXNbaW5kZXhdXG4gICAgICAgICAgICByZXR1cm4gc2NoZWR1bGVcblxuICAgICAgICBfdXBkYXRlU3RhdHVzZXM6IC0+XG4gICAgICAgICAgICBmb3Igc2NoZWR1bGUgaW4gdGhpcy5zY2hlZHVsZXNcbiAgICAgICAgICAgICAgICBzY2hlZHVsZS51cGRhdGVIb3N0c1N0YXR1cygpXG5cbiAgICAgICAgX3Byb2Nlc3NTY2hlZHVsZUV2ZW50OiAoZSwgZGF0YSkgLT5cbiAgICAgICAgICAgIGlmIGRhdGEuZXZlbnQgPT0gJ2NyZWF0ZScgb3IgZGF0YS5ldmVudCA9PSAndXBkYXRlJ1xuICAgICAgICAgICAgICAgIHRoaXMuX3VwZGF0ZVNjaGVkdWxlKGRhdGEuaW5zdGFuY2UpXG4gICAgICAgICAgICBlbHNlIGlmIGRhdGEuZXZlbnQgPT0gJ2RlbGV0ZSdcbiAgICAgICAgICAgICAgICB0aGlzLl9kZWxldGVTY2hlZHVsZShkYXRhLmluc3RhbmNlKVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICRsb2cuZXJyb3IoJ1VuZXhwZWN0ZWQgbW9uaXRTY2hlZHVsZUxpc3RlbmVyIGRhdGEnLCBkYXRhKVxuICAgICAgICAgICAgdGhpcy5fdXBkYXRlU3RhdHVzZXMoKVxuXG4gICAgICAgIF91cGRhdGVTY2hlZHVsZTogKHNjaGVkdWxlRGF0YSkgLT5cbiAgICAgICAgICAgIHNjaGVkdWxlID0gdGhpcy5nZXRTY2hlZHVsZShzY2hlZHVsZURhdGEuaWQpXG4gICAgICAgICAgICBpZiBzY2hlZHVsZVxuICAgICAgICAgICAgICAgIHNjaGVkdWxlLnVwZGF0ZShzY2hlZHVsZURhdGEpXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgbmV3X3NjaGVkdWxlID0gbmV3IE1vbml0U2NoZWR1bGUoc2NoZWR1bGVEYXRhKVxuICAgICAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVzLnB1c2gobmV3X3NjaGVkdWxlKVxuICAgICAgICAgICAgJGxvZy5kZWJ1ZygnX3VwZGF0ZVNjaGVkdWxlJylcblxuICAgICAgICBfZGVsZXRlU2NoZWR1bGU6IChzY2hlZHVsZURhdGEpIC0+XG4gICAgICAgICAgICBpbmRleCA9IHRoaXMuZ2V0SW5kZXgoc2NoZWR1bGVEYXRhLmlkKVxuICAgICAgICAgICAgaWYgaW5kZXhcbiAgICAgICAgICAgICAgICB0aGlzLnNjaGVkdWxlcy5zcGxpY2UoaW5kZXgsIDEpXG4gICAgICAgICAgICAkbG9nLmRlYnVnKCdfZGVsZXRlU2NoZWR1bGUnKVxuXG4gICAgcmV0dXJuIE1vbml0U2NoZWR1bGVDb2xsZWN0aW9uXG4iLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG5cbi5jb25zdGFudCgnTU9OSVRfU0NIRURVTEVfVVBEQVRFJywgJ01PTklUX1NDSEVEVUxFX1VQREFURScpXG4uY29uc3RhbnQoJ01PTklUX1NUQVRVU19VUERBVEUnLCAnTU9OSVRfU1RBVFVTX1VQREFURScpXG4uY29uc3RhbnQoJ1dBSVRJTkdfVEFTS1NfVVBEQVRFJywgJ1dBSVRJTkdfVEFTS1NfVVBEQVRFJylcbi5jb25zdGFudCgnV09SS0VSU19VUERBVEUnLCAnV09SS0VSU19VUERBVEUnKVxuXG4uc2VydmljZSAnbW9uaXRTdGF0dXMnLCAoXG4gICAgICAgICRsb2csICRyb290U2NvcGUsIHN3SHR0cEhlbHBlciwgc3dXZWJTb2NrZXQsIGNvbmZpZyxcbiAgICAgICAgTU9OSVRfU0NIRURVTEVfVVBEQVRFLCBNT05JVF9TVEFUVVNfVVBEQVRFLCBXQUlUSU5HX1RBU0tTX1VQREFURSwgV09SS0VSU19VUERBVEUpIC0+XG4gICAgc3RhdHVzID0gW11cbiAgICB3YWl0aW5nID0gW11cbiAgICB3b3JrZXJzID0gW11cblxuICAgIHVwZGF0ZVN0YXR1cyA9IChzdGF0dXNJdGVtKSAtPlxuICAgICAgICBmb3IgaXRlbSwgaSBpbiBzdGF0dXNcbiAgICAgICAgICAgIGlmIGl0ZW0ubW9uaXRfbmFtZSA9PSBzdGF0dXNJdGVtLm1vbml0X25hbWUgXFxcbiAgICAgICAgICAgICAgICBhbmQgaXRlbS5ob3N0X2FkZHJlc3MgPT0gc3RhdHVzSXRlbS5ob3N0X2FkZHJlc3MgXFxcbiAgICAgICAgICAgICAgICBhbmQgaXRlbS5zY2hlZHVsZV9pZCA9PSBzdGF0dXNJdGVtLnNjaGVkdWxlX2lkXG4gICAgICAgICAgICAgICAgICAgIHN0YXR1c1tpXSA9IHN0YXR1c0l0ZW1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgIHN0YXR1cy5wdXNoKHN0YXR1c0l0ZW0pXG5cbiAgICB1cGRhdGVXYWl0aW5nID0gKHdhaXRpbmdUYXNrcykgLT5cbiAgICAgICAgd2FpdGluZy5sZW5ndGggPSAwXG4gICAgICAgIGZvciB0YXNrIGluIHdhaXRpbmdUYXNrc1xuICAgICAgICAgICAgd2FpdGluZy5wdXNoKHRhc2spXG5cbiAgICB1cGRhdGVXb3JrZXJzID0gKGN1cnJlbnRXb3JrZXJzKSAtPlxuICAgICAgICB3b3JrZXJzLmxlbmd0aCA9IDBcbiAgICAgICAgZm9yIHdvcmtlciBpbiBjdXJyZW50V29ya2Vyc1xuICAgICAgICAgICAgd29ya2Vycy5wdXNoKHdvcmtlcilcblxuICAgIHN1YnNjcmliZU1vbml0U3RhdHVzID0gLT5cbiAgICAgICAgc29ja2V0ID0gbmV3IHN3V2ViU29ja2V0KFwiI3sgY29uZmlnLndzU2VydmVyQWRkcmVzcyB9L21vbml0c1wiKVxuXG4gICAgICAgIHNvY2tldC5vbk1lc3NhZ2UgKG1zZykgLT5cbiAgICAgICAgICAgIHN0YXR1c0l0ZW0gPSBKU09OLnBhcnNlKG1zZylcbiAgICAgICAgICAgIHVwZGF0ZVN0YXR1cyhzdGF0dXNJdGVtKVxuIyAgICAgICAgICAgICRsb2cuZGVidWcoc3RhdHVzSXRlbSlcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChNT05JVF9TVEFUVVNfVVBEQVRFLCBzdGF0dXMpXG5cbiAgICAgICAgZHVyYWJsZSA9IHRydWVcbiAgICAgICAgc29ja2V0LnN0YXJ0KGR1cmFibGUpXG4jICAgICAgICAkbG9nLmRlYnVnKCdzdGFydCBzdWJzY3JpYmVNb25pdFN0YXR1cycpXG5cblxuICAgIHN1YnNjcmliZU1vbml0U2NoZWR1bGUgPSAtPlxuICAgICAgICBzb2NrZXQgPSBuZXcgc3dXZWJTb2NrZXQoXCIjeyBjb25maWcud3NTZXJ2ZXJBZGRyZXNzIH0vbW9uaXRfc2NoZWR1bGVzXCIpXG5cbiAgICAgICAgc29ja2V0Lm9uTWVzc2FnZSAobXNnKSAtPlxuICAgICAgICAgICAgbW9uaXRTY2hlZHVsZSA9IEpTT04ucGFyc2UobXNnKVxuIyAgICAgICAgICAgICRsb2cuZGVidWcoJ3N1YnNjcmliZU1vbml0U2NoZWR1bGUnLCBtb25pdFNjaGVkdWxlKVxuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KE1PTklUX1NDSEVEVUxFX1VQREFURSwgbW9uaXRTY2hlZHVsZSlcblxuICAgICAgICBkdXJhYmxlID0gdHJ1ZVxuICAgICAgICBzb2NrZXQuc3RhcnQoZHVyYWJsZSlcblxuXG4gICAgc3Vic2NyaWJlV2FpdGluZ1Rhc2tzID0gLT5cbiAgICAgICAgc29ja2V0ID0gbmV3IHN3V2ViU29ja2V0KFwiI3sgY29uZmlnLndzU2VydmVyQWRkcmVzcyB9L3dhaXRpbmdfdGFza3NcIilcblxuICAgICAgICBzb2NrZXQub25NZXNzYWdlIChtc2cpIC0+XG4gICAgICAgICAgICB3YWl0aW5nVGFza3MgPSBKU09OLnBhcnNlKG1zZykud2FpdGluZ190YXNrc1xuICAgICAgICAgICAgdXBkYXRlV2FpdGluZyh3YWl0aW5nVGFza3MpXG4jICAgICAgICAgICAgJGxvZy5kZWJ1Zygnc3Vic2NyaWJlV2FpdGluZ1Rhc2tzJywgd2FpdGluZ1Rhc2tzKVxuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KFdBSVRJTkdfVEFTS1NfVVBEQVRFLCB3YWl0aW5nKVxuXG4gICAgICAgIGR1cmFibGUgPSB0cnVlXG4gICAgICAgIHNvY2tldC5zdGFydChkdXJhYmxlKVxuXG5cbiAgICBzdWJzY3JpYmVXb3JrZXJzVGFza3MgPSAtPlxuICAgICAgICBzb2NrZXQgPSBuZXcgc3dXZWJTb2NrZXQoXCIjeyBjb25maWcud3NTZXJ2ZXJBZGRyZXNzIH0vY3VycmVudF93b3JrZXJzXCIpXG5cbiAgICAgICAgc29ja2V0Lm9uTWVzc2FnZSAobXNnKSAtPlxuICAgICAgICAgICAgY3VycmVudFdvcmtlcnMgPSBKU09OLnBhcnNlKG1zZykuY3VycmVudF93b3JrZXJzXG4gICAgICAgICAgICB1cGRhdGVXb3JrZXJzKGN1cnJlbnRXb3JrZXJzKVxuIyAgICAgICAgICAgICRsb2cuZGVidWcoJ3N1YnNjcmliZVdvcmtlcnNUYXNrcycsIGN1cnJlbnRXb3JrZXJzKVxuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KFdPUktFUlNfVVBEQVRFLCB3b3JrZXJzKVxuXG4gICAgICAgIGR1cmFibGUgPSB0cnVlXG4gICAgICAgIHNvY2tldC5zdGFydChkdXJhYmxlKVxuXG5cbiAgICB0aGlzLnN0YXJ0ID0gLT5cbiMgICAgICAgICRsb2cuaW5mbyAnc3RhcnQgTW9uaXRTdGF0dXMnXG4gICAgICAgIHRoaXMuZ2V0TGF0ZXN0KCkudGhlbihzdWJzY3JpYmVNb25pdFN0YXR1cylcbiAgICAgICAgc3Vic2NyaWJlTW9uaXRTY2hlZHVsZSgpXG4gICAgICAgIHN1YnNjcmliZVdhaXRpbmdUYXNrcygpXG4gICAgICAgIHN1YnNjcmliZVdvcmtlcnNUYXNrcygpXG5cbiAgICB0aGlzLmdldExhdGVzdCA9IC0+XG4gICAgICAgIHJldHVybiBzd0h0dHBIZWxwZXIuZ2V0KFwiI3sgY29uZmlnLnNlcnZlckFkZHJlc3MgfS9tb25pdF9zdGF0dXNfbGF0ZXN0L1wiKS50aGVuIChyZXNwb25zZSkgLT5cbiAgICAgICAgICAgIHN0YXR1cy5sZW5ndGggPSAwXG4gICAgICAgICAgICBmb3IgaXRlbSBpbiByZXNwb25zZS5kYXRhLm1vbml0X3N0YXR1c19sYXRlc3RcbiAgICAgICAgICAgICAgICBzdGF0dXMucHVzaChpdGVtKVxuXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoTU9OSVRfU1RBVFVTX1VQREFURSwgc3RhdHVzKVxuXG4gICAgICAgICAgICByZXR1cm4gc3RhdHVzXG5cbiAgICB0aGlzLmdldFN0YXR1cyA9IC0+XG4gICAgICAgIHJldHVybiBzdGF0dXNcblxuICAgIHRoaXMuZ2V0V2FpdGluZyA9IC0+XG4gICAgICAgIHJldHVybiB3YWl0aW5nXG5cbiAgICAjIFRPRE86IG1vdmUgb3V0IGZyb20gbW9uaXRTdGF0dXMgc2VydmljZVxuICAgIHRoaXMuZ2V0V29ya2VycyA9IC0+XG4gICAgICAgIHJldHVybiB3b3JrZXJzXG5cbiAgICByZXR1cm4gdGhpcyIsImFuZ3VsYXIubW9kdWxlKCdwYXJrS2VlcGVyJylcblxuLmZhY3RvcnkgJ01vbml0VGFzaycsIChjb25maWcsIHN3SHR0cEhlbHBlcikgLT5cbiAgICBjbGFzcyBNb25pdFRhc2tcblxuICAgICAgICBjb25zdHJ1Y3RvcjogKGRhdGEpIC0+XG4gICAgICAgICAgICBhbmd1bGFyLmV4dGVuZCh0aGlzLCBkYXRhIG9yIHt9KVxuXG4gICAgICAgIEBnZXQ6ICh0YXNrSWQpIC0+XG4gICAgICAgICAgICByZXR1cm4gc3dIdHRwSGVscGVyLmdldChcIiN7IGNvbmZpZy5zZXJ2ZXJBZGRyZXNzIH0vbW9uaXRfdGFzay8jeyB0YXNrSWQgfVwiKS50aGVuIChyZXNwb25zZSkgLT5cbiAgICAgICAgICAgICAgICB0YXNrID0gbmV3IE1vbml0VGFzayhyZXNwb25zZS5kYXRhKVxuICAgICAgICAgICAgICAgIHJldHVybiB0YXNrXG5cbiAgICByZXR1cm4gTW9uaXRUYXNrXG5cbiIsImFuZ3VsYXIubW9kdWxlKCdwYXJrS2VlcGVyJylcblxuLmZhY3RvcnkgJ1dvcmtTY2hlZHVsZVJlc291cmNlJywgKCRyZXNvdXJjZSwgY29uZmlnKSAtPlxuICAgIHVybCA9IFwiI3sgY29uZmlnLnNlcnZlckFkZHJlc3MgfS93b3JrX3NjaGVkdWxlLzppZC9cIlxuICAgIHJldHVybiAkcmVzb3VyY2UodXJsKVxuXG5cbi5mYWN0b3J5ICdXb3JrU2NoZWR1bGUnLCAoJGxvZywgd29ya1N0YXR1cywgV29ya1NjaGVkdWxlUmVzb3VyY2UpIC0+XG4gICAgY2xhc3MgV29ya1NjaGVkdWxlXG5cbiAgICAgICAgQGxvYWQ6IChpZCkgLT5cbiAgICAgICAgICAgIHNjaGVkdWxlID0gbmV3IFdvcmtTY2hlZHVsZSgpXG4gICAgICAgICAgICBzY2hlZHVsZURhdGEgPSBXb3JrU2NoZWR1bGVSZXNvdXJjZS5nZXQge2lkOiBpZH0sIC0+XG4gICAgICAgICAgICAgICAgc2NoZWR1bGUgPSBzY2hlZHVsZS51cGRhdGUoc2NoZWR1bGVEYXRhKVxuICAgICAgICAgICAgICAgIHNjaGVkdWxlLnVwZGF0ZUhvc3RzU3RhdHVzKClcbiAgICAgICAgICAgIHJldHVybiBzY2hlZHVsZVxuXG4gICAgICAgIGNvbnN0cnVjdG9yOiAoZGF0YSkgLT5cbiAgICAgICAgICAgIHRoaXMubGF0ZXN0U3RhdHVzRHQgPSB1bmRlZmluZWRcbiAgICAgICAgICAgIHRoaXMubGF0ZXN0U3RhdHVzTGV2ZWwgPSB1bmRlZmluZWRcbiAgICAgICAgICAgIGFuZ3VsYXIuZXh0ZW5kKHRoaXMsIGRhdGEgb3Ige30pXG5cbiAgICAgICAgZ2V0TGFiZWw6IC0+XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5uYW1lIG9yIHRoaXMud29yaz8ubmFtZVxuXG4gICAgICAgIHVwZGF0ZTogKGRhdGEpIC0+XG4gICAgICAgICAgICBhbmd1bGFyLmV4dGVuZCh0aGlzLCBkYXRhIG9yIHt9KVxuXG4gICAgICAgIHVwZGF0ZUhvc3RzU3RhdHVzOiAtPlxuICAgICAgICAgICAgZm9yIHN0YXR1c0l0ZW0gaW4gd29ya1N0YXR1cy5nZXRTdGF0dXMoKVxuICAgICAgICAgICAgICAgIGlmIHN0YXR1c0l0ZW0uc2NoZWR1bGVfaWQgIT0gdGhpcy5pZFxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZVxuXG4gICAgICAgICAgICAgICAgaG9zdCA9IHRoaXMuZ2V0SG9zdChzdGF0dXNJdGVtLmhvc3RfYWRkcmVzcylcbiAgICAgICAgICAgICAgICBpZiBub3QgaG9zdFxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZVxuXG4gICAgICAgICAgICAgICAgdGhpcy5sYXRlc3RTdGF0dXNMZXZlbCA9IHVuZGVmaW5lZFxuXG4gICAgICAgICAgICAgICAgaWYgc3RhdHVzSXRlbS5yZXN1bHRfZHRcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzSXRlbS5yZXN1bHRfZHQgPSBtb21lbnQoc3RhdHVzSXRlbS5yZXN1bHRfZHQpLnRvRGF0ZSgpXG5cbiAgICAgICAgICAgICAgICBob3N0LnN0YXR1cyA9IHN0YXR1c0l0ZW1cbiAgICAgICAgICAgICAgICBpZiBub3QgdGhpcy5sYXRlc3RTdGF0dXNEdCBvciBob3N0LnN0YXR1cy5yZXN1bHRfZHQgPiB0aGlzLmxhdGVzdFN0YXR1c0R0XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGF0ZXN0U3RhdHVzRHQgPSBob3N0LnN0YXR1cy5yZXN1bHRfZHRcblxuICAgICAgICAgICAgICAgIGlmIG5vdCB0aGlzLmxhdGVzdFN0YXR1c0xldmVsIG9yIHRoaXMubGF0ZXN0U3RhdHVzTGV2ZWwgPCBob3N0LnN0YXR1cy5sZXZlbFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxhdGVzdFN0YXR1c0xldmVsID0gaG9zdC5zdGF0dXMubGV2ZWxcblxuICAgICAgICAgICAgICAgIGlmIG5vdCB0aGlzLmxhdGVzdFN0YXR1c0R0IG9yIHRoaXMubGF0ZXN0U3RhdHVzRHQgPCBob3N0LnN0YXR1cy5yZXN1bHRfZHRcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sYXRlc3RTdGF0dXNEdCA9IGhvc3Quc3RhdHVzLnJlc3VsdF9kdFxuXG4gICAgICAgIGdldEhvc3Q6IChob3N0QWRkcmVzcykgLT5cbiAgICAgICAgICAgIGZvciBob3N0IGluIHRoaXMuYWxsX2hvc3RzXG4gICAgICAgICAgICAgICAgaWYgaG9zdC5hZGRyZXNzID09IGhvc3RBZGRyZXNzXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBob3N0XG5cbiAgICAgICAgaXNVbmRlZmluZWQ6IC0+XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5sYXRlc3RTdGF0dXNMZXZlbCA9PSB1bmRlZmluZWRcbiAgICAgICAgaXNPazogLT5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxhdGVzdFN0YXR1c0xldmVsID09IDFcbiAgICAgICAgaXNXYXJuaW5nOiAtPlxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubGF0ZXN0U3RhdHVzTGV2ZWwgPT0gMlxuICAgICAgICBpc0ZhaWw6IC0+XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5sYXRlc3RTdGF0dXNMZXZlbCA9PSAzXG4gICAgICAgICAgICBcbiAgICAgICAgZ2V0TGV2ZWxMYWJlbDogLT5cbiAgICAgICAgICAgIGlmIHRoaXMuaXNVbmRlZmluZWQoKVxuICAgICAgICAgICAgICAgIHJldHVybiAnVW5kZWZpbmVkJ1xuICAgICAgICAgICAgZWxzZSBpZiB0aGlzLmlzT2soKVxuICAgICAgICAgICAgICAgIHJldHVybiAnT2snXG4gICAgICAgICAgICBlbHNlIGlmIHRoaXMuaXNXYXJuaW5nKClcbiAgICAgICAgICAgICAgICByZXR1cm4gJ1dhcm5pbmcnXG4gICAgICAgICAgICBlbHNlIGlmIHRoaXMuaXNGYWlsKClcbiAgICAgICAgICAgICAgICByZXR1cm4gJ0ZhaWwnXG5cbiAgICAgICAgaXNGcmVzaDogLT5cbiAgICAgICAgICAgIGRlYWRsaW5lID0gbW9tZW50KCkuc3VidHJhY3QodGhpcy5wZXJpb2QgKiAyLCAnc2Vjb25kcycpLnRvRGF0ZSgpXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5sYXRlc3RTdGF0dXNEdCA+IGRlYWRsaW5lXG5cbiAgICByZXR1cm4gV29ya1NjaGVkdWxlXG5cblxuLmZhY3RvcnkgJ1dvcmtTY2hlZHVsZUNvbGxlY3Rpb24nLCAoJGxvZywgJHJvb3RTY29wZSwgV29ya1NjaGVkdWxlLCBXb3JrU2NoZWR1bGVSZXNvdXJjZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFdPUktfU1RBVFVTX1VQREFURSwgV09SS19TQ0hFRFVMRV9VUERBVEUpIC0+XG4gICAgY2xhc3MgV29ya1NjaGVkdWxlQ29sbGVjdGlvblxuXG4gICAgICAgIGNvbnN0cnVjdG9yOiAtPlxuICAgICAgICAgICAgdGhpcy5zY2hlZHVsZXMgPSBbXVxuICAgICAgICAgICAgdGhpcy5zdGF0dXNMaXN0ZW5lciA9IHVuZGVmaW5lZFxuICAgICAgICAgICAgdGhpcy5zY2hlZHVsZUxpc3RlbmVyID0gdW5kZWZpbmVkXG5cbiAgICAgICAgbG9hZEFsbDogLT5cbiAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVzLmxlbmd0aCA9IDBcbiAgICAgICAgICAgIHNjaGVkdWxlc0RhdGEgPSBXb3JrU2NoZWR1bGVSZXNvdXJjZS5xdWVyeSA9PlxuICAgICAgICAgICAgICAgIGZvciBpdGVtRGF0YSBpbiBzY2hlZHVsZXNEYXRhXG4gICAgICAgICAgICAgICAgICAgIHNjaGVkdWxlID0gbmV3IFdvcmtTY2hlZHVsZShpdGVtRGF0YSlcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zY2hlZHVsZXMucHVzaChzY2hlZHVsZSlcbiAgICAgICAgICAgICAgICB0aGlzLl91cGRhdGVTdGF0dXNlcygpXG5cbiAgICAgICAgc3RhcnRXYXRjaDogLT5cbiAgICAgICAgICAgIHRoaXMuc3RhdHVzTGlzdGVuZXIgPSAkcm9vdFNjb3BlLiRvbihXT1JLX1NUQVRVU19VUERBVEUsID0+IHRoaXMuX3VwZGF0ZVN0YXR1c2VzKCkpXG4gICAgICAgICAgICB0aGlzLnNjaGVkdWxlTGlzdGVuZXIgPSAkcm9vdFNjb3BlLiRvbihXT1JLX1NDSEVEVUxFX1VQREFURSwgKGUsIGRhdGEpID0+IHRoaXMuX3Byb2Nlc3NTY2hlZHVsZUV2ZW50KGUsIGRhdGEpKVxuXG4gICAgICAgIHN0b3BXYXRjaDogLT5cbiAgICAgICAgICAgIGlmIHRoaXMuc3RhdHVzTGlzdGVuZXJcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXR1c0xpc3RlbmVyKClcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXR1c0xpc3RlbmVyID0gdW5kZWZpbmVkXG5cbiAgICAgICAgICAgIGlmIHRoaXMuc2NoZWR1bGVMaXN0ZW5lclxuICAgICAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVMaXN0ZW5lcigpXG4gICAgICAgICAgICAgICAgdGhpcy5zY2hlZHVsZUxpc3RlbmVyID0gdW5kZWZpbmVkXG5cbiAgICAgICAgZ2V0SW5kZXg6IChzY2hlZHVsZUlkKSAtPlxuICAgICAgICAgICAgZm9yIHNjaGVkdWxlLCBpIGluIHRoaXMuc2NoZWR1bGVzXG4gICAgICAgICAgICAgICAgaWYgc2NoZWR1bGUuaWQgPT0gc2NoZWR1bGVJZFxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaVxuXG4gICAgICAgIGdldFNjaGVkdWxlOiAoc2NoZWR1bGVJZCkgLT5cbiAgICAgICAgICAgIGluZGV4ID0gdGhpcy5nZXRJbmRleChzY2hlZHVsZUlkKVxuICAgICAgICAgICAgc2NoZWR1bGUgPSB0aGlzLnNjaGVkdWxlc1tpbmRleF1cbiAgICAgICAgICAgIHJldHVybiBzY2hlZHVsZVxuXG4gICAgICAgIF91cGRhdGVTdGF0dXNlczogLT5cbiAgICAgICAgICAgIGZvciBzY2hlZHVsZSBpbiB0aGlzLnNjaGVkdWxlc1xuICAgICAgICAgICAgICAgIHNjaGVkdWxlLnVwZGF0ZUhvc3RzU3RhdHVzKClcblxuICAgICAgICBfcHJvY2Vzc1NjaGVkdWxlRXZlbnQ6IChlLCBkYXRhKSAtPlxuICAgICAgICAgICAgaWYgZGF0YS5ldmVudCA9PSAnY3JlYXRlJyBvciBkYXRhLmV2ZW50ID09ICd1cGRhdGUnXG4gICAgICAgICAgICAgICAgdGhpcy5fdXBkYXRlU2NoZWR1bGUoZGF0YS5pbnN0YW5jZSlcbiAgICAgICAgICAgIGVsc2UgaWYgZGF0YS5ldmVudCA9PSAnZGVsZXRlJ1xuICAgICAgICAgICAgICAgIHRoaXMuX2RlbGV0ZVNjaGVkdWxlKGRhdGEuaW5zdGFuY2UpXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgJGxvZy5lcnJvcignVW5leHBlY3RlZCB3b3JrU2NoZWR1bGVMaXN0ZW5lciBkYXRhJywgZGF0YSlcbiAgICAgICAgICAgIHRoaXMuX3VwZGF0ZVN0YXR1c2VzKClcblxuICAgICAgICBfdXBkYXRlU2NoZWR1bGU6IChzY2hlZHVsZURhdGEpIC0+XG4gICAgICAgICAgICBzY2hlZHVsZSA9IHRoaXMuZ2V0U2NoZWR1bGUoc2NoZWR1bGVEYXRhLmlkKVxuICAgICAgICAgICAgaWYgc2NoZWR1bGVcbiAgICAgICAgICAgICAgICBzY2hlZHVsZS51cGRhdGUoc2NoZWR1bGVEYXRhKVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIG5ld19zY2hlZHVsZSA9IG5ldyBXb3JrU2NoZWR1bGUoc2NoZWR1bGVEYXRhKVxuICAgICAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVzLnB1c2gobmV3X3NjaGVkdWxlKVxuICAgICAgICAgICAgJGxvZy5kZWJ1ZygnX3VwZGF0ZVNjaGVkdWxlJylcblxuICAgICAgICBfZGVsZXRlU2NoZWR1bGU6IChzY2hlZHVsZURhdGEpIC0+XG4gICAgICAgICAgICBpbmRleCA9IHRoaXMuZ2V0SW5kZXgoc2NoZWR1bGVEYXRhLmlkKVxuICAgICAgICAgICAgaWYgaW5kZXhcbiAgICAgICAgICAgICAgICB0aGlzLnNjaGVkdWxlcy5zcGxpY2UoaW5kZXgsIDEpXG4gICAgICAgICAgICAkbG9nLmRlYnVnKCdfZGVsZXRlU2NoZWR1bGUnKVxuXG4gICAgcmV0dXJuIFdvcmtTY2hlZHVsZUNvbGxlY3Rpb25cbiIsImFuZ3VsYXIubW9kdWxlKCdwYXJrS2VlcGVyJylcblxuLmNvbnN0YW50KCdXT1JLX1NDSEVEVUxFX1VQREFURScsICdXT1JLX1NDSEVEVUxFX1VQREFURScpXG4uY29uc3RhbnQoJ1dPUktfU1RBVFVTX1VQREFURScsICdXT1JLX1NUQVRVU19VUERBVEUnKVxuXG5cbi5zZXJ2aWNlICd3b3JrU3RhdHVzJywgKFxuICAgICAgICAkbG9nLCAkcm9vdFNjb3BlLCBzd0h0dHBIZWxwZXIsIHN3V2ViU29ja2V0LCBjb25maWcsXG4gICAgICAgIFdPUktfU0NIRURVTEVfVVBEQVRFLCBXT1JLX1NUQVRVU19VUERBVEUpIC0+XG4gICAgc3RhdHVzID0gW11cblxuICAgIHVwZGF0ZVN0YXR1cyA9IChzdGF0dXNJdGVtKSAtPlxuICAgICAgICBmb3IgaXRlbSwgaSBpbiBzdGF0dXNcbiAgICAgICAgICAgIGlmIGl0ZW0ud29ya19uYW1lID09IHN0YXR1c0l0ZW0ud29ya19uYW1lIFxcXG4gICAgICAgICAgICAgICAgYW5kIGl0ZW0uaG9zdF9hZGRyZXNzID09IHN0YXR1c0l0ZW0uaG9zdF9hZGRyZXNzIFxcXG4gICAgICAgICAgICAgICAgYW5kIGl0ZW0uc2NoZWR1bGVfaWQgPT0gc3RhdHVzSXRlbS5zY2hlZHVsZV9pZFxuICAgICAgICAgICAgICAgICAgICBzdGF0dXNbaV0gPSBzdGF0dXNJdGVtXG4gICAgICAgICAgICAgICAgICAgIHJldHVyblxuICAgICAgICBzdGF0dXMucHVzaChzdGF0dXNJdGVtKVxuXG4gICAgc3Vic2NyaWJlV29ya1N0YXR1cyA9IC0+XG4gICAgICAgIHNvY2tldCA9IG5ldyBzd1dlYlNvY2tldChcIiN7IGNvbmZpZy53c1NlcnZlckFkZHJlc3MgfS93b3Jrc1wiKVxuXG4gICAgICAgIHNvY2tldC5vbk1lc3NhZ2UgKG1zZykgLT5cbiAgICAgICAgICAgIHN0YXR1c0l0ZW0gPSBKU09OLnBhcnNlKG1zZylcbiAgICAgICAgICAgIHVwZGF0ZVN0YXR1cyhzdGF0dXNJdGVtKVxuIyAgICAgICAgICAgICRsb2cuZGVidWcoc3RhdHVzSXRlbSlcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChXT1JLX1NUQVRVU19VUERBVEUsIHN0YXR1cylcblxuICAgICAgICBkdXJhYmxlID0gdHJ1ZVxuICAgICAgICBzb2NrZXQuc3RhcnQoZHVyYWJsZSlcbiMgICAgICAgICRsb2cuZGVidWcoJ3N0YXJ0IHN1YnNjcmliZVdvcmtTdGF0dXMnKVxuXG5cbiAgICBzdWJzY3JpYmVXb3JrU2NoZWR1bGUgPSAtPlxuICAgICAgICBzb2NrZXQgPSBuZXcgc3dXZWJTb2NrZXQoXCIjeyBjb25maWcud3NTZXJ2ZXJBZGRyZXNzIH0vd29ya19zY2hlZHVsZXNcIilcblxuICAgICAgICBzb2NrZXQub25NZXNzYWdlIChtc2cpIC0+XG4gICAgICAgICAgICB3b3JrU2NoZWR1bGUgPSBKU09OLnBhcnNlKG1zZylcbiMgICAgICAgICAgICAkbG9nLmRlYnVnKCdzdWJzY3JpYmVXb3JrU2NoZWR1bGUnLCB3b3JrU2NoZWR1bGUpXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoV09SS19TQ0hFRFVMRV9VUERBVEUsIHdvcmtTY2hlZHVsZSlcblxuICAgICAgICBkdXJhYmxlID0gdHJ1ZVxuICAgICAgICBzb2NrZXQuc3RhcnQoZHVyYWJsZSlcblxuXG4gICAgdGhpcy5zdGFydCA9IC0+XG4jICAgICAgICAkbG9nLmluZm8gJ3N0YXJ0IFdvcmtTdGF0dXMnXG4gICAgICAgIHRoaXMuZ2V0TGF0ZXN0KCkudGhlbihzdWJzY3JpYmVXb3JrU3RhdHVzKVxuICAgICAgICBzdWJzY3JpYmVXb3JrU2NoZWR1bGUoKVxuXG4gICAgdGhpcy5nZXRMYXRlc3QgPSAtPlxuICAgICAgICByZXR1cm4gc3dIdHRwSGVscGVyLmdldChcIiN7IGNvbmZpZy5zZXJ2ZXJBZGRyZXNzIH0vd29ya19zdGF0dXNfbGF0ZXN0L1wiKS50aGVuIChyZXNwb25zZSkgLT5cbiAgICAgICAgICAgIHN0YXR1cy5sZW5ndGggPSAwXG4gICAgICAgICAgICBmb3IgaXRlbSBpbiByZXNwb25zZS5kYXRhLndvcmtfc3RhdHVzX2xhdGVzdFxuICAgICAgICAgICAgICAgIHN0YXR1cy5wdXNoKGl0ZW0pXG5cbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChXT1JLX1NUQVRVU19VUERBVEUsIHN0YXR1cylcblxuICAgICAgICAgICAgcmV0dXJuIHN0YXR1c1xuXG4gICAgdGhpcy5nZXRTdGF0dXMgPSAtPlxuICAgICAgICByZXR1cm4gc3RhdHVzXG5cbiAgICByZXR1cm4gdGhpcyIsImFuZ3VsYXIubW9kdWxlKCdwYXJrS2VlcGVyJylcblxuLmZhY3RvcnkgJ1dvcmtUYXNrJywgKGNvbmZpZywgc3dIdHRwSGVscGVyKSAtPlxuICAgIGNsYXNzIFdvcmtUYXNrXG5cbiAgICAgICAgY29uc3RydWN0b3I6IChkYXRhKSAtPlxuICAgICAgICAgICAgYW5ndWxhci5leHRlbmQodGhpcywgZGF0YSBvciB7fSlcblxuICAgICAgICBAZ2V0OiAodGFza0lkKSAtPlxuICAgICAgICAgICAgcmV0dXJuIHN3SHR0cEhlbHBlci5nZXQoXCIjeyBjb25maWcuc2VydmVyQWRkcmVzcyB9L3dvcmtfdGFzay8jeyB0YXNrSWQgfVwiKS50aGVuIChyZXNwb25zZSkgLT5cbiAgICAgICAgICAgICAgICB0YXNrID0gbmV3IFdvcmtUYXNrKHJlc3BvbnNlLmRhdGEpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRhc2tcblxuICAgIHJldHVybiBXb3JrVGFza1xuXG4iLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG4uY29udHJvbGxlciAnTW9uaXRTY2hlZHVsZUxhdGVzdFJlc3VsdHNDdHJsJywgKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTW9uaXRTY2hlZHVsZSwgTU9OSVRfU1RBVFVTX1VQREFURSkgLT5cbiAgICAkc2NvcGUuc2NoZWR1bGUgPSBNb25pdFNjaGVkdWxlLmxvYWQoJHJvdXRlUGFyYW1zLmlkKVxuXG4gICAgc3RhdHVzTGlzdGVuZXIgPSAkc2NvcGUuJG9uKE1PTklUX1NUQVRVU19VUERBVEUsIC0+XG4gICAgICAgICRzY29wZS5zY2hlZHVsZS51cGRhdGVIb3N0c1N0YXR1cygpXG4gICAgKVxuICAgICRzY29wZS4kb24oJyRkZXN0cm95Jywgc3RhdHVzTGlzdGVuZXIpXG4iLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG4uY29udHJvbGxlciAnTW9uaXRUYXNrRGV0YWlsQ3RybCcsICgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJGxvZywgTW9uaXRUYXNrKSAtPlxuICAgIE1vbml0VGFzay5nZXQoJHJvdXRlUGFyYW1zLmlkKS50aGVuICh0YXNrKSAtPlxuICAgICAgICAkc2NvcGUudGFzayA9IHRhc2siLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG4uY29udHJvbGxlciAnV29ya1NjaGVkdWxlTGF0ZXN0UmVzdWx0c0N0cmwnLCAoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRsb2csXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBXb3JrU2NoZWR1bGUsIFdPUktfU1RBVFVTX1VQREFURSkgLT5cbiAgICAkc2NvcGUuc2NoZWR1bGUgPSBXb3JrU2NoZWR1bGUubG9hZCgkcm91dGVQYXJhbXMuaWQpXG5cbiAgICBzdGF0dXNMaXN0ZW5lciA9ICRzY29wZS4kb24oV09SS19TVEFUVVNfVVBEQVRFLCAtPlxuICAgICAgICAkc2NvcGUuc2NoZWR1bGUudXBkYXRlSG9zdHNTdGF0dXMoKVxuICAgIClcbiAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsIHN0YXR1c0xpc3RlbmVyKVxuIiwiYW5ndWxhci5tb2R1bGUoJ3BhcmtLZWVwZXInKVxuLmNvbnRyb2xsZXIgJ1dvcmtUYXNrRGV0YWlsQ3RybCcsICgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJGxvZywgV29ya1Rhc2spIC0+XG4gICAgV29ya1Rhc2suZ2V0KCRyb3V0ZVBhcmFtcy5pZCkudGhlbiAodGFzaykgLT5cbiAgICAgICAgJHNjb3BlLnRhc2sgPSB0YXNrIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9

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
    return $scope.waitingTasks = monitStatus.getWaiting();
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
  angular.module('parkKeeper').constant('MONIT_STATUS_UPDATE', 'MONIT_STATUS_UPDATE').constant('WAITING_TASKS_UPDATE', 'WAITING_TASKS_UPDATE').constant('STARTED_TASKS_UPDATE', 'STARTED_TASKS_UPDATE').service('monitStatus', function($log, $rootScope, swHttpHelper, swWebSocket, config, MONIT_STATUS_UPDATE, WAITING_TASKS_UPDATE, STARTED_TASKS_UPDATE) {
    var started, status, subscribeMonitStatus, subscribeStartedTasks, subscribeWaitingTasks, updateStarted, updateStatus, updateWaiting, waiting;
    status = [];
    waiting = [];
    started = [];
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
    updateStarted = function(startedTasks) {
      var j, len, results, task;
      started.length = 0;
      results = [];
      for (j = 0, len = startedTasks.length; j < len; j++) {
        task = startedTasks[j];
        results.push(started.push(task));
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
    subscribeStartedTasks = function() {
      var durable, socket;
      socket = new swWebSocket(config.wsServerAddress + "/started_tasks");
      socket.onMessage(function(msg) {
        var startedTasks;
        startedTasks = JSON.parse(msg).started_tasks;
        updateStarted(startedTasks);
        return $rootScope.$broadcast(STARTED_TASKS_UPDATE, started);
      });
      durable = true;
      return socket.start(durable);
    };
    this.start = function() {
      this.getLatest().then(subscribeMonitStatus);
      subscribeWaitingTasks();
      return subscribeStartedTasks();
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
    return this;
  });

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9hcHAuY29mZmVlIiwiYXBwL2NvbmZpZy5jb2ZmZWUiLCJhcHAvaW50ZXJjZXB0b3JzLmNvZmZlZSIsImFwcC9jb250cm9sbGVycy9tYWluLmNvZmZlZSIsImFwcC9yZXNvdXJjZXMvaG9zdC5jb2ZmZWUiLCJhcHAvcmVzb3VyY2VzL2hvc3RfZ3JvdXAuY29mZmVlIiwiYXBwL3Jlc291cmNlcy9tb25pdF9zY2hlZHVsZS5jb2ZmZWUiLCJhcHAvcmVzb3VyY2VzL21vbml0X3N0YXR1cy5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7RUFBQSxPQUFPLENBQUMsTUFBUixDQUFlLFlBQWYsRUFBNkIsQ0FDekIsWUFEeUIsRUFFekIsWUFGeUIsRUFHekIsU0FIeUIsRUFJekIsV0FKeUIsRUFNekIsZ0JBTnlCLEVBT3pCLGNBUHlCLEVBU3pCLFNBVHlCLEVBVXpCLGFBVnlCLEVBV3pCLFFBWHlCLENBQTdCLENBY0EsQ0FBQyxNQWRELENBY1EsU0FBQyxjQUFEO1dBQ0osY0FDQSxDQUFDLElBREQsQ0FDTSxHQUROLEVBRUU7TUFBQSxXQUFBLEVBQWEsdUJBQWI7TUFDQSxVQUFBLEVBQVksVUFEWjtNQUVBLEtBQUEsRUFBTyxFQUZQO0tBRkYsQ0FPQSxDQUFDLElBUEQsQ0FPTSxTQVBOLEVBUUk7TUFBQSxXQUFBLEVBQWEsd0JBQWI7TUFDQSxVQUFBLEVBQVksZUFEWjtNQUVBLEtBQUEsRUFBTyxPQUZQO0tBUkosQ0FZQSxDQUFDLElBWkQsQ0FZTSxVQVpOLEVBYUk7TUFBQSxXQUFBLEVBQWEseUJBQWI7TUFDQSxVQUFBLEVBQVksZ0JBRFo7TUFFQSxLQUFBLEVBQU8sUUFGUDtLQWJKO0VBREksQ0FkUixDQWlDQSxDQUFDLEdBakNELENBaUNLLFNBQUMsU0FBRCxFQUFZLFVBQVosRUFBd0IsT0FBeEI7SUFDRCxVQUFVLENBQUMsT0FBWCxHQUFxQjtXQUNyQixVQUFVLENBQUMsR0FBWCxDQUFlLHFCQUFmLEVBQXNDLFNBQUMsS0FBRCxFQUFRLE9BQVIsRUFBaUIsUUFBakI7QUFDbEMsVUFBQTtNQUFBLFNBQUEseUNBQTJCLENBQUUsZUFBakIsSUFBMEI7TUFDdEMsT0FBTyxDQUFDLFlBQVIsQ0FBcUIsU0FBckI7TUFDQSxPQUFPLENBQUMsYUFBUixDQUFzQixFQUF0QjthQUNBLE9BQU8sQ0FBQyxXQUFSLENBQW9CLEVBQXBCO0lBSmtDLENBQXRDO0VBRkMsQ0FqQ0wsQ0F5Q0EsQ0FBQyxHQXpDRCxDQXlDSyxTQUFDLFdBQUQ7V0FDRCxXQUFXLENBQUMsS0FBWixDQUFBO0VBREMsQ0F6Q0wsQ0E0Q0EsQ0FBQyxNQTVDRCxDQTRDUSxTQUFDLGtCQUFELEVBQXFCLE1BQXJCO0lBQ0osa0JBQWtCLENBQUMsY0FBbkIsQ0FBa0MsWUFBbEM7SUFDQSxrQkFBa0IsQ0FBQyxnQkFBbkIsQ0FBb0MsTUFBTSxDQUFDLGFBQTNDO1dBQ0Esa0JBQWtCLENBQUMsV0FBbkIsQ0FBK0IsRUFBL0I7RUFISSxDQTVDUixDQWlEQSxDQUFDLE1BakRELENBaURRLFNBQUMsYUFBRDtXQUNKLGFBQWEsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUssQ0FBQSxjQUFBLENBQXBDLEdBQXNEO0VBRGxELENBakRSO0FBQUE7OztBQ0FBO0VBQUEsT0FBTyxDQUFDLE1BQVIsQ0FBZSxZQUFmLENBQ0ksQ0FBQyxRQURMLENBQ2MsUUFEZCxFQUN3QjtJQUNoQixhQUFBLEVBQWUsdUJBREM7SUFFaEIsZUFBQSxFQUFpQixxQkFGRDtHQUR4QjtBQUFBOzs7QUNBQTtFQUFBLE9BQU8sQ0FBQyxNQUFSLENBQWUsWUFBZixDQUdBLENBQUMsTUFIRCxDQUdRLFNBQUMsYUFBRDtXQUNKLGFBQWEsQ0FBQyxZQUFZLENBQUMsSUFBM0IsQ0FBZ0Msd0JBQWhDO0VBREksQ0FIUixDQU1BLENBQUMsT0FORCxDQU1TLHdCQU5ULEVBTW1DLFNBQUMsU0FBRCxFQUFZLEVBQVosRUFBZ0IsSUFBaEI7QUFDM0IsV0FBTztNQUNILGFBQUEsRUFBZSxTQUFDLFFBQUQ7UUFDWCxJQUFHLFFBQVEsQ0FBQyxNQUFULEtBQW1CLENBQW5CLElBQXdCLENBQUMsUUFBUSxDQUFDLE1BQVQsSUFBbUIsR0FBbkIsSUFBMkIsUUFBUSxDQUFDLE1BQVQsSUFBbUIsR0FBL0MsQ0FBM0I7VUFDSSxJQUFJLENBQUMsS0FBTCxDQUFXLFFBQVgsRUFESjs7QUFJQSxlQUFPLEVBQUUsQ0FBQyxNQUFILENBQVUsUUFBVjtNQUxJLENBRFo7O0VBRG9CLENBTm5DO0FBQUE7OztBQ0FBO0VBQUEsT0FBTyxDQUFDLE1BQVIsQ0FBZSxZQUFmLENBQ0EsQ0FBQyxVQURELENBQ1ksVUFEWixFQUN3QixTQUFDLE1BQUQsRUFBUyxJQUFULEVBQWUsUUFBZixFQUF5QixXQUF6QixFQUNDLFdBREQsRUFDYyxtQkFEZCxFQUNtQyxhQURuQztBQUVwQixRQUFBO0lBQUEsTUFBTSxDQUFDLGNBQVAsR0FBd0IsYUFBYSxDQUFDLE1BQWQsQ0FBQTtJQUV4QixtQkFBQSxHQUFzQixNQUFNLENBQUMsR0FBUCxDQUFXLG1CQUFYLEVBQWdDLFNBQUMsQ0FBRCxFQUFJLFFBQUo7QUFDbEQsVUFBQTtBQUFBO0FBQUE7V0FBQSxxQ0FBQTs7cUJBQ0ksUUFBUSxDQUFDLGlCQUFULENBQTJCLFFBQTNCO0FBREo7O0lBRGtELENBQWhDO0lBSXRCLE1BQU0sQ0FBQyxHQUFQLENBQVcsVUFBWCxFQUF1QixtQkFBdkI7V0FFQSxNQUFNLENBQUMsWUFBUCxHQUFzQixXQUFXLENBQUMsVUFBWixDQUFBO0VBVkYsQ0FEeEI7QUFBQTs7O0FDQUE7RUFBQSxPQUFPLENBQUMsTUFBUixDQUFlLFlBQWYsQ0FFQSxDQUFDLE9BRkQsQ0FFUyxjQUZULEVBRXlCLFNBQUMsU0FBRCxFQUFZLE1BQVo7QUFDckIsUUFBQTtJQUFBLEdBQUEsR0FBVSxNQUFNLENBQUMsYUFBVCxHQUF3QjtBQUNoQyxXQUFPLFNBQUEsQ0FBVSxHQUFWO0VBRmMsQ0FGekI7QUFBQTs7O0FDQUE7RUFBQSxPQUFPLENBQUMsTUFBUixDQUFlLFlBQWYsQ0FFQSxDQUFDLE9BRkQsQ0FFUyxtQkFGVCxFQUU4QixTQUFDLFNBQUQsRUFBWSxNQUFaO0FBQzFCLFFBQUE7SUFBQSxHQUFBLEdBQVUsTUFBTSxDQUFDLGFBQVQsR0FBd0I7QUFDaEMsV0FBTyxTQUFBLENBQVUsR0FBVjtFQUZtQixDQUY5QjtBQUFBOzs7QUNBQTtFQUFBLE9BQU8sQ0FBQyxNQUFSLENBQWUsWUFBZixDQUVBLENBQUMsT0FGRCxDQUVTLHVCQUZULEVBRWtDLFNBQUMsU0FBRCxFQUFZLE1BQVo7QUFDOUIsUUFBQTtJQUFBLEdBQUEsR0FBVSxNQUFNLENBQUMsYUFBVCxHQUF3QjtBQUNoQyxXQUFPLFNBQUEsQ0FBVSxHQUFWO0VBRnVCLENBRmxDLENBT0EsQ0FBQyxPQVBELENBT1MsZUFQVCxFQU8wQixTQUFDLHFCQUFEO0FBQ3RCLFFBQUE7SUFBTTtNQUNXLHVCQUFDLElBQUQ7UUFDVCxJQUFJLENBQUMsY0FBTCxHQUFzQjtRQUN0QixPQUFPLENBQUMsTUFBUixDQUFlLElBQWYsRUFBcUIsSUFBQSxJQUFRLEVBQTdCO01BRlM7OzhCQUliLElBQUEsR0FBTSxTQUFBO0FBQ0YsWUFBQTtBQUFBO0FBQUEsYUFBQSxxQ0FBQTs7VUFDSSxJQUFHLElBQUksQ0FBQyxNQUFMLEtBQWUsTUFBZixJQUE2QixDQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBaEQ7QUFDSSxtQkFBTyxNQURYOztBQURKO0FBR0EsZUFBTztNQUpMOzs4QkFNTixpQkFBQSxHQUFtQixTQUFDLFFBQUQ7QUFDZixZQUFBO0FBQUE7YUFBQSwwQ0FBQTs7VUFDSSxJQUFHLFVBQVUsQ0FBQyxXQUFYLEtBQTBCLElBQUksQ0FBQyxFQUFsQztBQUNJLHFCQURKOztVQUdBLElBQUEsR0FBTyxJQUFJLENBQUMsT0FBTCxDQUFhLFVBQVUsQ0FBQyxZQUF4QjtVQUNQLElBQUcsQ0FBSSxJQUFQO0FBQ0kscUJBREo7O1VBR0EsSUFBSSxDQUFDLE1BQUwsR0FBYztVQUNkLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBWixHQUF3QixNQUFBLENBQU8sVUFBVSxDQUFDLFNBQWxCLENBQTRCLENBQUMsTUFBN0IsQ0FBQTtVQUN4QixJQUFHLENBQUksSUFBSSxDQUFDLGNBQVQsSUFBMkIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFaLEdBQXdCLElBQUksQ0FBQyxjQUEzRDt5QkFDSSxJQUFJLENBQUMsY0FBTCxHQUFzQixJQUFJLENBQUMsTUFBTSxDQUFDLFdBRHRDO1dBQUEsTUFBQTtpQ0FBQTs7QUFWSjs7TUFEZTs7OEJBY25CLE9BQUEsR0FBUyxTQUFDLFdBQUQ7QUFDTCxZQUFBO0FBQUE7QUFBQSxhQUFBLHFDQUFBOztVQUNJLElBQUcsSUFBSSxDQUFDLE9BQUwsS0FBZ0IsV0FBbkI7QUFDSSxtQkFBTyxLQURYOztBQURKO01BREs7O01BS1QsYUFBQyxDQUFBLE1BQUQsR0FBUyxTQUFBO0FBQ0wsWUFBQTtRQUFBLFNBQUEsR0FBWTtRQUVaLGFBQUEsR0FBZ0IscUJBQXFCLENBQUMsS0FBdEIsQ0FBNEIsU0FBQTtBQUN4QyxjQUFBO0FBQUE7ZUFBQSwrQ0FBQTs7WUFDSSxRQUFBLEdBQWUsSUFBQSxhQUFBLENBQWMsUUFBZDt5QkFDZixTQUFTLENBQUMsSUFBVixDQUFlLFFBQWY7QUFGSjs7UUFEd0MsQ0FBNUI7QUFLaEIsZUFBTztNQVJGOzs7OztBQVViLFdBQU87RUF6Q2UsQ0FQMUI7QUFBQTs7O0FDQUE7RUFBQSxPQUFPLENBQUMsTUFBUixDQUFlLFlBQWYsQ0FFQSxDQUFDLFFBRkQsQ0FFVSxxQkFGVixFQUVpQyxxQkFGakMsQ0FHQSxDQUFDLFFBSEQsQ0FHVSxzQkFIVixFQUdrQyxzQkFIbEMsQ0FJQSxDQUFDLFFBSkQsQ0FJVSxzQkFKVixFQUlrQyxzQkFKbEMsQ0FNQSxDQUFDLE9BTkQsQ0FNUyxhQU5ULEVBTXdCLFNBQ2hCLElBRGdCLEVBQ1YsVUFEVSxFQUNFLFlBREYsRUFDZ0IsV0FEaEIsRUFDNkIsTUFEN0IsRUFFaEIsbUJBRmdCLEVBRUssb0JBRkwsRUFFMkIsb0JBRjNCO0FBR3BCLFFBQUE7SUFBQSxNQUFBLEdBQVM7SUFDVCxPQUFBLEdBQVU7SUFDVixPQUFBLEdBQVU7SUFFVixZQUFBLEdBQWUsU0FBQyxVQUFEO0FBQ1gsVUFBQTtBQUFBLFdBQUEsZ0RBQUE7O1FBQ0ksSUFBRyxJQUFJLENBQUMsVUFBTCxLQUFtQixVQUFVLENBQUMsVUFBOUIsSUFBNkMsSUFBSSxDQUFDLFlBQUwsS0FBcUIsVUFBVSxDQUFDLFlBQWhGO1VBQ0ksTUFBTyxDQUFBLENBQUEsQ0FBUCxHQUFZO0FBQ1osaUJBRko7O0FBREo7YUFJQSxNQUFNLENBQUMsSUFBUCxDQUFZLFVBQVo7SUFMVztJQU9mLGFBQUEsR0FBZ0IsU0FBQyxZQUFEO0FBQ1osVUFBQTtNQUFBLE9BQU8sQ0FBQyxNQUFSLEdBQWlCO0FBQ2pCO1dBQUEsOENBQUE7O3FCQUNJLE9BQU8sQ0FBQyxJQUFSLENBQWEsSUFBYjtBQURKOztJQUZZO0lBS2hCLGFBQUEsR0FBZ0IsU0FBQyxZQUFEO0FBQ1osVUFBQTtNQUFBLE9BQU8sQ0FBQyxNQUFSLEdBQWlCO0FBQ2pCO1dBQUEsOENBQUE7O3FCQUNJLE9BQU8sQ0FBQyxJQUFSLENBQWEsSUFBYjtBQURKOztJQUZZO0lBS2hCLG9CQUFBLEdBQXVCLFNBQUE7QUFDbkIsVUFBQTtNQUFBLE1BQUEsR0FBYSxJQUFBLFdBQUEsQ0FBZ0IsTUFBTSxDQUFDLGVBQVQsR0FBMEIsU0FBeEM7TUFFYixNQUFNLENBQUMsU0FBUCxDQUFpQixTQUFDLEdBQUQ7QUFDYixZQUFBO1FBQUEsVUFBQSxHQUFhLElBQUksQ0FBQyxLQUFMLENBQVcsR0FBWDtRQUNiLFlBQUEsQ0FBYSxVQUFiO2VBRUEsVUFBVSxDQUFDLFVBQVgsQ0FBc0IsbUJBQXRCLEVBQTJDLE1BQTNDO01BSmEsQ0FBakI7TUFNQSxPQUFBLEdBQVU7YUFDVixNQUFNLENBQUMsS0FBUCxDQUFhLE9BQWI7SUFWbUI7SUFjdkIscUJBQUEsR0FBd0IsU0FBQTtBQUNwQixVQUFBO01BQUEsTUFBQSxHQUFhLElBQUEsV0FBQSxDQUFnQixNQUFNLENBQUMsZUFBVCxHQUEwQixnQkFBeEM7TUFFYixNQUFNLENBQUMsU0FBUCxDQUFpQixTQUFDLEdBQUQ7QUFDYixZQUFBO1FBQUEsWUFBQSxHQUFlLElBQUksQ0FBQyxLQUFMLENBQVcsR0FBWCxDQUFlLENBQUM7UUFDL0IsYUFBQSxDQUFjLFlBQWQ7ZUFFQSxVQUFVLENBQUMsVUFBWCxDQUFzQixvQkFBdEIsRUFBNEMsT0FBNUM7TUFKYSxDQUFqQjtNQU1BLE9BQUEsR0FBVTthQUNWLE1BQU0sQ0FBQyxLQUFQLENBQWEsT0FBYjtJQVZvQjtJQWF4QixxQkFBQSxHQUF3QixTQUFBO0FBQ3BCLFVBQUE7TUFBQSxNQUFBLEdBQWEsSUFBQSxXQUFBLENBQWdCLE1BQU0sQ0FBQyxlQUFULEdBQTBCLGdCQUF4QztNQUViLE1BQU0sQ0FBQyxTQUFQLENBQWlCLFNBQUMsR0FBRDtBQUNiLFlBQUE7UUFBQSxZQUFBLEdBQWUsSUFBSSxDQUFDLEtBQUwsQ0FBVyxHQUFYLENBQWUsQ0FBQztRQUMvQixhQUFBLENBQWMsWUFBZDtlQUVBLFVBQVUsQ0FBQyxVQUFYLENBQXNCLG9CQUF0QixFQUE0QyxPQUE1QztNQUphLENBQWpCO01BTUEsT0FBQSxHQUFVO2FBQ1YsTUFBTSxDQUFDLEtBQVAsQ0FBYSxPQUFiO0lBVm9CO0lBYXhCLElBQUksQ0FBQyxLQUFMLEdBQWEsU0FBQTtNQUVULElBQUksQ0FBQyxTQUFMLENBQUEsQ0FBZ0IsQ0FBQyxJQUFqQixDQUFzQixvQkFBdEI7TUFDQSxxQkFBQSxDQUFBO2FBQ0EscUJBQUEsQ0FBQTtJQUpTO0lBTWIsSUFBSSxDQUFDLFNBQUwsR0FBaUIsU0FBQTtBQUNiLGFBQU8sWUFBWSxDQUFDLEdBQWIsQ0FBcUIsTUFBTSxDQUFDLGFBQVQsR0FBd0IsdUJBQTNDLENBQWtFLENBQUMsSUFBbkUsQ0FBd0UsU0FBQyxRQUFEO0FBQzNFLFlBQUE7UUFBQSxNQUFNLENBQUMsTUFBUCxHQUFnQjtBQUNoQjtBQUFBLGFBQUEscUNBQUE7O1VBQ0ksTUFBTSxDQUFDLElBQVAsQ0FBWSxJQUFaO0FBREo7UUFHQSxVQUFVLENBQUMsVUFBWCxDQUFzQixtQkFBdEIsRUFBMkMsTUFBM0M7QUFFQSxlQUFPO01BUG9FLENBQXhFO0lBRE07SUFVakIsSUFBSSxDQUFDLFNBQUwsR0FBaUIsU0FBQTtBQUNiLGFBQU87SUFETTtJQUdqQixJQUFJLENBQUMsVUFBTCxHQUFrQixTQUFBO0FBQ2QsYUFBTztJQURPO0FBR2xCLFdBQU87RUF0RmEsQ0FOeEI7QUFBQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicsIFtcbiAgICAnbmdSZXNvdXJjZSdcbiAgICAnbmdTYW5pdGl6ZSdcbiAgICAnbmdSb3V0ZSdcbiAgICAnbmdBbmltYXRlJ1xuXG4gICAgJ2FuZ3VsYXIuZmlsdGVyJ1xuICAgICd1aS5ib290c3RyYXAnXG5cbiAgICAnc3dVdGlscydcbiAgICAnc3dXZWJTb2NrZXQnXG4gICAgJ3N3QXV0aCdcbl0pXG5cbi5jb25maWcgKCRyb3V0ZVByb3ZpZGVyKSAtPlxuICAgICRyb3V0ZVByb3ZpZGVyXG4gICAgLndoZW4oJy8nLFxuICAgICAgdGVtcGxhdGVVcmw6ICdjb250cm9sbGVycy9tYWluLmh0bWwnXG4gICAgICBjb250cm9sbGVyOiAnTWFpbkN0cmwnXG4gICAgICBsYWJlbDogJydcbiAgICApXG5cbiAgICAud2hlbignL2xvZ2luLycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnY29udHJvbGxlcnMvbG9naW4uaHRtbCdcbiAgICAgICAgY29udHJvbGxlcjogJ0F1dGhMb2dpbkN0cmwnXG4gICAgICAgIGxhYmVsOiAnTG9naW4nXG4gICAgKVxuICAgIC53aGVuKCcvbG9nb3V0LycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnY29udHJvbGxlcnMvbG9nb3V0Lmh0bWwnXG4gICAgICAgIGNvbnRyb2xsZXI6ICdBdXRoTG9nb3V0Q3RybCdcbiAgICAgICAgbGFiZWw6ICdMb2dvdXQnXG4gICAgKVxuXG4ucnVuICgkbG9jYXRpb24sICRyb290U2NvcGUsIHN3VGl0bGUpIC0+XG4gICAgJHJvb3RTY29wZS5zd1RpdGxlID0gc3dUaXRsZVxuICAgICRyb290U2NvcGUuJG9uICckcm91dGVDaGFuZ2VTdWNjZXNzJywgKGV2ZW50LCBjdXJyZW50LCBwcmV2aW91cykgLT5cbiAgICAgICAgYmFzZVRpdGxlID0gY3VycmVudC4kJHJvdXRlPy5sYWJlbCBvciAnJ1xuICAgICAgICBzd1RpdGxlLnNldFRpdGxlQmFzZShiYXNlVGl0bGUpXG4gICAgICAgIHN3VGl0bGUuc2V0VGl0bGVTdGFydCgnJylcbiAgICAgICAgc3dUaXRsZS5zZXRUaXRsZUVuZCgnJylcblxuLnJ1biAobW9uaXRTdGF0dXMpIC0+XG4gICAgbW9uaXRTdGF0dXMuc3RhcnQoKVxuXG4uY29uZmlnIChhdXRoQ29uZmlnUHJvdmlkZXIsIGNvbmZpZykgLT5cbiAgICBhdXRoQ29uZmlnUHJvdmlkZXIuc2V0U3lzdGVtTGFiZWwoJ3BhcmtLZWVwZXInKVxuICAgIGF1dGhDb25maWdQcm92aWRlci5zZXRTZXJ2ZXJBZGRyZXNzKGNvbmZpZy5zZXJ2ZXJBZGRyZXNzKVxuICAgIGF1dGhDb25maWdQcm92aWRlci5zZXRGcmVlVXJscyhbXSlcblxuLmNvbmZpZyAoJGh0dHBQcm92aWRlcikgLT5cbiAgICAkaHR0cFByb3ZpZGVyLmRlZmF1bHRzLmhlYWRlcnMucG9zdFsnQ29udGVudC1UeXBlJ10gPSAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJyIsImFuZ3VsYXIubW9kdWxlKCdwYXJrS2VlcGVyJylcbiAgICAuY29uc3RhbnQoJ2NvbmZpZycsIHtcbiAgICAgICAgc2VydmVyQWRkcmVzczogJ2h0dHA6Ly8xMjcuMC4wLjE6ODAwMCcsXG4gICAgICAgIHdzU2VydmVyQWRkcmVzczogJ3dzOi8vMTI3LjAuMC4xOjgwODAnLFxuICAgIH0pIiwiYW5ndWxhci5tb2R1bGUoJ3BhcmtLZWVwZXInKVxuXG4jIGludGVyY2VwdG9yIDUwMCBzdGF0dXMgZXJyb3Jcbi5jb25maWcgKCRodHRwUHJvdmlkZXIpIC0+XG4gICAgJGh0dHBQcm92aWRlci5pbnRlcmNlcHRvcnMucHVzaCgnc2VydmVyRXJyb3JJbnRlcmNlcHRvcicpXG5cbi5mYWN0b3J5ICdzZXJ2ZXJFcnJvckludGVyY2VwdG9yJywgKCRsb2NhdGlvbiwgJHEsICRsb2cpIC0+XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXNwb25zZUVycm9yOiAocmVzcG9uc2UpIC0+XG4gICAgICAgICAgICAgICAgaWYgcmVzcG9uc2Uuc3RhdHVzID09IDAgb3IgKHJlc3BvbnNlLnN0YXR1cyA+PSA1MDAgYW5kIHJlc3BvbnNlLnN0YXR1cyA8PSA2MDApXG4gICAgICAgICAgICAgICAgICAgICRsb2cuZXJyb3IocmVzcG9uc2UpXG4jICAgICAgICAgICAgICAgICAgICBlcnJvck1lc3NhZ2UgPSByZXNwb25zZS5zdGF0dXNUZXh0IG9yICcnXG4jICAgICAgICAgICAgICAgICAgICB0b2FzdGVyLnBvcCgnZXJyb3InLCAn0J7RiNC40LHQutCwINGB0LXRgNCy0LXRgNCwJywgZXJyb3JNZXNzYWdlKVxuICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UpXG5cbiAgICAgICAgfSIsImFuZ3VsYXIubW9kdWxlKCdwYXJrS2VlcGVyJylcbi5jb250cm9sbGVyICdNYWluQ3RybCcsICgkc2NvcGUsICRsb2csICR0aW1lb3V0LCBzd1dlYlNvY2tldCxcbiAgICAgICAgICAgICAgICAgICAgICAgICBtb25pdFN0YXR1cywgTU9OSVRfU1RBVFVTX1VQREFURSwgTW9uaXRTY2hlZHVsZSkgLT5cbiAgICAkc2NvcGUubW9uaXRTY2hlZHVsZXMgPSBNb25pdFNjaGVkdWxlLkdldEFsbCgpXG5cbiAgICBtb25pdFN0YXR1c0xpc3RlbmVyID0gJHNjb3BlLiRvbihNT05JVF9TVEFUVVNfVVBEQVRFLCAoZSwgc3RhdHVzZXMpIC0+XG4gICAgICAgIGZvciBzY2hlZHVsZSBpbiAkc2NvcGUubW9uaXRTY2hlZHVsZXNcbiAgICAgICAgICAgIHNjaGVkdWxlLnVwZGF0ZUhvc3RzU3RhdHVzKHN0YXR1c2VzKVxuICAgIClcbiAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsIG1vbml0U3RhdHVzTGlzdGVuZXIpXG5cbiAgICAkc2NvcGUud2FpdGluZ1Rhc2tzID0gbW9uaXRTdGF0dXMuZ2V0V2FpdGluZygpXG4iLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG5cbi5mYWN0b3J5ICdIb3N0UmVzb3VyY2UnLCAoJHJlc291cmNlLCBjb25maWcpIC0+XG4gICAgdXJsID0gXCIjeyBjb25maWcuc2VydmVyQWRkcmVzcyB9L2hvc3QvOmlkL1wiXG4gICAgcmV0dXJuICRyZXNvdXJjZSh1cmwpXG5cblxuIy5mYWN0b3J5ICdIb3N0U3RhdHVzJywgLT5cbiMgICAgY2xhc3MgSG9zdFN0YXR1c1xuIyAgICAgICAgbW9uaXROYW1lOiB1bmRlZmluZWRcbiMgICAgICAgIGR0OiB1bmRlZmluZWRcbiMgICAgICAgIGV4dHJhOiB1bmRlZmluZWRcbiMgICAgICAgIGlzU3VjY2VzczogdW5kZWZpbmVkXG4jXG4jICAgICAgICBjb25zdHJ1Y3RvcjogKGRhdGEpIC0+XG4jICAgICAgICAgICAgYW5ndWxhci5leHRlbmQodGhpcywgZGF0YSBvciB7fSlcbiNcbiMgICAgcmV0dXJuIEhvc3RTdGF0dXMiLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG5cbi5mYWN0b3J5ICdIb3N0R3JvdXBSZXNvdXJjZScsICgkcmVzb3VyY2UsIGNvbmZpZykgLT5cbiAgICB1cmwgPSBcIiN7IGNvbmZpZy5zZXJ2ZXJBZGRyZXNzIH0vaG9zdF9ncm91cC86aWQvXCJcbiAgICByZXR1cm4gJHJlc291cmNlKHVybCkiLCJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicpXG5cbi5mYWN0b3J5ICdNb25pdFNjaGVkdWxlUmVzb3VyY2UnLCAoJHJlc291cmNlLCBjb25maWcpIC0+XG4gICAgdXJsID0gXCIjeyBjb25maWcuc2VydmVyQWRkcmVzcyB9L21vbml0X3NjaGVkdWxlLzppZC9cIlxuICAgIHJldHVybiAkcmVzb3VyY2UodXJsKVxuXG5cbi5mYWN0b3J5ICdNb25pdFNjaGVkdWxlJywgKE1vbml0U2NoZWR1bGVSZXNvdXJjZSkgLT5cbiAgICBjbGFzcyBNb25pdFNjaGVkdWxlXG4gICAgICAgIGNvbnN0cnVjdG9yOiAoZGF0YSkgLT5cbiAgICAgICAgICAgIHRoaXMubGF0ZXN0U3RhdHVzRHQgPSB1bmRlZmluZWRcbiAgICAgICAgICAgIGFuZ3VsYXIuZXh0ZW5kKHRoaXMsIGRhdGEgb3Ige30pXG5cbiAgICAgICAgaXNPazogLT5cbiAgICAgICAgICAgIGZvciBob3N0IGluIHRoaXMuYWxsX2hvc3RzXG4gICAgICAgICAgICAgICAgaWYgaG9zdC5zdGF0dXMgIT0gdW5kZWZpbmVkIGFuZCBub3QgaG9zdC5zdGF0dXMuaXNfc3VjY2Vzc1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICAgIHJldHVybiB0cnVlXG5cbiAgICAgICAgdXBkYXRlSG9zdHNTdGF0dXM6IChzdGF0dXNlcykgLT5cbiAgICAgICAgICAgIGZvciBzdGF0dXNJdGVtIGluIHN0YXR1c2VzXG4gICAgICAgICAgICAgICAgaWYgc3RhdHVzSXRlbS5zY2hlZHVsZV9pZCAhPSB0aGlzLmlkXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlXG5cbiAgICAgICAgICAgICAgICBob3N0ID0gdGhpcy5nZXRIb3N0KHN0YXR1c0l0ZW0uaG9zdF9hZGRyZXNzKVxuICAgICAgICAgICAgICAgIGlmIG5vdCBob3N0XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlXG5cbiAgICAgICAgICAgICAgICBob3N0LnN0YXR1cyA9IHN0YXR1c0l0ZW1cbiAgICAgICAgICAgICAgICBob3N0LnN0YXR1cy5yZXN1bHRfZHQgPSBtb21lbnQoc3RhdHVzSXRlbS5yZXN1bHRfZHQpLnRvRGF0ZSgpXG4gICAgICAgICAgICAgICAgaWYgbm90IHRoaXMubGF0ZXN0U3RhdHVzRHQgb3IgaG9zdC5zdGF0dXMucmVzdWx0X2R0ID4gdGhpcy5sYXRlc3RTdGF0dXNEdFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxhdGVzdFN0YXR1c0R0ID0gaG9zdC5zdGF0dXMucmVzdWx0X2R0XG5cbiAgICAgICAgZ2V0SG9zdDogKGhvc3RBZGRyZXNzKSAtPlxuICAgICAgICAgICAgZm9yIGhvc3QgaW4gdGhpcy5hbGxfaG9zdHNcbiAgICAgICAgICAgICAgICBpZiBob3N0LmFkZHJlc3MgPT0gaG9zdEFkZHJlc3NcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGhvc3RcblxuICAgICAgICBAR2V0QWxsOiAtPlxuICAgICAgICAgICAgc2NoZWR1bGVzID0gW11cblxuICAgICAgICAgICAgc2NoZWR1bGVzRGF0YSA9IE1vbml0U2NoZWR1bGVSZXNvdXJjZS5xdWVyeSAtPlxuICAgICAgICAgICAgICAgIGZvciBpdGVtRGF0YSBpbiBzY2hlZHVsZXNEYXRhXG4gICAgICAgICAgICAgICAgICAgIHNjaGVkdWxlID0gbmV3IE1vbml0U2NoZWR1bGUoaXRlbURhdGEpXG4gICAgICAgICAgICAgICAgICAgIHNjaGVkdWxlcy5wdXNoKHNjaGVkdWxlKVxuXG4gICAgICAgICAgICByZXR1cm4gc2NoZWR1bGVzXG5cbiAgICByZXR1cm4gTW9uaXRTY2hlZHVsZSIsImFuZ3VsYXIubW9kdWxlKCdwYXJrS2VlcGVyJylcblxuLmNvbnN0YW50KCdNT05JVF9TVEFUVVNfVVBEQVRFJywgJ01PTklUX1NUQVRVU19VUERBVEUnKVxuLmNvbnN0YW50KCdXQUlUSU5HX1RBU0tTX1VQREFURScsICdXQUlUSU5HX1RBU0tTX1VQREFURScpXG4uY29uc3RhbnQoJ1NUQVJURURfVEFTS1NfVVBEQVRFJywgJ1NUQVJURURfVEFTS1NfVVBEQVRFJylcblxuLnNlcnZpY2UgJ21vbml0U3RhdHVzJywgKFxuICAgICAgICAkbG9nLCAkcm9vdFNjb3BlLCBzd0h0dHBIZWxwZXIsIHN3V2ViU29ja2V0LCBjb25maWcsXG4gICAgICAgIE1PTklUX1NUQVRVU19VUERBVEUsIFdBSVRJTkdfVEFTS1NfVVBEQVRFLCBTVEFSVEVEX1RBU0tTX1VQREFURSkgLT5cbiAgICBzdGF0dXMgPSBbXVxuICAgIHdhaXRpbmcgPSBbXVxuICAgIHN0YXJ0ZWQgPSBbXVxuXG4gICAgdXBkYXRlU3RhdHVzID0gKHN0YXR1c0l0ZW0pIC0+XG4gICAgICAgIGZvciBpdGVtLCBpIGluIHN0YXR1c1xuICAgICAgICAgICAgaWYgaXRlbS5tb25pdF9uYW1lID09IHN0YXR1c0l0ZW0ubW9uaXRfbmFtZSBhbmQgaXRlbS5ob3N0X2FkZHJlc3MgPT0gc3RhdHVzSXRlbS5ob3N0X2FkZHJlc3NcbiAgICAgICAgICAgICAgICBzdGF0dXNbaV0gPSBzdGF0dXNJdGVtXG4gICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgIHN0YXR1cy5wdXNoKHN0YXR1c0l0ZW0pXG5cbiAgICB1cGRhdGVXYWl0aW5nID0gKHdhaXRpbmdUYXNrcykgLT5cbiAgICAgICAgd2FpdGluZy5sZW5ndGggPSAwXG4gICAgICAgIGZvciB0YXNrIGluIHdhaXRpbmdUYXNrc1xuICAgICAgICAgICAgd2FpdGluZy5wdXNoKHRhc2spXG5cbiAgICB1cGRhdGVTdGFydGVkID0gKHN0YXJ0ZWRUYXNrcykgLT5cbiAgICAgICAgc3RhcnRlZC5sZW5ndGggPSAwXG4gICAgICAgIGZvciB0YXNrIGluIHN0YXJ0ZWRUYXNrc1xuICAgICAgICAgICAgc3RhcnRlZC5wdXNoKHRhc2spXG5cbiAgICBzdWJzY3JpYmVNb25pdFN0YXR1cyA9IC0+XG4gICAgICAgIHNvY2tldCA9IG5ldyBzd1dlYlNvY2tldChcIiN7IGNvbmZpZy53c1NlcnZlckFkZHJlc3MgfS9tb25pdHNcIilcblxuICAgICAgICBzb2NrZXQub25NZXNzYWdlIChtc2cpIC0+XG4gICAgICAgICAgICBzdGF0dXNJdGVtID0gSlNPTi5wYXJzZShtc2cpXG4gICAgICAgICAgICB1cGRhdGVTdGF0dXMoc3RhdHVzSXRlbSlcbiMgICAgICAgICAgICAkbG9nLmRlYnVnKHN0YXR1c0l0ZW0pXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoTU9OSVRfU1RBVFVTX1VQREFURSwgc3RhdHVzKVxuXG4gICAgICAgIGR1cmFibGUgPSB0cnVlXG4gICAgICAgIHNvY2tldC5zdGFydChkdXJhYmxlKVxuIyAgICAgICAgJGxvZy5kZWJ1Zygnc3RhcnQgc3Vic2NyaWJlTW9uaXRTdGF0dXMnKVxuXG5cbiAgICBzdWJzY3JpYmVXYWl0aW5nVGFza3MgPSAtPlxuICAgICAgICBzb2NrZXQgPSBuZXcgc3dXZWJTb2NrZXQoXCIjeyBjb25maWcud3NTZXJ2ZXJBZGRyZXNzIH0vd2FpdGluZ190YXNrc1wiKVxuXG4gICAgICAgIHNvY2tldC5vbk1lc3NhZ2UgKG1zZykgLT5cbiAgICAgICAgICAgIHdhaXRpbmdUYXNrcyA9IEpTT04ucGFyc2UobXNnKS53YWl0aW5nX3Rhc2tzXG4gICAgICAgICAgICB1cGRhdGVXYWl0aW5nKHdhaXRpbmdUYXNrcylcbiMgICAgICAgICAgICAkbG9nLmRlYnVnKCdzdWJzY3JpYmVXYWl0aW5nVGFza3MnLCB3YWl0aW5nVGFza3MpXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoV0FJVElOR19UQVNLU19VUERBVEUsIHdhaXRpbmcpXG5cbiAgICAgICAgZHVyYWJsZSA9IHRydWVcbiAgICAgICAgc29ja2V0LnN0YXJ0KGR1cmFibGUpXG5cblxuICAgIHN1YnNjcmliZVN0YXJ0ZWRUYXNrcyA9IC0+XG4gICAgICAgIHNvY2tldCA9IG5ldyBzd1dlYlNvY2tldChcIiN7IGNvbmZpZy53c1NlcnZlckFkZHJlc3MgfS9zdGFydGVkX3Rhc2tzXCIpXG5cbiAgICAgICAgc29ja2V0Lm9uTWVzc2FnZSAobXNnKSAtPlxuICAgICAgICAgICAgc3RhcnRlZFRhc2tzID0gSlNPTi5wYXJzZShtc2cpLnN0YXJ0ZWRfdGFza3NcbiAgICAgICAgICAgIHVwZGF0ZVN0YXJ0ZWQoc3RhcnRlZFRhc2tzKVxuIyAgICAgICAgICAgICRsb2cuZGVidWcoJ3N1YnNjcmliZVN0YXJ0ZWRUYXNrcycsIHN0YXJ0ZWRUYXNrcylcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChTVEFSVEVEX1RBU0tTX1VQREFURSwgc3RhcnRlZClcblxuICAgICAgICBkdXJhYmxlID0gdHJ1ZVxuICAgICAgICBzb2NrZXQuc3RhcnQoZHVyYWJsZSlcblxuXG4gICAgdGhpcy5zdGFydCA9IC0+XG4jICAgICAgICAkbG9nLmluZm8gJ3N0YXJ0IE1vbml0U3RhdHVzJ1xuICAgICAgICB0aGlzLmdldExhdGVzdCgpLnRoZW4gc3Vic2NyaWJlTW9uaXRTdGF0dXNcbiAgICAgICAgc3Vic2NyaWJlV2FpdGluZ1Rhc2tzKClcbiAgICAgICAgc3Vic2NyaWJlU3RhcnRlZFRhc2tzKClcblxuICAgIHRoaXMuZ2V0TGF0ZXN0ID0gLT5cbiAgICAgICAgcmV0dXJuIHN3SHR0cEhlbHBlci5nZXQoXCIjeyBjb25maWcuc2VydmVyQWRkcmVzcyB9L21vbml0X3N0YXR1c19sYXRlc3QvXCIpLnRoZW4gKHJlc3BvbnNlKSAtPlxuICAgICAgICAgICAgc3RhdHVzLmxlbmd0aCA9IDBcbiAgICAgICAgICAgIGZvciBpdGVtIGluIHJlc3BvbnNlLmRhdGEubW9uaXRfc3RhdHVzX2xhdGVzdFxuICAgICAgICAgICAgICAgIHN0YXR1cy5wdXNoKGl0ZW0pXG5cbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChNT05JVF9TVEFUVVNfVVBEQVRFLCBzdGF0dXMpXG5cbiAgICAgICAgICAgIHJldHVybiBzdGF0dXNcblxuICAgIHRoaXMuZ2V0U3RhdHVzID0gLT5cbiAgICAgICAgcmV0dXJuIHN0YXR1c1xuXG4gICAgdGhpcy5nZXRXYWl0aW5nID0gLT5cbiAgICAgICAgcmV0dXJuIHdhaXRpbmdcblxuICAgIHJldHVybiB0aGlzIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9

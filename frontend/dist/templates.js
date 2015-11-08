angular.module('parkKeeper').run(['$templateCache', function($templateCache) {
    $templateCache.put('controllers/login.html',
        "<div class=\"header\">\n    <h3 class=\"text-muted\">{{ header }}</h3>\n</div>\n\n<div>\n    <uib-alert ng-repeat=\"error in loginErrors\" type=\"danger\" close=\"closeAlert($index)\">\n        {{ error }}\n    </uib-alert>\n\n    <h1>Login</h1>\n    <form class=\"form-horizontal authentication\" ng-submit=\"logIn()\">\n        <div class=\"form-group\">\n            <label for=\"inputLogin\" class=\"col-lg-2 control-label\">Name</label>\n            <div class=\"col-lg-8\">\n                <input type=\"text\" class=\"form-control\" id=\"inputLogin\" placeholder=\"user name\"\n                       ng-model=\"login\" autofocus=\"autofocus\" required>\n            </div>\n        </div>\n        <div class=\"form-group\">\n            <label for=\"inputPassword\" class=\"col-lg-2 control-label\">Password</label>\n            <div class=\"col-lg-8\">\n                <input type=\"password\" class=\"form-control\" id=\"inputPassword\"\n                       placeholder=\"password\" ng-model=\"password\" required>\n            </div>\n        </div>\n        <div class=\"form-group\">\n            <div class=\"col-lg-offset-2 col-lg-8\">\n                <button type=\"submit\" class=\"btn btn-default\">Login</button>\n            </div>\n        </div>\n    </form>\n</div>");
}]);
angular.module('parkKeeper').run(['$templateCache', function($templateCache) {
    $templateCache.put('controllers/logout.html',
        "<div class=\"header\">\n    <h3 class=\"text-muted\">{{ header }}</h3>\n</div>\n\n<alert type=\"danger\" ng-show=\"logoutError\">{{ logoutError }}</alert>\n\n<h1>Logout</h1>\n<p ng-if=\"inProcess\">\n    Exiting...\n</p>");
}]);
angular.module('parkKeeper').run(['$templateCache', function($templateCache) {
    $templateCache.put('controllers/main.html',
        "<div class=\"row\">\n    <div class=\"col-xs-6\">\n        <table class=\"table table-hover table-condensed\">\n            <tbody>\n                <tr ng-repeat=\"schedule in monitSchedules\"\n                    ng-class=\"{'info': schedule.is_active, 'active': !schedule.is_active}\"\n                >\n                    <td>\n                        {{ schedule.getLabel() }}\n                        <span class=\"note\">{{ schedule.all_hosts.length }} hosts</span>\n                    </td>\n                    <td>\n                        <span class=\"label\" ng-class=\"{\n                            'label-default': schedule.isUndefined(),\n                            'label-success': schedule.isOk(),\n                            'label-warning': schedule.isWarning(),\n                            'label-danger': schedule.isFail()\n                            }\"\n                              ng-if=\"schedule.is_active\"\n                        >\n                            <span ng-if=\"schedule.isUndefined()\">Undefined</span>\n                            <span ng-if=\"schedule.isOk()\">Ok</span>\n                            <span ng-if=\"schedule.isWarning()\">Warning</span>\n                            <span ng-if=\"schedule.isFail()\">Fail</span>\n                        </span>\n                    </td>\n                    <td uib-tooltip=\"period: {{ schedule.period }} sec\"\n                        tooltip-placement=\"bottom\">\n                        <span class=\"label\" ng-show=\"schedule.is_active\"\n                              ng-class=\"{'label-success': schedule.isFresh(), 'label-warning': !schedule.isFresh()}\">\n                            {{ schedule.latestStatusDt | date:'yyyy-MM-dd HH:mm:ss' }}\n                        </span>\n                    </td>\n                </tr>\n            </tbody>\n        </table>\n    </div>\n\n    <div class=\"col-xs-4 col-xs-offset-1\">\n        <div class=\"row\">\n            <ul class=\"list-group\">\n                <li class=\"list-group-item\">\n                    <h4>Monitoring tasks queue</h4>\n                </li>\n\n                <li class=\"list-group-item\" ng-repeat=\"(name, tasks) in waitingTasks | groupBy: 'monit_name'\">\n                    <span class=\"badge\" ng-class=\"{clickable: tasks.length}\" ng-click=\"openTask(tasks)\">{{ tasks.length }}</span>\n                    {{ name }}\n                </li>\n                <li class=\"list-group-item\" ng-if=\"!waitingTasks.length\">\n                    No tasks\n                </li>\n            </ul>\n        </div>\n\n        <div class=\"row\">\n            <table class=\"table table-hover table-condensed\">\n                <tbody>\n                    <tr ng-class=\"{'info': worker.tasks.length, 'active': !worker.tasks.length}\"\n                        ng-repeat=\"worker in monitWorkers\">\n                        <td>\n                            <span class=\"label label-default\">{{ worker.host_name }}</span>\n                        </td>\n                        <td>worker {{ worker.id }} {{ worker.type }}</td>\n                        <td ng-class=\"{clickable: worker.tasks.length}\" ng-click=\"openTask(worker.tasks)\">\n                            tasks: {{ worker.tasks.length }}\n                        </td>\n                    </tr>\n            </table>\n        </div>\n    </div>\n</div>");
}]);
angular.module('parkKeeper').run(['$templateCache', function($templateCache) {
    $templateCache.put('controllers/monit_tasks_modal.html',
        "<div class=\"modal-header\">\n    <h3 class=\"modal-title\">Monitoring tasks</h3>\n</div>\n<div class=\"modal-body\">\n    <table class=\"table\">\n        <thead>\n            <tr>\n                <th>#</th>\n                <th>Monitoring</th>\n                <th>Host address</th>\n                <th>Worker host</th>\n                <th>Start time</th>\n                <th>Result time</th>\n                <th>Level</th>\n                <th>Extra</th>\n            </tr>\n        </thead>\n        <tbody>\n            <tr ng-repeat=\"task in tasks\">\n                <td>{{ $index+1 }}</td>\n                <td>\n                    {{ task.monit_name }}\n                    {{ task.id }}\n                </td>\n                <td>{{ task.host_address }}</td>\n                <td>{{ task.worker.host_name }}</td>\n                <td>{{ task.start_dt|date:'yyyy-MM-dd HH:mm:ss' }}</td>\n                <td>{{ task.result_dt|date:'yyyy-MM-dd HH:mm:ss' }}</td>\n                <td>{{ task.level }}</td>\n                <td>{{ task.extra }}</td>\n            </tr>\n        </tbody>\n    </table>\n</div>\n<div class=\"modal-footer\">\n    <button class=\"btn btn-warning\" type=\"button\" ng-click=\"cancel()\">Cancel</button>\n</div>");
}]);
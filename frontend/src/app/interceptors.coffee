angular.module('parkKeeper')

# interceptor 500 status error
.config ($httpProvider) ->
    $httpProvider.interceptors.push('serverErrorInterceptor')

.factory 'serverErrorInterceptor', ($location, $q, $log) ->
        return {
            responseError: (response) ->
                if response.status == 0 or (response.status >= 500 and response.status <= 600)
                    $log.error(response)
#                    errorMessage = response.statusText or ''
#                    toaster.pop('error', 'Ошибка сервера', errorMessage)
                return $q.reject(response)

        }
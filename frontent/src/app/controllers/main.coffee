angular.module('parkKeeper')
.controller 'MainCtrl', ($scope, State) ->
    $scope.statesLoading = true
    $scope.states = State.query(
        -> $scope.statesLoading = false
        -> $scope.statesLoading = false
    )
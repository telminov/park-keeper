angular.module('parkKeeper')
.controller 'MainCtrl', ($scope, State) ->
    # TODO: add "loading" directive using
    $scope.states = State.query()
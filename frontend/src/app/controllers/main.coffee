angular.module('parkKeeper')
.controller 'MainCtrl', ($scope, $log, swWebSocket) ->
    $log.info 'MainCtrl ready!'

#    socket = new swWebSocket('ws://127.0.0.1:8080/monits')
#    socket.onMessage (msg) ->
#        $log.info 'WS', msg
#    socket.start()
#    socket.send('ping')

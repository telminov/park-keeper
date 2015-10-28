angular.module('parkKeeper')
.controller 'MainCtrl', ($scope, $log, $timeout, swWebSocket, Host, HostGroup, MonitSchedule) ->
    $log.info 'MainCtrl ready!'

    socket = new swWebSocket('ws://127.0.0.1:8080/monits')
    socket.onMessage (msg) ->
        $log.info 'WS', JSON.parse(msg)
    socket.start()
    socket.send('ping')
    socket.send('ping2')
    $timeout(
        ->socket.send('close_ws'),
        10000
    )

#    hosts = Host.query ->
#        $log.info hosts[0]
#
#    groups = HostGroup.query ->
#        $log.info groups[0]
#
#    schedule = MonitSchedule.query ->
#        $log.info schedule[0]
(function() {
  angular.module('parkKeeper', ['ngResource', 'ngSanitize', 'ngRoute', 'ngAnimate', 'ui.bootstrap', 'swUtils', 'swWebSocket']).config(function($routeProvider) {
    return $routeProvider.when('/', {
      templateUrl: 'controllers/main.html',
      controller: 'MainCtrl',
      label: ''
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
  });

}).call(this);

(function() {
  angular.module('parkKeeper').controller('MainCtrl', function($scope, $log, swWebSocket) {
    var socket;
    $log.info('MainCtrl ready!');
    socket = new swWebSocket('ws://127.0.0.1:8080/ws_test');
    socket.onMessage(function(msg) {
      return $log.info('WS', msg);
    });
    socket.start();
    return socket.send('ping');
  });

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9hcHAuY29mZmVlIiwiYXBwL2NvbnRyb2xsZXJzL21haW4uY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0VBQUEsT0FBTyxDQUFDLE1BQVIsQ0FBZSxZQUFmLEVBQTZCLENBQ3pCLFlBRHlCLEVBRXpCLFlBRnlCLEVBR3pCLFNBSHlCLEVBSXpCLFdBSnlCLEVBTXpCLGNBTnlCLEVBUXpCLFNBUnlCLEVBU3pCLGFBVHlCLENBQTdCLENBWUEsQ0FBQyxNQVpELENBWVEsU0FBQyxjQUFEO1dBQ0osY0FDQSxDQUFDLElBREQsQ0FDTSxHQUROLEVBRUU7TUFBQSxXQUFBLEVBQWEsdUJBQWI7TUFDQSxVQUFBLEVBQVksVUFEWjtNQUVBLEtBQUEsRUFBTyxFQUZQO0tBRkY7RUFESSxDQVpSLENBb0JBLENBQUMsR0FwQkQsQ0FvQkssU0FBQyxTQUFELEVBQVksVUFBWixFQUF3QixPQUF4QjtJQUNELFVBQVUsQ0FBQyxPQUFYLEdBQXFCO1dBQ3JCLFVBQVUsQ0FBQyxHQUFYLENBQWUscUJBQWYsRUFBc0MsU0FBQyxLQUFELEVBQVEsT0FBUixFQUFpQixRQUFqQjtBQUNsQyxVQUFBO01BQUEsU0FBQSx5Q0FBMkIsQ0FBRSxlQUFqQixJQUEwQjtNQUN0QyxPQUFPLENBQUMsWUFBUixDQUFxQixTQUFyQjtNQUNBLE9BQU8sQ0FBQyxhQUFSLENBQXNCLEVBQXRCO2FBQ0EsT0FBTyxDQUFDLFdBQVIsQ0FBb0IsRUFBcEI7SUFKa0MsQ0FBdEM7RUFGQyxDQXBCTDtBQUFBOzs7QUNBQTtFQUFBLE9BQU8sQ0FBQyxNQUFSLENBQWUsWUFBZixDQUNBLENBQUMsVUFERCxDQUNZLFVBRFosRUFDd0IsU0FBQyxNQUFELEVBQVMsSUFBVCxFQUFlLFdBQWY7QUFDcEIsUUFBQTtJQUFBLElBQUksQ0FBQyxJQUFMLENBQVUsaUJBQVY7SUFFQSxNQUFBLEdBQWEsSUFBQSxXQUFBLENBQVksNkJBQVo7SUFDYixNQUFNLENBQUMsU0FBUCxDQUFpQixTQUFDLEdBQUQ7YUFDYixJQUFJLENBQUMsSUFBTCxDQUFVLElBQVYsRUFBZ0IsR0FBaEI7SUFEYSxDQUFqQjtJQUVBLE1BQU0sQ0FBQyxLQUFQLENBQUE7V0FDQSxNQUFNLENBQUMsSUFBUCxDQUFZLE1BQVo7RUFQb0IsQ0FEeEI7QUFBQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJhbmd1bGFyLm1vZHVsZSgncGFya0tlZXBlcicsIFtcbiAgICAnbmdSZXNvdXJjZSdcbiAgICAnbmdTYW5pdGl6ZSdcbiAgICAnbmdSb3V0ZSdcbiAgICAnbmdBbmltYXRlJ1xuXG4gICAgJ3VpLmJvb3RzdHJhcCdcblxuICAgICdzd1V0aWxzJ1xuICAgICdzd1dlYlNvY2tldCdcbl0pXG5cbi5jb25maWcgKCRyb3V0ZVByb3ZpZGVyKSAtPlxuICAgICRyb3V0ZVByb3ZpZGVyXG4gICAgLndoZW4oJy8nLFxuICAgICAgdGVtcGxhdGVVcmw6ICdjb250cm9sbGVycy9tYWluLmh0bWwnXG4gICAgICBjb250cm9sbGVyOiAnTWFpbkN0cmwnXG4gICAgICBsYWJlbDogJydcbiAgICApXG5cbi5ydW4gKCRsb2NhdGlvbiwgJHJvb3RTY29wZSwgc3dUaXRsZSkgLT5cbiAgICAkcm9vdFNjb3BlLnN3VGl0bGUgPSBzd1RpdGxlXG4gICAgJHJvb3RTY29wZS4kb24gJyRyb3V0ZUNoYW5nZVN1Y2Nlc3MnLCAoZXZlbnQsIGN1cnJlbnQsIHByZXZpb3VzKSAtPlxuICAgICAgICBiYXNlVGl0bGUgPSBjdXJyZW50LiQkcm91dGU/LmxhYmVsIG9yICcnXG4gICAgICAgIHN3VGl0bGUuc2V0VGl0bGVCYXNlKGJhc2VUaXRsZSlcbiAgICAgICAgc3dUaXRsZS5zZXRUaXRsZVN0YXJ0KCcnKVxuICAgICAgICBzd1RpdGxlLnNldFRpdGxlRW5kKCcnKSIsImFuZ3VsYXIubW9kdWxlKCdwYXJrS2VlcGVyJylcbi5jb250cm9sbGVyICdNYWluQ3RybCcsICgkc2NvcGUsICRsb2csIHN3V2ViU29ja2V0KSAtPlxuICAgICRsb2cuaW5mbyAnTWFpbkN0cmwgcmVhZHkhJ1xuXG4gICAgc29ja2V0ID0gbmV3IHN3V2ViU29ja2V0KCd3czovLzEyNy4wLjAuMTo4MDgwL3dzX3Rlc3QnKVxuICAgIHNvY2tldC5vbk1lc3NhZ2UgKG1zZykgLT5cbiAgICAgICAgJGxvZy5pbmZvICdXUycsIG1zZ1xuICAgIHNvY2tldC5zdGFydCgpXG4gICAgc29ja2V0LnNlbmQoJ3BpbmcnKVxuIyAgICBzb2NrZXQuY2xvc2UoKVxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9

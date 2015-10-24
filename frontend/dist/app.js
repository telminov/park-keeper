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
    return $log.info('MainCtrl ready!');
  });

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9hcHAuY29mZmVlIiwiYXBwL2NvbnRyb2xsZXJzL21haW4uY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0VBQUEsT0FBTyxDQUFDLE1BQVIsQ0FBZSxZQUFmLEVBQTZCLENBQ3pCLFlBRHlCLEVBRXpCLFlBRnlCLEVBR3pCLFNBSHlCLEVBSXpCLFdBSnlCLEVBTXpCLGNBTnlCLEVBUXpCLFNBUnlCLEVBU3pCLGFBVHlCLENBQTdCLENBWUEsQ0FBQyxNQVpELENBWVEsU0FBQyxjQUFEO1dBQ0osY0FDQSxDQUFDLElBREQsQ0FDTSxHQUROLEVBRUU7TUFBQSxXQUFBLEVBQWEsdUJBQWI7TUFDQSxVQUFBLEVBQVksVUFEWjtNQUVBLEtBQUEsRUFBTyxFQUZQO0tBRkY7RUFESSxDQVpSLENBb0JBLENBQUMsR0FwQkQsQ0FvQkssU0FBQyxTQUFELEVBQVksVUFBWixFQUF3QixPQUF4QjtJQUNELFVBQVUsQ0FBQyxPQUFYLEdBQXFCO1dBQ3JCLFVBQVUsQ0FBQyxHQUFYLENBQWUscUJBQWYsRUFBc0MsU0FBQyxLQUFELEVBQVEsT0FBUixFQUFpQixRQUFqQjtBQUNsQyxVQUFBO01BQUEsU0FBQSx5Q0FBMkIsQ0FBRSxlQUFqQixJQUEwQjtNQUN0QyxPQUFPLENBQUMsWUFBUixDQUFxQixTQUFyQjtNQUNBLE9BQU8sQ0FBQyxhQUFSLENBQXNCLEVBQXRCO2FBQ0EsT0FBTyxDQUFDLFdBQVIsQ0FBb0IsRUFBcEI7SUFKa0MsQ0FBdEM7RUFGQyxDQXBCTDtBQUFBOzs7QUNBQTtFQUFBLE9BQU8sQ0FBQyxNQUFSLENBQWUsWUFBZixDQUNBLENBQUMsVUFERCxDQUNZLFVBRFosRUFDd0IsU0FBQyxNQUFELEVBQVMsSUFBVCxFQUFlLFdBQWY7V0FDcEIsSUFBSSxDQUFDLElBQUwsQ0FBVSxpQkFBVjtFQURvQixDQUR4QjtBQUFBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbImFuZ3VsYXIubW9kdWxlKCdwYXJrS2VlcGVyJywgW1xuICAgICduZ1Jlc291cmNlJ1xuICAgICduZ1Nhbml0aXplJ1xuICAgICduZ1JvdXRlJ1xuICAgICduZ0FuaW1hdGUnXG5cbiAgICAndWkuYm9vdHN0cmFwJ1xuXG4gICAgJ3N3VXRpbHMnXG4gICAgJ3N3V2ViU29ja2V0J1xuXSlcblxuLmNvbmZpZyAoJHJvdXRlUHJvdmlkZXIpIC0+XG4gICAgJHJvdXRlUHJvdmlkZXJcbiAgICAud2hlbignLycsXG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbnRyb2xsZXJzL21haW4uaHRtbCdcbiAgICAgIGNvbnRyb2xsZXI6ICdNYWluQ3RybCdcbiAgICAgIGxhYmVsOiAnJ1xuICAgIClcblxuLnJ1biAoJGxvY2F0aW9uLCAkcm9vdFNjb3BlLCBzd1RpdGxlKSAtPlxuICAgICRyb290U2NvcGUuc3dUaXRsZSA9IHN3VGl0bGVcbiAgICAkcm9vdFNjb3BlLiRvbiAnJHJvdXRlQ2hhbmdlU3VjY2VzcycsIChldmVudCwgY3VycmVudCwgcHJldmlvdXMpIC0+XG4gICAgICAgIGJhc2VUaXRsZSA9IGN1cnJlbnQuJCRyb3V0ZT8ubGFiZWwgb3IgJydcbiAgICAgICAgc3dUaXRsZS5zZXRUaXRsZUJhc2UoYmFzZVRpdGxlKVxuICAgICAgICBzd1RpdGxlLnNldFRpdGxlU3RhcnQoJycpXG4gICAgICAgIHN3VGl0bGUuc2V0VGl0bGVFbmQoJycpIiwiYW5ndWxhci5tb2R1bGUoJ3BhcmtLZWVwZXInKVxuLmNvbnRyb2xsZXIgJ01haW5DdHJsJywgKCRzY29wZSwgJGxvZywgc3dXZWJTb2NrZXQpIC0+XG4gICAgJGxvZy5pbmZvICdNYWluQ3RybCByZWFkeSEnXG5cbiMgICAgc29ja2V0ID0gbmV3IHN3V2ViU29ja2V0KCd3czovLzEyNy4wLjAuMTo4MDgwL21vbml0cycpXG4jICAgIHNvY2tldC5vbk1lc3NhZ2UgKG1zZykgLT5cbiMgICAgICAgICRsb2cuaW5mbyAnV1MnLCBtc2dcbiMgICAgc29ja2V0LnN0YXJ0KClcbiMgICAgc29ja2V0LnNlbmQoJ3BpbmcnKVxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9

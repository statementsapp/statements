(function() {
  'use strict';

  /** @ngInject */
  function LandingNavbarController($rootScope) {
    var vm = this;

    $scope.screenWidth = window.innerWidth;
    console.log("Screen width: ", $scope.screenWidth)
    vm.openRegisterModal = function() {
      $rootScope.$emit('openRegisterModal', {});
    };

    vm.openLoginModal = function() {
      $rootScope.$emit('openLoginModal', {});
    };
  }

  /** @ngInject */
  function ndLandingNavbar() {
    return {
      restrict: 'E',
      templateUrl: 'app/components/_directives/landing-navbar/landing-navbar.html',
      controller: LandingNavbarController,
      controllerAs: 'vm',
      bindToController: true,
      scope: true
    };
  }

  angular.module('statements')
    .directive('ndLandingNavbar', ndLandingNavbar);
})();

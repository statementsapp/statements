(function() {
  'use strict';

  /** @ngInject */
  function LandingNavbarController($rootScope) {
    var vm = this;

    $rootScope.screenWidth = window.innerWidth;
    console.log("Screen width: ", $rootScope.screenWidth)
    vm.openRegisterModal = function() {
      $rootScope.$emit('openRegisterModal', {});
    };

    vm.openLoginModal = function() {
      $rootScope.$emit('openLoginModal', {});
    };
  }

  /** @ngInject */
  function stmntsLandingNavbar() {
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
    .directive('stmntsLandingNavbar', stmntsLandingNavbar);
})();

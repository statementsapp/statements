(function () {
  'use strict';

  /** @ngInject */
  function runBlock($rootScope, $log) {
    $log.debug('runBlock end');

    $rootScope.firstEntry = true;
    $rootScope.redirectToEditor = false;
    $rootScope.editorParams = {};
    $rootScope.guest = false;
    $rootScope.debugMode = false;
    $rootScope.loggingIn = false;
    $rootScope.logInAsGuest = false;

    $rootScope.$on('$stateChangeStart', function (ev, to, toParams) {
      if ($rootScope.firstEntry) {
        if (!$rootScope.guest) {
          if (to.name === 'main.editor') {
            console.log("Redirect to editor trueing")
            $rootScope.redirectToEditor = true;
            $rootScope.editorParams = toParams;
          }
        }
        $rootScope.firstEntry = false;
      }
    });

    $rootScope.$on('$stateChangeError', function (event, toState, toParams, fromState, fromParams, error) {
      $log.debug(error);
    });
  }

  angular.module('statements').run(runBlock);
})();

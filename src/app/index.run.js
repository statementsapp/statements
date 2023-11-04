(function () {
  'use strict';

  /** @ngInject */
  function runBlock($rootScope, $log) {
    $log.debug('runBlock end');
    console.log("Block running")
    $rootScope.firstEntry = true;
    $rootScope.redirectToEditor = false;
    $rootScope.editorParams = {};
    $rootScope.guest = false;
    $rootScope.debugMode = false;
    $rootScope.loggingIn = false;
    $rootScope.logInAsGuest = false;

    $rootScope.$on('$stateChangeStart', function (ev, to, toParams) {

      var viewContainer = document.querySelector('[ui-view]') || document.querySelector('.your-main-container-class');
    
      // Remove the animation class
      if (viewContainer) {
      viewContainer.classList.remove('fadeInAnimation');
      }

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

    $rootScope.$on('$stateChangeSuccess', function() {
        // Find the main view container again
        var viewContainer = document.querySelector('[ui-view]') || document.querySelector('.your-main-container-class');
        
        // Re-add the animation class after a delay
        if (viewContainer) {
          $timeout(function() {
            viewContainer.classList.add('fadeInAnimation');
          });
        }
      });

    $rootScope.$on('$stateChangeError', function (event, toState, toParams, fromState, fromParams, error) {
      $log.debug(error);
    });
  }

  angular.module('statements').run(runBlock);
})();

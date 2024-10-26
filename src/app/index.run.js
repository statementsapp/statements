(function () {
  'use strict';

  /** @ngInject */
  function runBlock($rootScope, $log, $timeout) {
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

        setTimeout(function() {
          console.log("Removing fadein")
          viewContainer.classList.remove('fadeInAnimation');
        }, 50);
      
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
      var viewContainer = document.querySelector('[ui-view]') || document.querySelector('.your-main-container-class');
      
      if (viewContainer) {
        $timeout(function() {
          viewContainer.classList.add('fadeInAnimation');
        }, 0);
      }

      // Lazy load the video and set playback rate
      $timeout(function() {
        var video = document.getElementById('exampleAuthor');
        if (video) {
          video.preload = 'auto';
          video.load();
          video.playbackRate = 0.85; // Set playback rate to 85%
        }
      }, 1000);
    });

    $rootScope.$on('$stateChangeError', function (event, toState, toParams, fromState, fromParams, error) {
      $log.debug(error);
    });
  }

  angular.module('statements').run(runBlock);
})();

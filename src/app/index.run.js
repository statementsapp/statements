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
    
      if (viewContainer) {
        $timeout(function() {
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
          try {
            viewContainer.classList.add('fadeInAnimation');
            console.log('Animation class added successfully');
          } catch (error) {
            console.error('Error adding animation class:', error);
          }
        }, 300); // Increased timeout to 300ms
      } else {
        console.warn('View container not found');
      }

      // Lazy load the video and set playback rate
      $timeout(function() {
        var video = document.getElementById('exampleAuthor');
        if (video) {
          try {
            video.preload = 'auto';
            video.load();
            video.playbackRate = 0.85; // Set playback rate to 85%
            console.log('Video loaded and playback rate set');
          } catch (error) {
            console.error('Error setting up video:', error);
          }
        } else {
          console.warn('Video element not found');
        }
      }, 1000);
    });

    $rootScope.$on('$stateChangeError', function (event, toState, toParams, fromState, fromParams, error) {
      $log.error('State change error:', error);
      // You might want to redirect to an error page or show a notification here
    });
  }

  angular.module('statements').run(runBlock);
})();

( function () {
  'use strict';

  /** @ngInject */
  function LandingController($uibModal, $state, $log, $document, $window, $rootScope, $scope, ApiService, deviceDetector) {
    // For debugging the parallax effect
    $scope.debug = false;
    $scope.active = 0;
    $scope.processing = false;
    $scope.enter = '<enter>';
    $scope.screenWidth = window.innerWidth;
    console.log("Screen width: ", $scope.screenWidth)

    var element = document.getElementById('mySwipe');
    window.mySwipe = new Swipe(element, {
      startSlide: 0,
      auto: 3000,
      draggable: false,
      autoRestart: false,
      continuous: true,
      disableScroll: true,
      stopPropagation: true,
      callback: function(index, element) {},
      transitionEnd: function(index, element) {}
    });

    $scope.osClass = deviceDetector.os.windows ? 'windows' : 'mac';

    $scope.authorVideoSources = {
      videoSources: [
        { src: '/assets/movies/crops/1_text_crop_4x.mp4', type: 'video/mp4' }
      ]
    };

    $scope.criticVideoSources = {
      videoSources: [
        { src: '/assets/movies/crops/1_messenger_crop_4x.mp4', type: 'video/mp4' }
      ]
    };


    $scope.otherVideoSources = {
      videoSources: [
        { src: '/assets/movies/crops/2_messenger_crop_4x.mp4', type: 'video/mp4' }
      ]
    };

    $scope.onPlayerReady = function (API) {
      if (API.currentState !== 'play') {
        // Force play if autoplay doesn't work
        API.play();
        API.currentState = 'play';
        API.setVolume(0);
      }
    };

    $scope.selectedOption = { number: 2 };
    $scope.lastOption = { number: 2 };
    $scope.theWidth = {};
    $scope.inputs = {};

    var moveCounter = 0;
    var safety = false;

    // $scope.assignLastNumber = function () {
    //   $scope.lastOption.number = angular.copy($scope.selectedOption.number);
    // }



    $($document).mousemove(function (e) {
      // $('#status').html(e.pageX +', '+ e.pageY);
      // if (!$scope.userid){
      //   $scope.theWidth.value = document.getElementById('widthtograb').offsetWidth;
      // }

      // var theWidth = theCarousel.offsetWidth;


      setTimeout(function () {
        $scope.$apply(function () {
          moveCounter++;
          // if (e.pageX < (theWidth/3)){
          // if ($scope.selectedOption.number !== 0){
          //   $scope.lastOption.number = $scope.selectedOption.number;
          //   $scope.selectedOption.number = 0;
          // }
          // $scope.lastOption.number = angular.copy($scope.selectedOption.number);
          // $scope.selectedOption.number = 0;
          // }

          if (moveCounter > 50 && !safety) {
            if ($scope.selectedOption.number == 1) {
              $scope.lastOption.number = 1;
              $scope.selectedOption.number = 2;
            } else {
              $scope.lastOption.number = 2;
              $scope.selectedOption.number = 1;
            }
            moveCounter = 0;
            // $scope.lastOption.number = angular.copy($scope.selectedOption.number);
            // $scope.selectedOption.number = 1;
          }
          // else if (e.pageX < (theWidth/2) && moveCounter > 50){
          // if ($scope.selectedOption.number !== 2){
          //   $scope.lastOption.number = $scope.selectedOption.number;
          //   $scope.selectedOption.number = 2;
          // }
          // moveCounter = 0;
          //   // $scope.lastOption.number = angular.copy($scope.selectedOption.number);
          //   // $scope.selectedOption.number = 2;
          // }
        });
      }, 20);

    });

    if ($rootScope.$$listenerCount.openRegisterModal === undefined) {
      $rootScope.$on('openRegisterModal', function () {
        $uibModal.open({
          animation: true,
          ariaLabelledBy: 'modal-title-register',
          ariaDescribedBy: 'modal-body-register',
          templateUrl: 'app/landing/register-modal/register-modal.html',
          size: 'lg',
          controller: 'RegisterModalController',
          controllerAs: 'vm',
          backdrop: 'static',
          keyboard: false,
        }).result.then(function (success) {
          if (success) {
            $state.go('main.editor');
          }
        });
      });
    }

    if ($rootScope.$$listenerCount.openLoginModal === undefined) {
      $rootScope.$on('openLoginModal', function () {
        $uibModal.open({
          animation: true,
          ariaLabelledBy: 'modal-title-login',
          ariaDescribedBy: 'modal-body-login',
          templateUrl: 'app/landing/login-modal/login-modal.html',
          size: 'lg',
          controller: 'LoginModalController',
          controllerAs: 'vm',
          backdrop: 'static',
          keyboard: false,
        }).result.then(function (success) {
          if (success) {
            $state.go('main.editor');
          }
        });
      });
    }

    $scope.joinAsGuest = function () {
      $scope.loggingIn = true;
      $rootScope.logInAsGuest = true;
      ( new ApiService() ).signInAnonymously().then(function () {
        $state.go('main.editor');
      });
    };
  }

  angular.module('statements')
    .controller('LandingController', LandingController);

} )();

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
    $scope.plusToggle = false;
    console.log("Screen width: ", $scope.screenWidth)


    $scope.saveEmail = function () {
          var email = $scope.userEmail; // Get the email entered by the user
          console.log("Email: ", email)
          if (email && email.trim() !== '') {
            var database = firebase.database(); 
            var emailsRef = database.ref('emails');
            var newEmailRef = emailsRef.push();
            newEmailRef.set({
              email: email
            }, function (error) {
              if (error) {
                console.error('Error saving email:', error);
              } else {
                console.log('Email saved successfully!');
              }
            });
          } else {
            console.log('Please enter a valid email address.');
          }
          $scope.userEmail = ''; // Clear the input field after submission
        };
    

    
    $scope.videoOne = document.getElementById('exampleAuthor')
    $scope.videoTwo = document.getElementById('exampleCritic')
    $scope.videoThree = document.getElementById('other')




    setTimeout(function () {
      $scope.$apply(function () {
        // console.log("Video one: ", $scope.videoOne)
        // $scope.videoOne.addEventListener("loadeddata", function () {
        //   console.log("ONE has started loading successfully!");
        // });

        // $scope.videoTwo.addEventListener("loadeddata", function () {
        //   console.log("TWO has started loading successfully!");
        // });

        // $scope.videoThree.addEventListener("loadeddata", function () {
        //   console.log("THREE has started loading successfully!");
        // });
      });
    }, 5000);

    // var swiper = new Swiper('.swiper', {
    //   // Optional parameters
    //   direction: 'horizontal',
    //   loop: true,

    //   // If we need pagination
    //   pagination: {
    //     el: '.swiper-pagination',
    //   },

    //   // Navigation arrows
    //   navigation: {
    //     nextEl: '.swiper-button-next',
    //     prevEl: '.swiper-button-prev',
    //   },

    //   // And if we need scrollbar
    //   scrollbar: {
    //     el: '.swiper-scrollbar',
    //   },
    // });

    $scope.osClass = deviceDetector.os.windows ? 'windows' : 'mac';

    $scope.compositeVideoSources = {
      videoSources: [
        { src: '/assets/movies/NewLoop.mp4', type: 'video/mp4' }
      ]
    };

    $scope.authorVideoSources = {
      videoSources: [
        { src: '/assets/movies/P1speduptext2.mp4', type: 'video/mp4' }
      ]
    };

    $scope.criticVideoSources = {
      videoSources: [
        { src: '/assets/movies/P1spedupreviewer.mp4', type: 'video/mp4' }
      ]
    };


    $scope.otherVideoSources = {
      videoSources: [
        { src: '/assets/movies/P1spedupmessages.mp4', type: 'video/mp4' }
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

    if ($rootScope.$$listenerCount.openSignupModal === undefined) {
      $rootScope.$on('openSignupModal', function () {
        $uibModal.open({
          animation: true,
          ariaLabelledBy: 'modal-title-login',
          ariaDescribedBy: 'modal-body-login',
          templateUrl: 'app/landing/signup-modal/signup-modal.html',
          size: 'lg',
          controller: 'SignupModalController',
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

    $scope.openLoginModal = function () {
      setTimeout(function() {
        console.log("The modal element: ", document.getElementsByClassName("modal"));
        document.getElementsByClassName("modal").addEventListener("click", $uibModal.dismiss());
      }, 10);
      console.log("The modal element: ", document.getElementsByClassName("modal"));
      $scope.loginModalInstance = $uibModal.open({
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

          $location.reload();

        }
      });
    };

    $scope.openRegisterModal = function () {
      // setTimeout(() => {
        $scope.loginModalInstance = $uibModal.open({
          animation: true,
          ariaLabelledBy: 'modal-title-register',
          ariaDescribedBy: 'modal-body-register',
          templateUrl: 'app/landing/register-modal/register-modal.html',
          size: 'lg',
          controller: 'RegisterModalController',
          controllerAs: 'vm',
          backdrop: 'static',
        }).result.then(function (success) {
          if (success) {
            $location.reload();
          }
        });
      // }, 1000)

      
    };

    $scope.openProfileModal = function () {
      $scope.profileModalInstance = $uibModal.open({
        animation: true,
        ariaLabelledBy: 'modal-title-profile',
        ariaDescribedBy: 'modal-body-profile',
        templateUrl: 'app/editor/profile-modal/profile-modal.html',
        size: 'lg',
        controller: 'ProfileModalController',
        controllerAs: 'vm',
        backdrop: 'static',
        keyboard: false,
        resolve: {
          profileService: profileService,
          libraryService: libraryService,
          apiService: apiService
        }
      }).result.then(function () {
        $scope.profile = profileService.getProfile();

        chatSocket.emit('userUpdated', {
          userId: $scope.uid,
          displayName: $scope.profile.displayName,
          bookId: $scope.bookId
        });
      });
    };

    $scope.openSignupModal = function () {
      $scope.loginModalInstance = $uibModal.open({
        animation: true,
        ariaLabelledBy: 'modal-title-register',
        ariaDescribedBy: 'modal-body-register',
        templateUrl: 'app/landing/signup-modal/signup-modal.html',
        size: 'lg',
        controller: 'SignupModalController',
        controllerAs: 'vm',
        backdrop: 'static',
      }).result.then(function (success) {
        if (success) {
          $location.reload();
        }
      });
    };

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

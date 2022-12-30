(function() {
  'use strict';

  /** @ngInject */
  function RegisterModalController($uibModalInstance, $state, ApiService) {
    var vm = this;
    vm.apiService = new ApiService();

    vm.errors = {
      passwordsMatch: null,
      malformedEmail: null
    };

    vm.isValid = false;
    vm.passwordVerify = '';

    vm.user = {
      firstName: '',
      lastName: '',
      email: '',
      password: ''
    };

    var signUpButton = document.getElementById('signUp')
    var signInButton = document.getElementById('signIn')
    var container = document.getElementById('container')

    // signUpButton.addEventListener('click', () => {
    //   container.classList.add('right-panel-active');
    // });

    // signInButton.addEventListener('click', () => {
    //   container.classList.remove('right-panel-active');
    // });

    vm.register = function(isValid) {
      if (isValid) {
        vm.processing = true;
        vm.apiService.registerWithEmailAndPassword(vm.user.email, vm.user.password)
          .then(function() {
            vm.apiService.updateProfile({
              displayName: vm.user.firstName + ' ' + vm.user.lastName,
              firstName: vm.user.firstName,
              lastName: vm.user.lastName,
              email: vm.user.email
            }).then(function() {
              vm.processing = false;
              $uibModalInstance.dismiss(true);
            }).catch(function(error) {
              console.error(error);
              vm.processing = false;
            });
          }, function(error) {
            console.error(error);
            vm.processing = false;
          });
      }
    };

    vm.openSignupModal = function () {
      console.log("to run the signupmodal")
      console.log("uib modal instance: ", $uibModalInstance)
      setTimeout(() => {
        $uibModalInstance.open({
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
      }, 1000)
      
    };

    vm.cancel = function() {
      $uibModalInstance.dismiss();
    };

  }

  angular.module('statements')
    .controller('RegisterModalController', RegisterModalController);

})
();

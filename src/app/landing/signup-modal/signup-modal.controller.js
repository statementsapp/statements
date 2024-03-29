(function() {
  'use strict';

  /** @ngInject */
  function SignupModalController($uibModalInstance, $state, ApiService, $rootScope) {
    
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

        vm.register = function(isValid) {
          if (isValid) {
            $rootScope.redirectToEditor = true;
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

        vm.cancel = function() {
          $uibModalInstance.dismiss();
        };

  }

  angular.module('statements')
    .controller('SignupModalController', SignupModalController);

})
();

(function() {
  'use strict';

  /** @ngInject */
  function LoginModalController($uibModalInstance, ApiService) {
    var vm = this;
    vm.apiService = new ApiService();
    vm.processing = false;

    vm.user = {
      email: '',
      password: ''
    };

    vm.login = function(isValid) {
      if (isValid) {
        vm.processing = true;
        vm.apiService.signInWithEmailAndPassword(vm.user.email, vm.user.password)
          .then(function() {
            vm.processing = false;
            $uibModalInstance.dismiss(true);
          }, function(error) {
            console.error(error);
            vm.processing = false;
          });
      }
    };

    vm.cancel = function() {
      $uibModalInstance.dismiss(false);
    };
  }

  angular.module('statements')
    .controller('LoginModalController', LoginModalController);

})();

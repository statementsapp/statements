(function() {
  'use strict';

  /** @ngInject */
  function ProfileModalController($uibModalInstance, profileService, libraryService, apiService) {
    var vm = this;

    vm.profile = profileService.getProfile();
    vm.processing = false;

    vm.updateProfile = function(isValid) {
      if (isValid) {
        vm.processing = true;
        return apiService.updateProfile(vm.profile).then(function (result) {
          vm.profile = result.data;
          profileService.setProfile(result.data);
          vm.dismiss();
        }).catch(function (error) {
          vm.profileError = error.message;
        });
      } else {
        console.log('form not valid');
      }
    };

    vm.dismiss = function() {
      $uibModalInstance.dismiss();
    };
  }

  angular.module('statements')
    .controller('ProfileModalController', ProfileModalController);

})();

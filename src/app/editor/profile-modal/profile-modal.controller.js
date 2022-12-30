(function() {
  'use strict';

  /** @ngInject */
  function ProfileModalController($uibModalInstance, profileService, libraryService, apiService) {
    var vm = this;

    vm.profile = profileService.getProfile();
    
  }

  angular.module('statements')
    .controller('ProfileModalController', ProfileModalController);

})();

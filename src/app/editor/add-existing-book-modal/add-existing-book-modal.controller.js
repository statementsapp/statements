(function () {
  'use strict';

  /** @ngInject */
  function AddExistingBookModalController($uibModalInstance, profileService, apiService) {
    var vm = this;

    vm.bookId = '';
    vm.errors = {
      noBookFound: false,
      misc: null
    };

    vm.dismiss = function() {
      $uibModalInstance.dismiss();
    };

    vm.openBook = function() {
      vm.processing = true;

      apiService.readBook(vm.bookId).then(function(result) {
        if (result.data === 'null') {
          vm.errors.noBookFound = true;
        } else {
          vm.errors.noBookFound = false;
          var bookIds = profileService.getBookIds();
          bookIds.push(vm.bookId);
          profileService.setBookIds(bookIds);
          apiService.updateProfile(profileService.getProfile()).then(function() {
            vm.processing = false;
            $uibModalInstance.close(vm.bookId);
          }).catch(function(error) {
            console.log(error);
          });
        }
      }).catch(function(error) {
        vm.errors.misc = error;
        console.error(error);
      }).finally(function() {
        vm.processing = false;
      });

    };

    vm.cancel = function() {
      $uibModalInstance.close(false);
    };

  }

  angular.module('statements')
    .controller('AddExistingBookModalController', AddExistingBookModalController);

})();

(function () {
  'use strict';

  /** @ngInject */
  function LibraryModalController($uibModalInstance, profileService, libraryService, apiService, $rootScope, $state) {
    var vm = this;

    vm.books = libraryService.getBooks(profileService.getBookIds());
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

    vm.selectBook = function(bookId) {
      $uibModalInstance.close(bookId);
    };

    vm.dismiss = function() {
      $uibModalInstance.dismiss();
    };

    vm.deleteBook = function(bookId) {
      // TODO delete book logic goes here.
    };

    vm.logout = function () {
      apiService.signOut().then(function () {
        profileService.clear();
        libraryService.clear();
        $rootScope.guest = false;
        $state.go('login');
      });
    }

  }

  angular.module('statements')
    .controller('LibraryModalController', LibraryModalController);

})();

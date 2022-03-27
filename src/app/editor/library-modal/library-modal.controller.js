(function () {
  'use strict';

  /** @ngInject */
  function LibraryModalController($uibModalInstance, profileService, libraryService) {
    var vm = this;

    vm.books = libraryService.getBooks(profileService.getBookIds());
    vm.profile = profileService.getProfile();

    vm.selectBook = function(bookId) {
      $uibModalInstance.close(bookId);
    };

    vm.dismiss = function() {
      $uibModalInstance.dismiss();
    };

    vm.deleteBook = function(bookId) {
      // TODO delete book logic goes here.
    };

  }

  angular.module('statements')
    .controller('LibraryModalController', LibraryModalController);

})();

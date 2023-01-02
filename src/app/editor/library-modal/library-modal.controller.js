(function () {
  'use strict';

  /** @ngInject */
  function LibraryModalController($uibModalInstance, profileService, libraryService, apiService, $rootScope, $state, $uibModal, chatSocket) {
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

    vm.addBookFromLibrary = function() {
      setTimeout(function () {
        $uibModal.open({
                animation: true,
                ariaLabelledBy: 'modal-title-new-book',
                ariaDescribedBy: 'modal-body-new-book',
                templateUrl: 'app/editor/new-book-modal/new-book-modal.html',
                size: 'lg',
                controller: 'NewBookModalController',
                controllerAs: 'vm',
                keyboard: false,
                backdrop: 'static',
                // windowTemplateUrl: 'app/editor/new-book-modal/choice-window.html',
                resolve: {
                  profileService: profileService,
                  libraryService: libraryService,
                  apiService: apiService
                }
              }).result.then(function (bookId) {
        console.log("Is there that book id")
        if (bookId) {
          chatSocket.emit('leave', bookId);
          console.log("that book id: ", bookId)
          $state.go('main.editor', {bookId: bookId});
        }
      });
      }, 5)

      vm.dismiss();


      
    };

    vm.logout = function () {
      vm.dismiss();
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

(function () {
  'use strict';

  /** @ngInject */
  function LibraryModalController($uibModalInstance, profileService, libraryService, apiService, $rootScope, $state, $uibModal, chatSocket, $document, $scope) {
    var vm = this;

    $scope.showModal = true;

    // Some code for dismissing the modal on click outside of it
    // $document.on('click', function(event) {
    //     console.log("Event: ", event.target)
    //     if ($scope.showModal && event.target === 'div.modal.fade.ng-isolate-scope.in)') {
    //       $scope.$apply(function() {
    //         $scope.showModal = false;
    //       });
    //     }
    //   });


     vm.bookId = '';
     vm.errors = {
       noBookFound: false,
       misc: null
     };

     console.log("rootscope: ", $rootScope.uid)
    vm.basisForBooks = libraryService.getBooks(profileService.getBookIds())
    vm.books = libraryService.getBooks(profileService.getBookIds())
    .filter(book => book.documentClaimedBy === $rootScope.uid);
    // console.log("Profile service in library modal controller: ", profileService.getProfile())
    if (profileService.getProfile().negations){
      vm.negations = profileService.getProfile().negations;
      vm.booksNegated = vm.books.filter(book => vm.negations.includes(book.uid));
    }

    vm.booksViewed = libraryService.getBooks(profileService.getBookIds())
    
    // console.log("VM books: ", vm.books)
    // console.log("negations on the library modal controller", vm.booksNegated)
    vm.profile = profileService.getProfile();
    console.log("Loaded library profile state is: ", vm.profile)
    vm.processing = false;

    vm.updateProfile = function(isValid) {
      if (isValid) {
        vm.processing = true;
        return apiService.updateProfile(vm.profile).then(function (result) {
          // console.log("Got that update profile response: ", result.data)
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

    vm.openBook = function() {
      if(vm.bookId.startsWith("http")){
        vm.bookId = vm.bookId.slice(vm.bookId.indexOf('-'));
      }
      console.log("vm book Id: ", vm.bookId)
      vm.processing = true;

      apiService.readBook(vm.bookId).then(function(result) {
        if (result.data === 'null') {
          console.log("No book found")
          vm.errors.noBookFound = true;
        } else {
          console.log("Else book fround")
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
        // console.log("Is there that book id")
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

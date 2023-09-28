(function () {
  'use strict';

  /** @ngInject */
  function NewBookModalController($rootScope,
                                  IdFactory,
                                  $uibModalInstance,
                                  profileService,
                                  libraryService,
                                  apiService,
                                  BookFactory,
                                  $timeout,
                                  $scope) {
    var vm = this;

    vm.title = '';
    vm.processing = false;
    $scope.enter = '<enter>'
    // $('#addbookmodal').modal({backdrop: 'static', keyboard: false})  

    $timeout(function() {
      document.getElementById('title').focus();
    });

    vm.addNewBook = function () {
      console.log("Adding a new book")
      if (vm.title == ''){
        return;
      }
      vm.processing = true;

      var book = Object.assign({}, BookFactory.empty(vm.title));
      var now = moment().unix();
      book.documentClaimedBy = $rootScope.uid;
      book.dateCreated = now;
      book.lastModified = now;
      book.lastModifiedBy = $rootScope.uid;
      apiService.createBook(book).then(function (result) {
        console.log("Add new result: ", result)
        var bookId = result.data;
        libraryService.addBook(bookId, book);
        var bookIds = profileService.getBookIds();
        bookIds.push(bookId);
        console.log('bookIds', bookIds);
        console.log('profileService', profileService);
        profileService.setBookIds(bookIds);
        apiService.updateProfile(profileService.getProfile()).then(function () {
          vm.processing = false;
          $uibModalInstance.close(bookId);
        }).catch(function (error) {
          console.log(error);
        });
      }).catch(function (error) {
        vm.processing = false;
        console.error(error);
      });

    };

    vm.cancel = function () {
      $uibModalInstance.close(false);
    };
  }

  angular.module('statements')
    .controller('NewBookModalController', NewBookModalController);

})();

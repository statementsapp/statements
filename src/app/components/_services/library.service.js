(function() {
  'use strict';

  /** @ngInject */
  function LibraryService() {
    var library = [];

    var libraryService = function() { };

    libraryService.prototype = {
      setLibrary: setLibrary,
      getLibrary: getLibrary,
      addBook: addBook,
      getBooks: getBooks,
      removeBook: removeBook,
      clear: clear
    };

    function getBooks(uids) {
      var books = [];
      for (var key in library) {
        if (uids.includes(key)) {
          books.push({ book: library[key], uid: key });
        }
      }
      return books;
    }

    function addBook(uid, value) {
      if (library === '') {
        library = {};
      }
      library[uid] = value;
    }

    function removeBook(uid) {
      delete library[uid];
    }

    function setLibrary(value) {
      library = value;
    }

    function getLibrary() {
      return library;
    }

    function clear() {
      library = [];
    }

    return libraryService;
  }

  angular.module('statements')
    .service('LibraryService', LibraryService);
})();

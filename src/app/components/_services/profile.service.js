( function () {
  'use strict';

  /** @ngInject */
  function ProfileService() {
    var profileService = function () {
    };

    var profile = {};
    var selectedBook = null;

    function setProfile(value) {
      profile = value;
    }

    function getProfile() {
      return profile;
    }

    function setBookIds(value) {
      if (profile === null) {
        profile = {
          books: value,
          emailAddress: '',
          firstName: 'Guest',
          lastName: 'User',
          displayName: 'Guest User',
          lastModified: new Date(),
        };
      }
      profile.books = value;
    }

    function addBookId(bookId) {
      if (profile.books) {
        var existingId = profile.books.filter(function (x) {
          return x === bookId;
        });
        if (!existingId) {
          profile.books.push(bookId);
        }
      }
    }

    function removeBookId(value) {
      if (profile.books) {
        profile = profile.books.filter(function (x) {
          return x !== value;
        });
      }
    }

    function getBookIds() {
      return profile.books || [];
    }

    function setSelectedBook(value) {
      selectedBook = value;
    }

    function getSelectedBook() {
      return selectedBook;
    }

    function clear() {
      profile = {};
      selectedBook = null;
    }

    profileService.prototype = {
      setProfile: setProfile,
      getProfile: getProfile,
      getBookIds: getBookIds,
      setBookIds: setBookIds,
      removeBookId: removeBookId,
      addBookId: addBookId,
      setSelectedBook: setSelectedBook,
      getSelectedBook: getSelectedBook,
      clear: clear
    };

    return profileService;
  }

  angular.module('statements')
    .service('ProfileService', ProfileService);

} )();

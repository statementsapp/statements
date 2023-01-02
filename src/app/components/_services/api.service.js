( function () {
  'use strict';

  /** @ngInject */
  function ApiService($rootScope, $q, $http) {
    var apiService = function () {
    };

    function registerWithEmailAndPassword(email, password) {
      var d = $q.defer();
      firebase.auth().createUserWithEmailAndPassword(email, password)
        .then(function () {
          firebase.auth().onAuthStateChanged(function (user) {
            $rootScope.uid = user.uid;
            user.getIdToken(true).then(function (token) {
              $rootScope.token = token;
              d.resolve();
            }).catch(function (error) {
              d.reject(error);
            });
          });
        }, function (error) {
          d.reject(error);
        });
      return d.promise;
    }

    function signInWithEmailAndPassword(email, password) {
      var d = $q.defer();
      firebase.auth().signInWithEmailAndPassword(email, password)
        .then(function () {
          firebase.auth().onAuthStateChanged(function (user) {
            $rootScope.uid = user.uid;
            user.getIdToken(true).then(function (token) {
              $rootScope.token = token;
              d.resolve();
            }).catch(function (error) {
              d.reject(error);
            });
          });
        }, function (error) {
          d.reject(error);
        });
      return d.promise;
    }

    function signInAnonymously() {
      var d = $q.defer();
      firebase.auth().signInAnonymously()
        .then(function() {
          firebase.auth().onAuthStateChanged(function(user) {
            $rootScope.uid = user.uid;
            $rootScope.guest = true;
            user.getIdToken(false).then(function(token) {
              $rootScope.token = token;
              d.resolve();
            }).catch(function(error) {
              console.error(error);
              d.reject(error);
            });
          });
        }, function(error) {
          console.error(error);
          d.reject(error);
        });
      return d.promise;
    }

    function signOut() {
      var d = $q.defer();
      firebase.auth().signOut().then(function () {
        $rootScope.uid = '';
        $rootScope.token = '';
        d.resolve();
      }, function (error) {
        d.reject(error);
      });
      return d.promise;
    }

    function post(endpoint, obj) {
      var d = $q.defer();
      $http({
        method: 'POST',
        url: endpoint,
        data: JSON.stringify(obj),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + $rootScope.token
        }
      }).then(
        function (result) {
          d.resolve(result);
        }, function (error) {
          d.reject(error);
        });
      return d.promise;
    }

    function get(endpoint) {
      var d = $q.defer();
      $http({
        method: 'GET',
        url: endpoint,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + $rootScope.token
        }
      }).then(
        function (result) {
          d.resolve(result);
        }, function (error) {
          d.reject(error);
        });
      return d.promise;
    }

    function del(endpoint) {
      var d = $q.defer();
      $http({
        method: 'DELETE',
        url: endpoint,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + $rootScope.token
        }
      }).then(
        function (result) {
          d.resolve(result);
        }, function (error) {
          d.reject(error);
        });
      return d.promise;
    }

    function getEnv() {
      return get('/config');
    }

    function readProfile() {
      return get('/user/' + $rootScope.uid + '/profile');
    }

    function updateProfile(profile) {
      console.log("Posting a profile")
      return post('/user/' + $rootScope.uid + '/profile', profile);
    }

    function readLibrary() {
      return get('/library');
    }

    function createBook(book) {
      return post('/library/book', { book: book });
    }

    function readBook(bookId) {
      console.log("Reading book: ", bookId)
      return get('/library/book/' + bookId);
    }

    function updateBook(bookId, book) {
      return post('/library/book/' + bookId + '/update', { book: book });
    }

    function removeBook(bookId) {
      return del('/library/book/' + bookId);
    }

    function updatePropositions(bookId, propositions) {
      return post('/library/props/' + bookId, { propositions: propositions });
    }

    function readPropositions(bookId) {
      return get('/library/props/' + bookId);
    }

    apiService.prototype = {
      registerWithEmailAndPassword: registerWithEmailAndPassword,
      signInWithEmailAndPassword: signInWithEmailAndPassword,
      signInAnonymously: signInAnonymously,
      signOut: signOut,
      getEnv: getEnv,
      readProfile: readProfile,
      updateProfile: updateProfile,
      readLibrary: readLibrary,
      createBook: createBook,
      readBook: readBook,
      updateBook: updateBook,
      removeBook: removeBook,
      updatePropositions: updatePropositions,
      readPropositions: readPropositions
    };

    return apiService;
  }

  angular.module('statements')
    .service('ApiService', ApiService);

} )();

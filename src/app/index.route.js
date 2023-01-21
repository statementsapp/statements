( function () {
  'use strict';

  angular.module('statements')
    .config(function ($stateProvider, $urlRouterProvider) {

      $stateProvider
        .state('main', {
          name: 'main',
          abstract: true,
          template: '<ui-view />',
          resolve: {
            auth: function ($rootScope) {
              console.log("State auth")
              firebase.auth().onAuthStateChanged(function (user) {
                if (user) {
                  $scope.loggingIn = true;
                  $rootScope.logInAsGuest = true;
                  ( new ApiService() ).signInAnonymously().then(function () {
                    $state.go('main.editor');
                  });
                  $rootScope.uid = user.uid;
                  user.getIdToken().then(function (token) {
                    $rootScope.token = token;
                  }).catch(function (error) {
                    console.error(error);
                  });
                }
              });
            },
            apiService: function (auth, ApiService) {
              console.log("State apiservice")
              return new ApiService();
            },
            env: function (apiService, $rootScope) {
              console.log("State env")
              return apiService.getEnv().then(function (result) {
                $rootScope.env = result.data;
              });
            },
            libraryService: function (LibraryService, library) {
              console.log("State libraryservice")
              var libraryService = new LibraryService();
              libraryService.setLibrary(library);
              return libraryService;
            },
            profileService: function (ProfileService, profile) {
              console.log("state profileservice")
              var profileService = new ProfileService();
              profileService.setProfile(profile);
              return profileService;
            },
            profile: function ($state, $rootScope, apiService) {
              console.log("Just the profile")
              return apiService.readProfile().then(function (result) {
                if (result.status === 200) {
                  if (result.data !== 'null') {
                    return result.data;
                  } else {
                    return {
                      books: [],
                      emailAddress: '',
                      firstName: 'Guest',
                      lastName: 'User',
                      displayName: 'Guest User',
                      lastModified: new Date()
                    };
                  }
                } else {
                  return {};
                }
              }).catch(function (error) {
                console.error(error);
              });
            },
            library: function ($state, $rootScope, apiService) {
              console.log("state library")
              return apiService.readLibrary().then(function (result) {
                if (result.status === 200) {
                  return result.data;
                } else {
                  return {};
                }
              }).catch(function (error) {
                console.error(error);
              });
            },

          }
        })
        .state('main.editor', {
          url: '/editor/:bookId',
          controller: 'EditorController',
          controllerAs: 'vm',
          templateUrl: 'app/editor/editor.html'
        })
        .state('login', {
          url: '/login',
          controller: 'LandingController',
          controllerAs: 'vm',
          templateUrl: 'app/landing/landing.html',
          resolve: {
            requiresNoAuth: function ($rootScope, $state, $timeout, $uibModal) {
              console.log("requires no auth")
              return firebase.auth().onAuthStateChanged(function (user) {
                if (user) {

                  if (user.isAnonymous && !$rootScope.logInAsGuest) {

                    user.delete().then(function () {
                      console.log('bye bye anon');
                    });

                  } else {
                    $rootScope.uid = user.uid;
                    user.getIdToken().then(function (token) {
                      console.log("That checker")
                      $rootScope.token = token;
                      // comment out above line to disable automatic login
                      if ($rootScope.redirectToEditor) {
                        $rootScope.loggingIn = false;
                        console.log('THIS if')
                        $rootScope.redirectToEditor = false;
                        $rootScope.logInAsGuest = false;
                        $state.go('main.editor', $rootScope.editorParams);
                      } else {
                        $rootScope.loggingIn = false;
                        $timeout(function () {
                          console.log('THIS ELSE')
                          $rootScope.logInAsGuest = true;
                          $state.go('main.editor');
                          
                        }, 250);
                      }
                    }).catch(function (error) {
                      console.error(error);
                    });
                  }
                }
              });
            }
          }
        });

      $urlRouterProvider.when('/', '/login');
      $urlRouterProvider.otherwise('/');

    });
} )();

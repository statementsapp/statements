(function() {
  'use strict';

  /** @ngInject */
  function config($logProvider, toastrConfig) {
    // Enable log
    $logProvider.debugEnabled(true);

    // $locationProvider.html5Mode({ enabled: true });

    // Set options third-party lib
    toastrConfig.allowHtml = true;
    toastrConfig.timeOut = 3000;
    toastrConfig.positionClass = 'toast-bottom-right';
    toastrConfig.preventDuplicates = true;
    toastrConfig.progressBar = true;
    var firebaseConfig = {
      apiKey: "AIzaSyDfrkcBavme0JXpZ1qxP070RexWU7Ct1l4",
      authDomain: "statements-275d0.firebaseapp.com",
      databaseURL: "https://statements-275d0-default-rtdb.firebaseio.com",
      projectId: "statements-275d0",
      storageBucket: "statements-275d0.appspot.com",
      messagingSenderId: "764215061762",
      appId: "1:764215061762:web:997def1495aa0e79af261b",
      measurementId: "G-XZ5HWVV5QX"
    };
    
    firebase.initializeApp(firebaseConfig);
  }

  angular.module('statements').config(config);
})();

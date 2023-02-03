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
    const firebaseConfig = {
      apiKey: "AIzaSyBnFxeuoKCj_d4pWd3zkMZqeH95YdUbjNw",
      authDomain: "statements-local.firebaseapp.com",
      projectId: "statements-local",
      storageBucket: "statements-local.appspot.com",
      messagingSenderId: "279125456259",
      appId: "1:279125456259:web:f595c1d616eb7fb81032b6",
      measurementId: "G-0YG4NK8DL9",
      databaseURL: "https://statements-local-default-rtdb.firebaseio.com",
    };
    
    firebase.initializeApp(firebaseConfig);
  }

  angular.module('statements').config(config);
})();

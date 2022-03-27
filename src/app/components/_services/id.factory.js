(function() {
  'use strict';

  /** @ngInject */
  function IdFactory() {
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    var generateId = function() {
      var idText = '';
      for (var i = 0; i < 20; i++) {
        idText += possible.charAt(Math.floor(Math.random() * possible.length));
      }
      return idText;
    };

    return {
      next: generateId
    };

  }

  angular.module('statements')
    .factory('IdFactory', IdFactory);
})();

(function() {
  'use strict';

  /** @ngInject **/
  function ColorFactory() {
    var hex = '0123456789ABCDEF';

    var random = function() {
      var color = '#';
      for (var i = 0; i < 6; i++) {
        color += hex[Math.floor(Math.random() * 16)];
      }
      return color;
    };

    return {
      random: random
    };
  }

  angular.module('statements')
    .factory('ColorFactory', ColorFactory);
})();

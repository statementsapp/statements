/* global moment:false */
(function() {
  'use strict';

  angular.module('statements')
    .constant('moment', moment)
    .constant('firebase', firebase)
    .constant('d3', d3)
    .constant('$', $);

})();

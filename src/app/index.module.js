(function() {
  'use strict';

  angular.module('statements', [
    'ngAnimate',
    'ngCookies',
    'ngTouch',
    'ngSanitize',
    'ngMessages',
    'ngAria',
    'ngResource',
    'ui.router',
    'ui.bootstrap',
    'toastr'
  ]);

  // Lazy load these modules
  angular.module('statements').requires.push('ng.deviceDetector');
  angular.module('statements').requires.push('ngDragDrop');
  angular.module('statements').requires.push('ui.tree');
  angular.module('statements').requires.push('ui-notification');
  angular.module('statements').requires.push('btford.socket-io');
  angular.module('statements').requires.push('duScroll');

})();

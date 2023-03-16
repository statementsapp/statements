(function() {
  'use strict';

  /** @ngInject */
  function focusFactory($timeout, $window) {
    return function(id) {
      // timeout makes sure that is invoked after any other event has been triggered.
      // e.g. click events that need to run before the focus or
      // inputs elements that are in a disabled state but are enabled when those events
      // are triggered.
      $timeout(function() {
        var element = $window.document.getElementById(id);
        if (element) {
          console.log("Element object: ", element)
          element.focus();
          $(id).focus();
          $(element).focus();
          element.setSelectionRange(element.textContent.length, element.textContent.length);
        } else {
          // element.focus();
          // $(id).focus()
          // $(element).focus()
        }
      });
    };
  }

  angular.module('statements')
    .factory('focusFactory', focusFactory);
})();

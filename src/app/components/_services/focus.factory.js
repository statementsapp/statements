(function() {
  'use strict';

  /** @ngInject */
  function focusFactory($timeout, $window) {
    return function(id, selectedProposition) {
      // timeout makes sure that is invoked after any other event has been triggered.
      // e.g. click events that need to run before the focus or
      // inputs elements that are in a disabled state but are enabled when those events
      // are triggered.
      $timeout(function() {
        console.log("focusing")
        var element = $window.document.getElementById(id);
        if (element) {
          element.focus();
          $(id).focus();
          $(element).focus();


          if (selectedProposition){
            if (selectedProposition.textSide || !selectedProposition.dialogueSide){
              console.log("Inside two conditions")
              const range = document.createRange();
              range.selectNodeContents(element);
              range.collapse(false);

              // // Set the selection to the new range
              const selection = window.getSelection();
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
          



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

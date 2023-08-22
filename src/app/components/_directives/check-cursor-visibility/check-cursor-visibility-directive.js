(function() {
  'use strict';

  /** @ngInject */
  function checkCursorVisibility($window, $timeout) {
    return {
      restrict: 'A',
      link: function(scope, elem, attrs) {
        elem.on('keyup', function() {
          $timeout(function() {
            let sel = window.getSelection();
            if (!sel.rangeCount) return;

            let range = sel.getRangeAt(0).cloneRange();
            range.collapse(true);
            let dummy = document.createElement('span');
            range.insertNode(dummy);
            let rect = dummy.getBoundingClientRect();
            dummy.parentNode.removeChild(dummy);

            if (rect.top < elem[0].getBoundingClientRect().top || 
                rect.bottom > elem[0].getBoundingClientRect().bottom) {
                console.log("Does a visibility adjustment")
              elem[0].scrollTop = rect.top - elem[0].getBoundingClientRect().top + elem[0].scrollTop;
            }
          });
        });
      }
    };
  }

  angular.module('statements')
    .directive('checkCursorVisibility', checkCursorVisibility);

}());



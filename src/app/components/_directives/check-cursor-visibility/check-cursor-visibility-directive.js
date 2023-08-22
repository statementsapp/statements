(function() {
  'use strict';

  /** @ngInject */
  function checkCursorVisibility($timeout) {
    return {
      restrict: 'A',
      link: function(scope, elem, attrs) {
            let parentContainer = elem.parent(); // Assuming direct parent is the scroll container

            elem.on('keyup', function() {
              $timeout(function() {
                let sel = window.getSelection();
                if (!sel.rangeCount) return;

                let range = sel.getRangeAt(0).cloneRange();
                range.collapse(true);
                let dummy = document.createElement('span');
                range.insertNode(dummy);
                let rect = dummy.getBoundingClientRect();
                let parentRect = parentContainer[0].getBoundingClientRect();
                dummy.parentNode.removeChild(dummy);

                if (rect.top < parentRect.top) {
                  // Cursor is above the viewable area
                    console.log("Scroll if visibility")
                  parentContainer[0].scrollTop -= (parentRect.top - rect.top);
                } else if (rect.bottom > parentRect.bottom) {
                  // Cursor is below the viewable area
                    console.log("Scroll else visibility")
                  parentContainer[0].scrollTop += (rect.bottom - parentRect.bottom);
                }
              });
            });
          }
  }

  angular.module('statements')
    .directive('checkCursorVisibility', checkCursorVisibility);

}());



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
                  
                  let dummyRect = dummy.getBoundingClientRect();
                  let parentRect = parentContainer[0].getBoundingClientRect();

                  if (dummyRect.bottom > parentRect.bottom) {
                    // Cursor is below the viewable area
                    let scrollNeeded = dummyRect.bottom - parentRect.bottom;
                    parentContainer[0].scrollTop += scrollNeeded;
                  } else if (dummyRect.top < parentRect.top) {
                    console.log("BELOW VISIBLE ELSE")
                    // Cursor is above the viewable area
                    parentContainer[0].scrollTop -= parentRect.top - dummyRect.top;
                  }
                  
                  // Remove the dummy span
                  dummy.parentNode.removeChild(dummy);
                });
              });
      }
    };
  }

  angular.module('statements')
    .directive('checkCursorVisibility', checkCursorVisibility);

}());



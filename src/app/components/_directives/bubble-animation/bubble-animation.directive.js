(function() {
  'use strict';

  /** @ngInject */
  function bubbleAnimation($timeout) {
    return {
    		
    		    link: function(scope, element, attrs) {
    		      // Apply the 'new-message' class only to the new messages added after the initial load
    		      if (scope.$last) {
    		        $timeout(function() {
    		          element.addClass('new-message');
    		        }, 0);
    		      }
    		    }
    		  
    };
  }

  angular.module('statements')
    .directive('bubbleAnimation', bubbleAnimation;

}());

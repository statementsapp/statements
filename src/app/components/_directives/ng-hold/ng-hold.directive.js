(function() {
  'use strict';

  /** @ngInject */
  function ngHold($parse, $timeout) {
    return {
          restrict: 'A',
          link: function(scope, el, attrs) {
            var fn = $parse( attrs.ngHold ),
                isHolding, timeoutId
            
            el.on('mousedown', function($event) {
              isHolding = true;

              timeoutId = $timeout(function() {
                if( isHolding ) {
                  fn( scope, {$event: $event} );
                }
              }, 125);
            });

            el.on('mouseup', function() {
              isHolding = false;

              if(timeoutId) {
                $timeout.cancel(timeoutId);
                timeoutId = null;
              }
            });
          }
        }
  }

  angular.module('statements')
    .directive('ngHold', ngHold);

}());
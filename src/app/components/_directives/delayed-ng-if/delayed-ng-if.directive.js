(function() {
  'use strict';

  /** @ngInject */
  function delayedNgIf($timeout, $compile) {
    return {
        link: function (scope, elem, attr) {
            var delay = attr.delay;
            var key = '_delayedNgIf' + Math.random().toString(36).substring(7);
            scope[key] = undefined;
            var promise;
            scope.$watch(attr.delayedNgIf, function (newValue, oldValue) {
                $timeout.cancel(promise);
                if (!newValue && oldValue)
                    promise = $timeout(function () {
                        scope[key] = false;
                    }, delay);
                else
                    scope[key] = newValue;
            });
            elem.attr('ng-if', key);
            elem.removeAttr('delayed-ng-if');
            $compile(elem)(scope);
        }
    }
  }

  angular.module('statements')
    .directive('delayedNgIf', delayedNgIf);

}());




// angular.module("app", []).directive('delayedIf', delayedIf);

// delayedIf.$inject = ['$timeout', '$compile'];
// function delayedIf($timeout, $compile) {
//     return {
//         link: function (scope, elem, attr) {
//             var delay = attr.delay;
//             var key = '_delayedIf' + Math.random().toString(36).substring(7);
//             scope[key] = undefined;
//             var promise;
//             scope.$watch(attr.delayedIf, function (newValue, oldValue) {
//                 $timeout.cancel(promise);
//                 if (!newValue && oldValue)
//                     promise = $timeout(function () {
//                         scope[key] = false;
//                     }, delay);
//                 else
//                     scope[key] = newValue;
//             });
//             elem.attr('ng-if', key);
//             elem.removeAttr('delayed-if');
//             $compile(elem)(scope);
//         }
//     }
// }
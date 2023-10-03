(function() {
    'use strict';

    angular
        .module('statements')
        .directive('minimap', minimap);

    minimap.$inject = ['$compile'];

    function minimap($compile) {
        return {
            restrict: 'A',
            link: function(scope, element, attrs) {
                const targetElement = angular.element(document.querySelector(attrs.targetSelector));
                const clone = targetElement.clone();

                // Wrap the clone with the minimap content div
                const minimapContent = angular.element('<div class="minimap-content"></div>').append(clone);
                
                element.addClass('minimap-container').append(minimapContent);

                // Compile the cloned content so that AngularJS bindings are kept intact
                $compile(minimapContent)(scope);
            }
        };
    }

})();

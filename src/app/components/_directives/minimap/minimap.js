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

                // Try to capture the content of stmnts-editor-text-renderer and replace it in the cloned version
                const originalStmntsElements = targetElement[0].querySelectorAll('stmnts-editor-text-renderer');
                const clonedStmntsElements = clone[0].querySelectorAll('stmnts-editor-text-renderer');
                
                for (let i = 0; i < originalStmntsElements.length; i++) {
                    const originalContent = angular.element(originalStmntsElements[i]).contents();
                    const clonedContent = originalContent.clone();
                    
                    // Empty the cloned stmnts-editor-text-renderer and append the cloned content
                    angular.element(clonedStmntsElements[i]).empty().append(clonedContent);
                }

                // Wrap the clone with the minimap content div
                const minimapContent = angular.element('<div class="minimap-content"></div>').append(clone);
                element.addClass('minimap-container').append(minimapContent);

                // Compile the cloned content so that AngularJS bindings are kept intact
                $compile(minimapContent)(scope);
            }
        };
    }

})();


(function() {
    'use strict';

    angular
        .module('statements')
        .directive('minimap', minimap);

    minimap.$inject = ['$compile', '$timeout'];

    function minimap($compile, $timeout) {
        return {
            restrict: 'A',
            link: function(scope, element, attrs) {
                $timeout(function() {
                    const targetElement = angular.element(document.querySelector(attrs.targetSelector));
                    const clone = targetElement.clone();

                    // Handle transcluded content
                    const originalStmntsElements = targetElement[0].querySelectorAll('stmnts-editor-text-renderer');
                    const clonedStmntsElements = clone[0].querySelectorAll('stmnts-editor-text-renderer');

                    for (let i = 0; i < originalStmntsElements.length; i++) {
                        const originalContent = angular.element(originalStmntsElements[i]).contents();
                        const clonedContent = originalContent.clone();
                        angular.element(clonedStmntsElements[i]).empty().append(clonedContent);
                    }

                    // Wrap the clone with the minimap content div
                    const minimapContent = angular.element('<div class="minimap-content"></div>').append(clone);
                    element.addClass('minimap-container').append(minimapContent);

                    // Compile the cloned content to ensure AngularJS bindings are processed
                    $compile(minimapContent)(scope);
                });
            }
        };
    }

})();

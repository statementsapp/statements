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

                    // Get outerHTML of the target element
                    const contentHTML = targetElement[0].outerHTML;

                    // Clear existing content in minimap
                    element.empty();
                    
                    // Create a minimap content container
                    const minimapContent = angular.element('<div class="minimap-content"></div>');

                    // Set its content to be the outerHTML of the target element
                    minimapContent.html(contentHTML);
                    
                    // Append this to the main minimap container
                    element.addClass('minimap-container').append(minimapContent);

                    // Now compile this content with the scope to process Angular directives, bindings, etc.
                    $compile(minimapContent.contents())(scope);
                });
            }
        };
    }

})();

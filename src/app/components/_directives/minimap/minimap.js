(function() {
    'use strict';

    angular
        .module('statements')
        .directive('minimap', minimap);

    minimap.$inject = ['$timeout'];

    function minimap($timeout) {
        return {
            restrict: 'A',
            link: function(scope, element, attrs) {
                $timeout(function() {
                    const targetElement = angular.element(document.querySelector(attrs.targetSelector));

                    // Get outerHTML of the target element
                    const contentHTML = targetElement[0].outerHTML;

                    // Create a minimap content container
                    const minimapContent = angular.element('<div class="minimap-content"></div>');

                    // Set its content to be the outerHTML of the target element
                    minimapContent.html(contentHTML);
                    
                    // Scale down the content
                    minimapContent.css({
                        'transform': 'scale(0.2)',  // scale to 20% of the original size
                        'transform-origin': 'top left'
                    });
                    
                    // Append this to the main minimap container
                    element.addClass('minimap-container').append(minimapContent);
                });
            }
        };
    }

})();

(function() {
    'use strict';

    angular
        .module('statements')
        .directive('minimap', minimap);

    function minimap() {
        return {
            restrict: 'A',
            transclude: true,
            link: function(scope, element, attrs, ctrl, transclude) {
                
                // Use the transclude function to clone and link the content
                transclude(scope, function(clone) {
                    const minimapContent = angular.element('<div class="minimap-content"></div>');

                    // Append cloned content to the minimap container
                    minimapContent.append(clone);
                    
                    // Apply the scaling CSS
                    minimapContent.css({
                        'transform': 'scale(0.2)',
                        'transform-origin': 'top left'
                    });

                    // Append the minimap content to the main minimap container
                    element.addClass('minimap-container').append(minimapContent);
                });
            }
        };
    }

})();

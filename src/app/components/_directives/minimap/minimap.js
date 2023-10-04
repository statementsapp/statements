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
                // Re-render the minimap
                function renderMinimap() {
                    // Begin with an empty minimap content
                    const minimapContent = angular.element('<div class="minimap-content"></div>');
                    const ol = angular.element('<ol class="angular-ui-tree-nodes"></ol>');

                    // Assuming data[0].nodes is an array, reconstruct the list
                    angular.forEach(scope.data[0].nodes, function(node) {
                        const li = angular.element('<li></li>');
                        li.text(node.someProperty);  // replace `someProperty` with whatever represents this node
                        ol.append(li);
                    });

                    minimapContent.append(ol);
                    element.empty().addClass('minimap-container').append(minimapContent);
                    $compile(minimapContent)(scope);
                }

                // Watch for changes and re-render
                scope.$watchCollection("data[0].nodes", function(newVal, oldVal) {
                    if (newVal !== oldVal) {
                        renderMinimap();
                    }
                });
            }
        };
    }
})();

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
                const scaleFactor = 0.2;
                let viewport = null;

                $timeout(function() {
                    const targetElement = angular.element(document.querySelector(attrs.targetSelector));
                    const contentHTML = targetElement[0].outerHTML;

                    element.empty();

                    const minimapContent = angular.element('<div class="minimap-content"></div>');
                    minimapContent.html(contentHTML);
                    minimapContent.css({
                        'transform': `scale(${scaleFactor})`,
                        'transform-origin': 'top left'
                    });

                    element.addClass('minimap-container').append(minimapContent);
                    $compile(minimapContent.contents())(scope);

                    if (!viewport) {
                        viewport = angular.element('<div class="minimap-viewport"></div>');
                        element.append(viewport);
                    }

                    function updateViewport() {
                        // Calculate the size and position of the viewport based on the scroll position
                        const viewHeight = window.innerHeight * scaleFactor;
                        const viewWidth = window.innerWidth * scaleFactor;
                        const scrollTop = targetElement.scrollTop() * scaleFactor;
                        const scrollLeft = targetElement.scrollLeft() * scaleFactor;

                        viewport.css({
                            'height': `${viewHeight}px`,
                            'width': `${viewWidth}px`,
                            'top': `${scrollTop}px`,
                            'left': `${scrollLeft}px`
                        });
                    }

                    targetElement.on('scroll', updateViewport);
                    updateViewport();
                });
            }
        };
    }

})();

( function () {
  'use strict';

  /** @ngInject */
  function videoSrcDirective() {
    return {
      restrict: 'A',
      link: {
        pre: function (scope, elem, attr) {
          var element = elem;
          var sources;
          var poster;
          var canPlay;

          function changeSource() {
            for (var i = 0, l = sources.length; i < l; i++) {
              canPlay = element[0].canPlayType(sources[i].type);
              if (canPlay === 'maybe' || canPlay === 'probably') {
                element.attr('src', sources[i].src);
                element.attr('type', sources[i].type);
                break;
              }
            }

            if (canPlay === '') {
              scope.$emit('onVideoError', { type: 'Can\'t play file ' });
            }
          }

          function changePoster(postersources) {
            element.attr('poster', postersources);
          }

          scope.$watch(attr.videoSrc, function (newValue, oldValue) {
            if (!sources || newValue !== oldValue) {
              sources = newValue.videoSources;

              changePoster(newValue.postersource);
              changeSource();
            }
          });
        }
      }
    };
  }

  angular
    .module('statements')
    .directive('videoSrc', videoSrcDirective);

}() );

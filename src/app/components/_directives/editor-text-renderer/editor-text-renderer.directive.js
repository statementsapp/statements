(function() {
  'use strict';

  /** @ngInject */
  function EditorTextRendererController() {

  }

  /** @ngInject */
  function stmntsEditorTextRenderer() {
    return {
      restrict: 'E',
      scope: true,
      templateUrl: 'app/components/_directives/editor-text-renderer/editor-text-renderer.html',
      controller: EditorTextRendererController,
      controllerAs: 'vm',
      bindToController: true
    };
  }

  angular.module('statements')
    .directive('stmntsEditorTextRenderer', stmntsEditorTextRenderer);

})();

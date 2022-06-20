(function() {
  'use strict';

  /** @ngInject */
  function EditorDialogueRendererController() {
  }

  /** @ngInject */
  function stmntsEditorDialogueRenderer() {
    return {
      restrict: 'E',
      scope: true,
      templateUrl: 'app/components/_directives/editor-dialogue-renderer/editor-dialogue-renderer.html',
      controller: EditorDialogueRendererController,
      controllerAs: 'vm',
      bindToController: true
    };
  }

  angular.module('statements')
    .directive('stmntsEditorDialogueRenderer', stmntsEditorDialogueRenderer);

})();

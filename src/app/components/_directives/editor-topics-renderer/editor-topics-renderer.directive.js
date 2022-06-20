(function() {
  'use strict';

  /** @ngInject */
  function EditorTopicsRendererController() {

  }

  /** @ngInject */
  function stmntsEditorTopicsRenderer() {
    return {
      restrict: 'E',
      scope: true,
      templateUrl: 'app/components/_directives/editor-topics-renderer/editor-topics-renderer.html',
      controller: EditorTopicsRendererController,
      controllerAs: 'vm',
      bindToController: true
    };
  }

  angular.module('statements')
    .directive('stmntsEditorTopicsRenderer', stmntsEditorTopicsRenderer);

})();

(function() {
  'use strict';

  /** @ngInject */
  function EditorOptionsModalController($uibModalInstance, options) {
    var vm = this;
    vm.options = options;

    vm.close = function() {
      $uibModalInstance.close(vm.options);
    };
  }

  angular.module('statements')
    .controller('EditorOptionsModalController', EditorOptionsModalController);

})();

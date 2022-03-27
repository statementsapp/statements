(function() {
  'use strict';

  /** @ngInject */
  function chatBoxDirective() {
    return {
      restrict: 'E',
      template: '<textarea class ="form-control" style="width: 100%; padding: 0; height: 160px; color: black; background-color: rgba(255,255,255,0.5); margin-top: 5px" ng-disable="true" ng-model="messageLog"> </textarea>',
      controller: function($scope, $element) {
        $scope.$watch('messageLog', function() {
          var textArea = $element[0].children[0];
          textArea.scrollTop = textArea.scrollHeight;
        });
      }
    };
  }

  angular
    .module('statements')
    .directive('chatBox', chatBoxDirective);

}());

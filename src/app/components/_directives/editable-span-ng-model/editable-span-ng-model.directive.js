(function() {
  'use strict';

  /** @ngInject */
  function editableSpanNgModel($sce) {
    return {
      restrict: 'A', // only activate on element attribute
      require: '?ngModel', // get a hold of NgModelController
      link: function(scope, element, attrs, ngModel) {
        // if (!ngModel) return; 
        // do nothing if no ng-model

        // Specify how UI should be updated
        ngModel.$render = function() {
          element.html($sce.getTrustedHtml(ngModel.$viewValue || ''));
        };

        // Listen for change events to enable binding
        element.on('keyup change', function() {
          scope.$evalAsync(read);
        });

        element.on('blur', function() {
          scope.$evalAsync(knead);
        });

        read(); // initialize
        knead(); // initialize

        function read() {
          console.log("The scope: ", scope)
          console.log("The model: ", ngModel)
          console.log("The element: ", element)
          var html = element.html();
          // When we clear the content editable the browser leaves a <br> behind
          // If strip-br attribute is provided then we strip this out
          if (attrs.stripBr && html === '<br>') {
            console.log("If triggered in editable span ng model")
            html = '';
          }
          ngModel.$setViewValue(html);
        }

        // Write data to the model
        function knead() {
   
          console.log("The element html: ", element.html)
          var html = element.html();
          console.log("rootscope editing", $rootScope.editing)
          console.log("scope editing", $scope.editing)
          // When we clear the content editable the browser leaves a <br> behind
          // If strip-br attribute is provided then we strip this out
          if (attrs.stripBr && html === '<br>') {
            console.log("If triggered in editable span ng model")
            html = '';
          }
          ngModel.$setViewValue(html);
        }
      }
    };
  }

  angular.module('statements')
    .directive('editableSpanNgModel', editableSpanNgModel);

}());

(function () {
  'use strict';

  /** @ngInject */
  function ExportModalController ($rootScope,
                                  IdFactory,
                                  $uibModalInstance,
                                  profileService,
                                  libraryService,
                                  apiService,
                                  BookFactory,
                                  $timeout,
                                  $scope) {
    var vm = this;

    vm.title = '';
    vm.processing = false;
    $scope.enter = '<enter>'
    // $('#addbookmodal').modal({backdrop: 'static', keyboard: false})  

    $timeout(function() {
      document.getElementById('title').focus();
    });

    vm.addEmail = function() {
        if ($scope.form.email.$valid) {
            apiService.saveEmail(vm.email).then(function(response) {
              console.log("Success")
                // Handle success
            }, function(error) {
              console.log("Failure")
                // Handle error
            });
        } else {
            // Handle email validation error
        }
    };

    vm.cancel = function () {
      $uibModalInstance.close(false);
    };
  }

  angular.module('statements')
    .controller('ExportModalController', ExportModalController);

})();

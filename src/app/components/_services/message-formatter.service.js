(function() {
  'use strict';

  /** @ngInject */
  function messageFormatter(date, nick, message) {
    return date.toLocaleTimeString() + ' - ' +
      nick + ' - ' +
      message + '\n';
  }

  angular.module('statements')
    .value('messageFormatter', messageFormatter);

})();

(function () {
  'use strict';

  /** @ngInject */
  function chatSocket(socketFactory) {

    var socket = socketFactory();

    //add strings to the arguments array for each server emission
    socket.forward([
      'broadcast',
      'broadcastProposition',
      'broadcastDeletion',
      'broadcastUpdate',
      'broadcastNodeUpdate',
      'broadcastNameAssignment',
      'userUpdated',
      'roomUsers',
      'getUsers',
      'room',
      'leave'
    ]);

    return socket;
  }

  angular.module('statements')
    .factory('chatSocket', chatSocket);

})();

(function() {
  'use strict';

  /** @ngInject */
  function reconnectOnMouseMove() {
    return {
            restrict: 'A',
            link: function(scope, element, attrs) {
                var socket = null;
                var reconnectDelay = parseInt(attrs.reconnectDelay) || 1000;

                function connect() {
                    if (socket) {
                        socket.disconnect();
                    }
                    socket = io.connect();
                    socket.on('connect', function() {
                        console.log('Connected to Socket.IO server');
                    });
                    socket.on('disconnect', function() {
                        console.log('Disconnected from Socket.IO server');
                    });
                }

                element.on('mousemove', function() {
                    if (socket && !socket.connected) {
                        setTimeout(connect, reconnectDelay);
                    }
                });

                connect();
            }
        };
    }



  }

  angular.module('statements')
    .directive('reconnectOnMouseMove', reconnectOnMouseMove);

})();
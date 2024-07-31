// 'use strict';

// var ioRoutes = function(io) {
//   var userCount = 0;

//   io.on('connection', function(socket) {
//     socket.broadcast.emit('user connected');

//     io.sockets.emit('A user just connected');

//     userCount++;

//     socket.on('message', function(from, msg) {
//       io.sockets.emit('broadcast', {
//         payload: msg,
//         source: from
//       });
//     });

//     socket.on('connect', () => {
//         console.log('Connected to the server');
//       });



//       socket.on('reconnect', () => {
//         console.log('Reconnected to the server');
//       });

//       socket.on('reconnect_attempt', () => {
//         console.log('Attempting to reconnect');
//       });

//       socket.on('reconnect_failed', () => {
//         console.log('Reconnection failed');
//       });

//     socket.on('disconnect', function() {
//       console.log('Socket disconnected');
//     });
    
//     socket.on('proposition', function(from, obj) { //for first emission
//       io.sockets.emit('broadcastProposition', obj);
//     });

//     socket.on('deletion', function(from, obj) { //for first emission
//       io.sockets.emit('broadcastDeletion', obj);
//     });

//     socket.on('update', function(from, obj) { //for first emission
//       io.sockets.emit('broadcastUpdate', obj);
//     });    

//     socket.on('nodeUpdate', function(from, obj) { //for first emission
//       io.sockets.emit('broadcastNodeUpdate', obj);
//     });

//   });

//   // code for indefinite reconnect attempts
//   io.connect().on("reconnecting", function(delay, attempt) {
//     console.log("Reconnecting")
//     // if (attempt === max_socket_reconnects) {
//     //   setTimeout(function(){ socket.socket.reconnect(); }, 5000);
//     //   return console.log("Failed to reconnect. Lets try that again in 5 seconds.");
//     // }
//   });


// };

// module.exports = ioRoutes;


'use strict';
var ioRoutes = function(io) {
  var userCount = 0;

  // Configure Socket.IO client options
  io.reconnection(true);
  io.reconnectionAttempts(Infinity);
  io.reconnectionDelay(1000);
  io.reconnectionDelayMax(5000);
  io.timeout(10000);

  io.on('connection', function(socket) {
    console.log('A user connected');
    socket.broadcast.emit('user connected');
    io.sockets.emit('A user just connected');
    userCount++;

    socket.on('message', function(from, msg) {
      io.sockets.emit('broadcast', {
        payload: msg,
        source: from
      });
    });

    socket.on('connect', () => {
      console.log('Connected to the server');
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('Reconnected to the server after ' + attemptNumber + ' attempts');
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('Attempting to reconnect: attempt ' + attemptNumber);
    });

    socket.on('reconnect_error', (error) => {
      console.log('Reconnection error: ', error);
    });

    socket.on('reconnect_failed', () => {
      console.log('Reconnection failed');
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected. Reason: ' + reason);
      if (reason === 'io server disconnect') {
        // Reconnect manually if the server disconnected
        socket.connect();
      }
    });

    socket.on('error', (error) => {
      console.log('Socket error: ', error);
    });
    
    socket.on('proposition', function(from, obj) {
      io.sockets.emit('broadcastProposition', obj);
    });

    socket.on('deletion', function(from, obj) {
      io.sockets.emit('broadcastDeletion', obj);
    });

    socket.on('update', function(from, obj) {
      io.sockets.emit('broadcastUpdate', obj);
    });    

    socket.on('nodeUpdate', function(from, obj) {
      io.sockets.emit('broadcastNodeUpdate', obj);
    });
  });

  // Handle reconnection attempts
  io.on('reconnect_attempt', (attemptNumber) => {
    console.log('Attempting to reconnect: attempt ' + attemptNumber);
  });
};

module.exports = ioRoutes;


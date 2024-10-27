'use strict';
var ioRoutes = function(io) {
  var userCount = 0;

  // Configure Socket.IO client options
  io.reconnection(true);
  io.reconnectionAttempts(Infinity);
  io.reconnectionDelay(1000);
  io.reconnectionDelayMax(5000);
  io.timeout(0); // Set timeout to 0 to disable it

  io.on('connection', function(socket) {
    console.log('A user connected');
    socket.broadcast.emit('user connected');
    io.sockets.emit('A user just connected');
    userCount++;

    // Implement heartbeat mechanism
    const heartbeatInterval = setInterval(() => {
      socket.emit('heartbeat');
    }, 25000); // Send heartbeat every 25 seconds

    socket.on('heartbeat', () => {
      // Respond to heartbeat
      socket.emit('heartbeat-response');
    });

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
      clearInterval(heartbeatInterval); // Clear the heartbeat interval on disconnect
      if (reason === 'io server disconnect') {
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


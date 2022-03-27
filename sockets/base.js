'use strict';

var ioRoutes = function(io) {
  var userCount = 0;
  io.on('connection', function(socket) {
    socket.broadcast.emit('user connected');

    io.sockets.emit('A user just connected');

    userCount++;

    socket.on('message', function(from, msg) {
      io.sockets.emit('broadcast', {
        payload: msg,
        source: from
      });
    });

    socket.on('proposition', function(from, obj) { //for first emission
      io.sockets.emit('broadcastProposition', obj);
    });

    socket.on('deletion', function(from, obj) { //for first emission
      io.sockets.emit('broadcastDeletion', obj);
    });

    socket.on('update', function(from, obj) { //for first emission
      io.sockets.emit('broadcastUpdate', obj);
    });    

    socket.on('nodeUpdate', function(from, obj) { //for first emission
      io.sockets.emit('broadcastNodeUpdate', obj);
    });

  });
};

module.exports = ioRoutes;


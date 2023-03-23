'use strict';

/**
 * A socket service.
 */
var socketService = function (io) {

  var users = {};

  var debug = (event, socket) => {
    console.log(event + ' event triggered');
    console.log(`Socket server: ${Object.keys(users).length} connected.`);
    console.table(users);
    console.log(`Rooms:`);
    console.table(socket.adapter.rooms);
  };

  /**
   * Gets the display names of users in the specified book id room.
   * @param bookId the book id, used as the room id.
   * @returns the list of users in the room.
   */
  var getRoomUsers = (bookId) => {
    var connected = [];
    var rooms = io.sockets.adapter.rooms;
    if (rooms.hasOwnProperty(bookId)) {
      for (var id in rooms[bookId].sockets) {
        var user = users[id];
        if (user) {
          var displayName = user.displayName !== ' ' ? user.displayName : '(unnamed user)';
          connected.push(displayName);
        }
      }
    }
    return connected;
  };

  io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
      });
    });

  // 'reconnection': true,
  // 'reconnectionDelay': 500,
  // 'reconnectionAttempts': 10

  io.on('connection', function (socket) {

    /**
     * Socket for when a user's information is updated.
     */

    socket.on('disconnect', function() {
      console.log('Socket disconnected');
    });

    socket.on('userUpdated', function (data) {
      var emitUpdate = false;

      if (!users[socket.id]) {
        users[socket.id] = {displayName: data.displayName};
        emitUpdate = true;
      } else {
        if (data.displayName && data.displayName !== users[socket.id].displayName) {
          users[socket.id].displayName = data.displayName;
        }
      }

      if (emitUpdate) {
        io.in(data.bookId).emit('roomUsers', getRoomUsers(data.bookId));
        debug('userUpdated', socket);
      }
    });

    /**
     * Socket for when a user leaves a room.
     */
    socket.on('leave', function (bookId) {
      socket.leave(bookId);
      socket.to(bookId).emit('roomUsers', getRoomUsers(bookId));
    });

    socket.on('getUsers', function (bookId) {
      socket.to(bookId).emit('roomUsers', getRoomUsers(bookId));
    });

    /**
     * Socket for when a user enters a room.
     */
    socket.on('room', function (bookId) {
      socket.join(bookId);

      io.in(bookId).emit('roomUsers', getRoomUsers(bookId));

      debug('room', socket);

      socket.on('disconnect', function () {
        console.log("JUST DISCONNECTED")
        io.sockets.in(bookId).emit('roomUsers', getRoomUsers(bookId));
      });
    });

    /**
     * Socket for when a user disconnects form the service.
     */
    socket.on('disconnect', () => {
      if (users.hasOwnProperty(socket.id)) {
        console.log("JUST DISCONNECTED II")
        // delete users[socket.id];
      }
      debug('disconnect', socket);
    });

    /**
     * Socket for when a proposition is emitted.
     */
    socket.on('proposition', function (from, obj, bookId) {
      io.to(bookId).emit('broadcastProposition', obj);
    });

    /**
     * Socket for when a deletion is emitted.
     */
    socket.on('deletion', function (from, obj, bookId) {
      io.to(bookId).emit('broadcastDeletion', obj);
    });

    /**
     * Socket for when an update is emitted.
     */
    socket.on('update', function (from, obj, bookId) {
      io.to(bookId).emit('broadcastUpdate', obj);
    });    


    socket.on('nodeUpdate', function (from, obj, bookId) {
      io.to(bookId).emit('broadcastNodeUpdate', obj);
    });

  });
};

module.exports = socketService;

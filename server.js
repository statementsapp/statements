#!/usr/env/bin node
'use strict';

require('dotenv').config();
//

// define globals =====================================
const express    = require('express'),
      morgan     = require('morgan'),
      path       = require('path'),
      bodyParser = require('body-parser'),
      admin      = require('./server/firebase-admin'),
      http       = require('http'),
      app        = module.exports = express(),
      server     = http.createServer(app),
      io         = require('socket.io').listen(server);



const distDir = path.resolve(__dirname, './dist/');

const port = process.env.PORT || 3000;

// set up our socket server
require('./sockets/index')(io);

// middleware =========================================
app.use(morgan('dev'));
app.use(bodyParser.json({
  verify: (req, res, buf) => {
    req.rawBody = buf
  }
}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(distDir));

// application ========================================

// Set up router
var router = require('./server/routes')(admin, express);
app.use('/', router);

server.listen(port, function() {
  console.log('listening on port', port);
});

process.on('SIGTERM', gracefullyExit);           // Explicitly close server on kill
process.on('uncaughtException', gracefullyExit); // Explicitly close server on crash

function gracefullyExit() { server.close(); }

module.exports = function (admin, express) {
  'use strict';

  var router = express.Router();
  var moment = require('moment');
  var paymentEvents = require('./payments/events')
  var checkout = require('./payments/checkout')
  var billing = require('./payments/billing-portal')
  var firebaseMiddleware = require('express-firebase-middleware');

  router.get('/ping', function (req, res, next) {
    return res.send('pong');
  });

  var db = admin.database();

  function errorHandler(err, req, res, next) {
    console.error(err.message);
    res.status(500).end(err.message);
  }

  router.use(errorHandler);
  router.use(function (req, res, next) {
    next();
  });

  router.get('/config', function (req, res, next) {
    return res.status(200).send({
      socketPort: process.env.SOCKET_PORT,
      socketUrl: process.env.SOCKET_URL,
    });
  });

  router.get('/library/props/:uid', function (req, res, next) {
    var bookId = req.params.uid;
    db.ref('propositions/' + bookId).once('value').then(function (snap) {
      var result = (snap.val() === null) ? [] : snap.val();
      return res.end(JSON.stringify(result));
    }).catch(function (error) {
      next(error);
    });
  });

  router.get('/library/book/:uid', function (req, res, next) {
    db.ref('books/' + req.params.uid).once('value').then(function (snap) {
      res.end(JSON.stringify(snap.val()));
    }).catch(function (error) {
      next(error);
    });
  });

  router.get('/library', function (req, res, next) {
    db.ref('books').once('value').then(function (snap) {
      if (snap.val() === null) {
        return res.end();
      } else {
        return res.end(JSON.stringify(snap.val()));
      }
    }).catch(function (error) {
      return next(error);
    });
  });

  router.use('/payment-events', paymentEvents);
  router.use('/', firebaseMiddleware.auth);

// payments ================================================================
  router.use('/checkout', checkout);
  router.use('/billing', billing);

// user =====================================================================

  router.get('/user/:uid/profile', function (req, res, next) {
    var uid = req.params.uid;
    db.ref('users/' + uid).once('value').then(function (snap) {
      res.end(JSON.stringify(snap.val()));
    }).catch(function (error) {
      next(error);
    });
  });

  router.post('/user/:uid/profile', function (req, res, next) {
    var uid = req.params.uid;

    var u = 'users/' + uid;

    var p = req.body;
    var displayName = (p.hasOwnProperty('displayName')) ? p.displayName : null;
    var firstName = (p.hasOwnProperty('firstName')) ? p.firstName : null;
    var lastName = (p.hasOwnProperty('lastName')) ? p.lastName : null;
    var emailAddress = (p.hasOwnProperty('email')) ? p.email : null;
    var lastEditedBook = (p.hasOwnProperty('lastEditedBook')) ? p.lastEditedBook : null;
    var books = (p.hasOwnProperty('books')) ? p.books : null;
    var negations = (p.hasOwnProperty('negations')) ? p.negations : null;

    var updates = {};
    updates[u + '/displayName'] = displayName;
    updates[u + '/lastEditedBook'] = lastEditedBook;
    updates[u + '/lastModified'] = moment().unix();
    updates[u + '/firstName'] = firstName;
    updates[u + '/lastName'] = lastName;
    updates[u + '/emailAddress'] = emailAddress;
    updates[u + '/books'] = books;
    updates[u + '/negations'] = negations;

    db.ref().update(updates).then(function () {
      db.ref(u).once('value').then(function (snap) {
        return res.end(JSON.stringify(snap.val()));
      }).catch(function (error) {
        next(error);
      });

    }).catch(function (error) {
      next(error);
    });
  });

// books ====================================================================

  router.post('/library/book', function (req, res, next) {
    var newKey = db.ref().child('books').push().key;
    db.ref('books/' + newKey).set(req.body.book).then(function () {
      res.status(201).end(newKey);
    }).catch(function (error) {
      next(error);
    });
  });

  router.post('/library/book/:uid/update', function (req, res, next) {
    var bookId = req.params.uid;
    var book = Object.assign({}, req.body.book);
    var now = moment().unix();

    book.lastModified = now;

    db.ref('books/' + bookId).set(book).then(function () {
      db.ref('books/' + bookId).once('value').then(function (snap) {
        res.end(JSON.stringify(snap.val()));
      }).catch(function (error) {
        next(error);
      });

    }).catch(function (error) {
      next(error);
    });
  });

  router.delete('/library/book/:id', function (req, res, next) {
    var bookId = req.params.id;
    var bookRef = db.ref('books/' + bookId);
    bookRef.remove().then(function () {
      return res.end();
    }).catch(function (error) {
      next(error);
    });
  });

  // propositions ============================================================

  router.post('/library/props/:uid', function (req, res, next) {
    var bookId = req.params.uid;
    var propositions = Object.assign({}, req.body.propositions);

    db.ref('propositions/' + bookId).set(propositions).then(function () {
      db.ref('propositions/' + bookId).once('value').then(function (snap) {
        return res.end(JSON.stringify(snap.val()));
      }).catch(function (error) {
        next(error);
      });
    }).catch(function (error) {
      next(error);
    });
  });

  return router;
};


const config = require('../config');
const stripe = require('stripe')(config.stripeApiKey);
const express = require('express');
const { getStripeIdForUser, updateUserWithStripeId } = require('../db');
const router = express.Router();

router.post('/', (req, res, next) => {
  const user = res.locals.user;
  const uid = user.uid;
  if (uid === undefined) {
    return res.status(401).end();
  }

  return getStripeIdForUser(uid)
  .then(stripeId => {
    if (stripeId === null) {
      console.log('user is not a stripe customer, adding');
      return stripe.customers.create({
        email: user.email, // do we want this? maybe the customer wants to user a different email for stripe?
      })
      .then(customer => {
        updateUserWithStripeId(uid, customer.id);
        return customer.id;
      })
    } else {
      return Promise.resolve(stripeId)
    }
  })
  .then(stripeId => {
    return stripe.billingPortal.sessions.create({
      customer: stripeId,
      return_url: req.body.returnUrl || config.domain,
    })
  })
  .then(session => res.json({redirectUrl: session.url}))
  .catch(e => next(e));

});

module.exports = router

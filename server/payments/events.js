const express = require('express');
const config = require('../config');
const { updateUserWithPremium, updateUserRemovePremium } = require('../db');
const router = express.Router();
var db = require('../firebase-admin').database();
var stripe = require('stripe')(config.stripeApiKey)

// note: right now is it not neccessary to do anything on this event
// because buying premium also triggers a customer.subscription.updated event
const checkoutSessionCompleted = (event) => {
  console.log('checkout.session.completed') 
}

// currently these events update the users/{uid}/premium value, 
// but subscription info is already available in stripe directly. 
// so you probably don't have to listen to these unless you want to take some other action 
const customerSubscriptionUpdated = (event) => {
  console.log('customer.subscription.updated', event.data.object.customer) 
  if (event.data.object.status === 'active') {
    updateUserWithPremium(event.data.object.customer)
  }  
}

const customerSubscriptionDeleted = (event) => {
  console.log('customer.subscription.deleted', event.data.object.customer)
  if (event.data.status !== 'active') {
    updateUserRemovePremium(event.data.object.customer)
  }  
}

const relevantStripeEvents = [
  {
    name: 'checkout.session.completed',
    action: checkoutSessionCompleted
  },
  {
    name: 'customer.subscription.updated',
    action: customerSubscriptionUpdated
  },
  {
    name: 'customer.subscription.deleted',
    action: customerSubscriptionDeleted
  }
]

router.post('/', (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  let event; 

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, config.stripeEventSecret);
  }
  catch (err) {
    console.error(err)
    return res.status(400).send(`Webhook Error: ${err.message}`);
  } 
  
  const relevant = relevantStripeEvents.find(e => e.name === req.body.type)
  if (relevant) {
    relevant.action(event);    
  }
  res.sendStatus(200)
})

module.exports = router;

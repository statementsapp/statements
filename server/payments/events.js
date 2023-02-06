const express = require('express');
const config = require('../config');
const router = express.Router();
var db = require('../firebase-admin').database();
var stripe = require('stripe')(config.stripeApiKey)

const relevantEvents = [
  {
    name: 'checkout.session.completed',
    action: () => console.log('checkout.session.completed') 
  },
  {
    name: 'customer.subscription.updated',
    action: () => console.log('customer.subscription.updated') 
  },
  {
    name: 'customer.subscription.deleted',
    action: () => console.log('customer.subscription.deleted') 
  }
]

router.post('/', (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  let event; 

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, config.stripeEventSecret);
  }
  catch (err) {
    console.log(err)
    return res.status(400).send(`Webhook Error: ${err.message}`);
  } 
  
  const relevant = relevantEvents.find(e => e.name === req.body.type)
  if (relevant) {
    relevant.action();    
  }
  res.sendStatus(200)
})

module.exports = router;

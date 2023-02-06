
const config = require('../config');
const stripe = require('stripe')(config.stripeApiKey);
const express = require('express');
const router = express.Router();

router.post('/', async (req, res, next) => {
  console.log('HERE');
  console.log(req.body);
  // todo: how to associate with the current customer id? is there a link between fb and stripe?
  // what if customer is not logged in
  const priceID = req.body.priceId || 'price_1MXZhMLez0mhDDxo9oTIdCpw'
  console.log(config.domain);
  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price: priceID,
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: req.body.successUrl,
    cancel_url: req.body.cancelUrl,
  });
  res.json({checkoutUrl: session.url});
});

module.exports = router
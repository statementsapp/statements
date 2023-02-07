module.exports = {
  stripeEventSecret: process.env.STRIPE_EVENT_SECRET || '',
  stripeApiKey: process.env.STRIPE_API_KEY || '',
  domain: process.env.DOMAIN || ('http://localhost:' + (process.env.PORT || '3000')),
  premiumPriceId: process.env.PREMIUM_PRICE_ID || ''
}

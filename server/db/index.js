const db = require('../firebase-admin').database();

const getStripeIdForUser = (uid) => {
  return new Promise((resolve, reject) => {
    db.ref(`/users/${uid}/stripeId`).once('value', data => resolve(data.val()), err => reject(err))
  })
};

const getUser = (uid) => {
  return new Promise((resolve, reject) => {
    db.ref(`/users/${uid}`).once('value', data => resolve(data.val()), err => reject(err))
  });
}

const updateUserWithStripeId = (uid, stripeId) => {
    db.ref(`/users/${uid}/stripeId`).set(stripeId)
}

const updateUserWithPremium = (stripeId) => {
  const users = db.ref(`users`);
  users.orderByChild('stripeId').equalTo(stripeId).limitToFirst(1).once('value', data => {
    const uid = Object.keys(data.val())[0]; 
    db.ref(`/users/${uid}/premium`).set(true)
  });
}

const updateUserRemovePremium = (stripeId) => {
  const users = db.ref(`users`);
users.orderByChild('stripeId').equalTo(stripeId).limitToFirst(1).once('value', data => {
    const uid = Object.keys(data.val())[0]; 
    db.ref(`/users/${uid}/premium`).set(false)
  });
}

module.exports = {
  getStripeIdForUser,
  getUser,
  updateUserWithStripeId,
  updateUserWithPremium,
  updateUserRemovePremium
}

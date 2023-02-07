'use strict';

var admin = require('firebase-admin');
var serviceAccount = require("./statements-local-firebase-adminsdk.json");

admin.initializeApp({
  credential: admin.credential.cert({
    'type': process.env.FIREBASE_SVC_TYPE,
    'project_id': process.env.FIREBASE_SVC_PROJECT_ID,
    'private_key_id': process.env.FIREBASE_SVC_PRIVATE_KEY_ID,
    'private_key': process.env.FIREBASE_SVC_PRIVATE_KEY.replace(/\\n/g, '\n'),
    'client_email': process.env.FIREBASE_SVC_CLIENT_EMAIL,
    'client_id': process.env.FIREBASE_SVC_CLIENT_ID,
    'auth_uri': process.env.FIREBASE_SVC_AUTH_URI,
    'token_uri': process.env.FIREBASE_SVC_TOKEN_URI,
    'auth_provider_x509_cert_url': process.env.FIREBASE_SVC_AUTH_PROVIDER_X509_CERT_URL,
    'client_x509_cert_url': process.env.PROCESS_SVC_CLIENT_X509_CERT_URL
  }),

  databaseURL: process.env.FIREBASE_DATABASE_URL
});

module.exports = admin;

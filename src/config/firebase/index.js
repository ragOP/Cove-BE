const admin = require('firebase-admin');
require('dotenv').config();

const serviceAccount = require('./serviceAccountKey.js');

let firebaseApp = null;

try {
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error);
}

const getFirebaseApp = () => {
  return firebaseApp;
};

const getMessaging = () => {
  if (!firebaseApp) {
    throw new Error('Firebase Admin SDK not initialized');
  }
  return admin.messaging(firebaseApp);
};

module.exports = {
  getFirebaseApp,
  getMessaging,
  admin,
}; 
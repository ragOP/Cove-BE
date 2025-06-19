const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin SDK
// You can either use a service account key file or environment variables
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  // If service account key is provided as environment variable (JSON string)
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
} else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  // If service account key file path is provided
  serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
} else {
  // Default fallback - you should set one of the above environment variables
  console.warn('Firebase service account not configured. Push notifications will not work.');
  serviceAccount = null;
}

// Initialize the app only if service account is available
let firebaseApp = null;

if (serviceAccount) {
  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
  }
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
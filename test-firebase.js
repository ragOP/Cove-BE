require('dotenv').config();
const { getMessaging } = require('./src/config/firebase');
const { sendPushNotification } = require('./src/services/pushNotification');

async function testFirebaseIntegration() {
  try {
    console.log('Testing Firebase integration...');

    const messaging = getMessaging();
    console.log('✅ Firebase Admin SDK initialized successfully');

    const testUserId = 'YOUR_TEST_USER_ID';
    const testNotification = {
      title: 'Test Notification',
      body: 'This is a test notification from Firebase',
    };

    const testData = {
      type: 'test',
      message: 'Hello from Firebase!',
    };

    console.log('Sending test push notification...');
    const result = await sendPushNotification(testUserId, testNotification, testData);

    if (result.success) {
      console.log('✅ Push notification sent successfully:', result.messageId);
    } else {
      console.log('❌ Failed to send push notification:', result.message);
    }
  } catch (error) {
    console.error('❌ Firebase integration test failed:', error.message);

    if (error.message.includes('Firebase Admin SDK not initialized')) {
      console.log('\n🔧 To fix this issue:');
      console.log('1. Set FIREBASE_SERVICE_ACCOUNT_KEY in your .env file');
      console.log(
        '2. Or set FIREBASE_SERVICE_ACCOUNT_PATH to point to your service account JSON file'
      );
      console.log('3. Make sure your Firebase project is properly configured');
    }
  }
}

if (require.main === module) {
  testFirebaseIntegration();
}

module.exports = { testFirebaseIntegration };

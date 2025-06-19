# Firebase Push Notifications Setup

This guide will help you set up Firebase Cloud Messaging (FCM) for push notifications in the Cove-BE application.

## Prerequisites

1. A Firebase project
2. Firebase Admin SDK service account key
3. Node.js application with the required dependencies

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or select an existing project
3. Follow the setup wizard to create your project

## Step 2: Generate Service Account Key

1. In your Firebase project, go to **Project Settings** (gear icon)
2. Navigate to the **Service accounts** tab
3. Click **Generate new private key**
4. Download the JSON file (this is your service account key)
5. **Keep this file secure and never commit it to version control**

## Step 3: Configure Environment Variables

Add the following environment variables to your `.env` file:

```env
# Option 1: Use service account key as JSON string (recommended for production)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project-id",...}

# Option 2: Use service account key file path (for development)
FIREBASE_SERVICE_ACCOUNT_PATH=./path/to/your/serviceAccountKey.json
```

### Option 1: JSON String (Recommended for Production)

1. Open the downloaded service account JSON file
2. Copy the entire content
3. Paste it as a single line in your `.env` file:
   ```env
   FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project-id","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
   ```

### Option 2: File Path (For Development)

1. Place the service account JSON file in your project directory
2. Add the path to your `.env` file:
   ```env
   FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase/serviceAccountKey.json
   ```

## Step 4: Install Dependencies

The Firebase Admin SDK is already included in the project. If you need to install it manually:

```bash
npm install firebase-admin
```

## Step 5: Client-Side Setup

### For React Native (Expo)

1. Install the required packages:
   ```bash
   expo install expo-notifications
   expo install expo-device
   ```

2. Configure notifications in your app:

```javascript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Request permissions
async function registerForPushNotificationsAsync() {
  let token;

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    
    token = (await Notifications.getExpoPushTokenAsync()).data;
  } else {
    alert('Must use physical device for Push Notifications');
  }

  return token;
}

// Send token to your backend
async function sendTokenToBackend(token) {
  try {
    const response = await fetch('YOUR_API_URL/api/user/update-fcm-token', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        FCMToken: token,
      }),
    });
    
    const result = await response.json();
    console.log('FCM token updated:', result);
  } catch (error) {
    console.error('Error updating FCM token:', error);
  }
}
```

### For React Native (Bare)

1. Install the required packages:
   ```bash
   npm install @react-native-firebase/app @react-native-firebase/messaging
   ```

2. Configure notifications:

```javascript
import messaging from '@react-native-firebase/messaging';

async function requestUserPermission() {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    console.log('Authorization status:', authStatus);
  }
}

async function getFCMToken() {
  const fcmToken = await messaging().getToken();
  if (fcmToken) {
    console.log('FCM Token:', fcmToken);
    // Send this token to your backend
    await sendTokenToBackend(fcmToken);
  }
}

// Handle token refresh
messaging().onTokenRefresh(token => {
  sendTokenToBackend(token);
});
```

## Step 6: Testing Push Notifications

### Test with cURL

You can test push notifications using cURL:

```bash
curl -X POST \
  https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=YOUR_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "USER_FCM_TOKEN",
    "notification": {
      "title": "Test Notification",
      "body": "This is a test notification"
    },
    "data": {
      "type": "test",
      "message": "Hello from Firebase!"
    }
  }'
```

### Test from Your Application

1. Send a message to a user who is offline
2. Check the server logs for push notification attempts
3. Verify the notification appears on the recipient's device

## Step 7: Troubleshooting

### Common Issues

1. **"Firebase Admin SDK not initialized"**
   - Check your service account configuration
   - Verify environment variables are set correctly

2. **"Invalid registration token"**
   - The FCM token might be expired or invalid
   - The system automatically removes invalid tokens

3. **Notifications not appearing**
   - Check device permissions
   - Verify the app is not in the foreground (some devices suppress notifications)
   - Check notification settings in device settings

### Debug Logs

The application logs push notification attempts. Check your server logs for:
- Successful push notification sends
- Failed push notification attempts
- Invalid token removals

## Step 8: Production Considerations

1. **Security**: Never commit service account keys to version control
2. **Rate Limiting**: Firebase has rate limits for push notifications
3. **Token Management**: Implement proper token refresh and cleanup
4. **Error Handling**: Handle various Firebase error codes appropriately
5. **Monitoring**: Monitor push notification delivery rates and failures

## API Endpoints

### Update FCM Token
```
PATCH /api/user/update-fcm-token
Authorization: Bearer <token>
Content-Type: application/json

{
  "FCMToken": "your_fcm_token_here"
}
```

## Notification Types

The system supports different notification types:

1. **New Message**: Sent when a user receives a message while offline
2. **Friend Request**: Sent when someone sends a friend request
3. **Message Read**: Sent when someone reads your message (optional)

## Configuration Options

You can customize notification behavior by modifying the `src/services/pushNotification/index.js` file:

- Notification titles and bodies
- Sound and vibration settings
- Android and iOS specific configurations
- Data payload structure 
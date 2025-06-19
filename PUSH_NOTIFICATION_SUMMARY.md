# Firebase Push Notification Integration Summary

## Overview
Successfully integrated Firebase Cloud Messaging (FCM) for push notifications in the Cove-BE application. The system now sends push notifications to users who are not connected to the socket when they receive messages or friend requests.

## What Was Implemented

### 1. Firebase Configuration (`src/config/firebase/index.js`)
- Firebase Admin SDK initialization
- Support for both JSON string and file path configuration
- Environment variable-based configuration
- Error handling for missing credentials

### 2. Push Notification Service (`src/services/pushNotification/index.js`)
- **sendPushNotification**: Core function to send notifications to specific users
- **sendMessageNotification**: Specialized for new message notifications
- **sendFriendRequestNotification**: For friend request notifications
- **sendFriendRequestAcceptanceNotification**: For friend request acceptance
- **sendReadReceiptNotification**: For message read receipts (optional)

### 3. Enhanced Socket Utility (`src/utils/socket/index.js`)
- Modified `emitNewMessage` to check if users are online
- Automatic push notification sending for offline users
- Improved online/offline status checking

### 4. Updated User Services (`src/services/users/index.js`)
- Enhanced `sendMessageService` with friend request notifications
- Enhanced `acceptFriendRequest` with acceptance notifications
- New `updateFCMToken` service for token management

### 5. New API Endpoints
- `PATCH /api/user/update-fcm-token` - Update user's FCM token

### 6. Enhanced User Model
- Already had `FCMToken` field in the user model
- Automatic token cleanup for invalid tokens

## Notification Types Supported

### 1. New Message Notifications
- **Trigger**: When a user receives a message while offline
- **Content**: Customized based on message type (text, image, video, audio, document)
- **Data**: Includes message ID, chat ID, sender info, and message type

### 2. Friend Request Notifications
- **Trigger**: When someone sends a friend request
- **Content**: "Someone sent you a friend request"
- **Data**: Includes sender information

### 3. Friend Request Acceptance Notifications
- **Trigger**: When someone accepts a friend request
- **Content**: "Someone accepted your friend request"
- **Data**: Includes accepter information

## Key Features

### 1. Smart Notification Logic
- Only sends push notifications when users are offline
- Falls back to socket emissions when users are online
- Handles both scenarios seamlessly

### 2. Error Handling
- Automatic cleanup of invalid FCM tokens
- Graceful handling of Firebase errors
- Comprehensive logging for debugging

### 3. Platform Support
- Android-specific configurations (channel ID, priority, sound, vibration)
- iOS-specific configurations (sound, badge)
- Cross-platform data payload

### 4. Message Type Customization
- Different notification content for different message types
- Text truncation for long messages
- Appropriate icons and sounds

## Configuration Options

### Environment Variables
```env
# Option 1: JSON string (recommended for production)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Option 2: File path (for development)
FIREBASE_SERVICE_ACCOUNT_PATH=./path/to/serviceAccountKey.json
```

### Notification Customization
- Modify `src/services/pushNotification/index.js` for custom notification content
- Adjust Android/iOS specific settings
- Customize data payload structure

## Testing

### Test Script
- Created `test-firebase.js` for integration testing
- Run with: `node test-firebase.js`

### Manual Testing
1. Send message to offline user
2. Check server logs for push notification attempts
3. Verify notification appears on recipient device

## Security Considerations

1. **Service Account Security**: Never commit service account keys to version control
2. **Token Management**: Automatic cleanup of invalid tokens
3. **Error Handling**: Proper error handling without exposing sensitive information
4. **Rate Limiting**: Firebase handles rate limiting automatically

## Performance Optimizations

1. **Conditional Sending**: Only send notifications when necessary
2. **Async Operations**: Non-blocking notification sending
3. **Token Validation**: Automatic cleanup of invalid tokens
4. **Error Recovery**: Graceful handling of Firebase errors

## Monitoring and Debugging

### Log Messages
- Successful push notification sends
- Failed push notification attempts
- Invalid token removals
- Firebase initialization status

### Common Issues and Solutions
1. **"Firebase Admin SDK not initialized"** - Check service account configuration
2. **"Invalid registration token"** - Token automatically cleaned up
3. **Notifications not appearing** - Check device permissions and settings

## Future Enhancements

1. **Notification Preferences**: User-configurable notification settings
2. **Batch Notifications**: Send multiple notifications efficiently
3. **Rich Notifications**: Support for images and actions
4. **Analytics**: Track notification delivery and engagement
5. **Silent Notifications**: Background data updates

## Dependencies Added

- `firebase-admin`: Firebase Admin SDK for server-side operations

## Files Modified/Created

### New Files
- `src/config/firebase/index.js` - Firebase configuration
- `src/services/pushNotification/index.js` - Push notification service
- `FIREBASE_SETUP.md` - Setup documentation
- `test-firebase.js` - Integration test script
- `PUSH_NOTIFICATION_SUMMARY.md` - This summary

### Modified Files
- `src/utils/socket/index.js` - Enhanced with push notifications
- `src/services/users/index.js` - Added notification support
- `src/controllers/users/index.js` - Added FCM token update controller
- `src/routes/users/index.js` - Added FCM token update route
- `src/app.js` - Added Firebase initialization
- `package.json` - Added firebase-admin dependency

## API Documentation

### Update FCM Token
```
PATCH /api/user/update-fcm-token
Authorization: Bearer <token>
Content-Type: application/json

{
  "FCMToken": "your_fcm_token_here"
}
```

## Client-Side Integration

The system is designed to work with:
- React Native (Expo)
- React Native (Bare)
- Web applications
- Any platform that supports FCM

See `FIREBASE_SETUP.md` for detailed client-side setup instructions.

## Conclusion

The Firebase push notification integration is now complete and ready for production use. The system provides:

- Reliable message delivery to offline users
- Rich notification content based on message types
- Automatic error handling and token management
- Comprehensive documentation and testing tools
- Scalable architecture for future enhancements

Users will now receive push notifications for messages and friend requests even when they're not actively using the app, significantly improving the user experience and engagement. 
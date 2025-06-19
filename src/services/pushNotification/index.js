const { getMessaging } = require('../../config/firebase');
const User = require('../../models/userModel');

exports.sendPushNotification = async (userId, notificationData, data = {}) => {
  try {
    const user = await User.findById(userId).select('FCMToken name username');
    
    if (!user || !user.FCMToken) {
      return {
        success: false,
        message: 'User not found or FCM token not available',
        userId,
      };
    }

    const messaging = getMessaging();

    const message = {
      token: user.FCMToken,
      notification: {
        title: notificationData.title || 'New Message',
        body: notificationData.body || 'You have a new message',
        ...notificationData,
      },
      data: {
        ...data,
        userId: userId.toString(),
        timestamp: new Date().toISOString(),
      },
      android: {
        notification: {
          channelId: 'chat-messages',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await messaging.send(message);
    
    console.log(`Push notification sent successfully to user ${userId}:`, response);
    
    return {
      success: true,
      message: 'Push notification sent successfully',
      messageId: response,
      userId,
    };

  } catch (error) {
    console.error(`Failed to send push notification to user ${userId}:`, error);
    
    if (error.code === 'messaging/invalid-registration-token' || 
        error.code === 'messaging/registration-token-not-registered') {
      await User.findByIdAndUpdate(userId, { FCMToken: null });
      console.log(`Removed invalid FCM token for user ${userId}`);
    }
    
    return {
      success: false,
      message: 'Failed to send push notification',
      error: error.message,
      userId,
    };
  }
};

exports.sendMessageNotification = async (receiverId, message, sender) => {
  const messageType = message.type || 'text';
  let notificationTitle = sender.name || sender.username || 'Someone';
  let notificationBody = '';

  switch (messageType) {
    case 'text':
      notificationBody = message.content || 'sent you a message';
      break;
    case 'image':
      notificationBody = 'sent you an image';
      break;
    case 'video':
      notificationBody = 'sent you a video';
      break;
    case 'audio':
    case 'voiceNote':
      notificationBody = 'sent you a voice message';
      break;
    case 'document':
      notificationBody = 'sent you a document';
      break;
    case 'text-image':
      notificationBody = message.content ? 
        `${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}` : 
        'sent you a message with image';
      break;
    default:
      notificationBody = 'sent you a message';
  }

  const notificationData = {
    title: notificationTitle,
    body: notificationBody,
  };

  const data = {
    type: 'new_message',
    messageId: message._id.toString(),
    chatId: message.chat.toString(),
    senderId: sender._id.toString(),
    senderName: sender.name || sender.username,
    messageType: messageType,
    content: message.content || '',
  };

  return await this.sendPushNotification(receiverId, notificationData, data);
};

exports.sendFriendRequestNotification = async (receiverId, sender) => {
  const notificationData = {
    title: sender.name || sender.username || 'Someone',
    body: 'sent you a friend request',
  };

  const data = {
    type: 'friend_request',
    senderId: sender._id.toString(),
    senderName: sender.name || sender.username,
  };

  return await this.sendPushNotification(receiverId, notificationData, data);
};


exports.sendReadReceiptNotification = async (senderId, messageId, reader) => {
  const notificationData = {
    title: reader.name || reader.username || 'Someone',
    body: 'read your message',
  };

  const data = {
    type: 'message_read',
    messageId: messageId,
    readerId: reader._id.toString(),
    readerName: reader.name || reader.username,
  };

  return await this.sendPushNotification(senderId, notificationData, data);
};

exports.sendFriendRequestAcceptanceNotification = async (senderId, accepter) => {
  const notificationData = {
    title: accepter.name || accepter.username || 'Someone',
    body: 'accepted your friend request',
  };

  const data = {
    type: 'friend_request_accepted',
    accepterId: accepter._id.toString(),
    accepterName: accepter.name || accepter.username,
  };

  return await this.sendPushNotification(senderId, notificationData, data);
}; 
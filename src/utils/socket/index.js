const User = require('../../models/userModel');
const OneToOneChat = require('../../models/chatModel/index');
const Message = require('../../models/messageModel');
const { getIO } = require('../../config/socket');

// Global in-memory cache to prevent duplicate emits
const emittedMessages = new Set();

/**
 * Get all one-to-one chats between userId and otherId,
 * with unread count, isFriend flag, and latest message.
 */
exports.getUserChatList = async (userId, otherId) => {
  const chats = await OneToOneChat.find({
    participants: { $all: [userId, otherId] },
  })
    .populate('participants', 'name username profilePicture')
    .populate({
      path: 'lastMessage',
      populate: {
        path: 'sender',
        select: 'name username profilePicture',
      },
    })
    .sort({ updatedAt: -1 });

  const user = await User.findById(userId).select('friends');

  return Promise.all(
    chats.map(async chat => {
      const unreadCount = await Message.countDocuments({
        chat: chat._id,
        receiver: userId,
        status: 'sent',
      });

      const chatWith = chat.participants.filter(p => p._id.toString() !== userId.toString());

      return {
        ...chat.toObject(),
        unreadCount,
        chatWith,
        isFriend: user?.friends.includes(chatWith[0]._id),
      };
    })
  );
};

/**
 * Emit a new message to both sender and receiver,
 * update message status if receiver is in chat,
 * and update both chat lists.
 */
exports.emitNewMessage = async (message, chat, receiverId, senderId) => {
  const io = getIO();
  const messageId = message._id.toString();

  // Prevent duplicate emission
  if (emittedMessages.has(messageId)) {
    console.log(`[SKIP] Already emitted message ${messageId}`);
    return;
  }

  emittedMessages.add(messageId);
  setTimeout(() => emittedMessages.delete(messageId), 60 * 1000); // cleanup after 1 minute

  console.log(`[Socket] Emitting message ${messageId} from ${senderId} to ${receiverId}`);

  const chatRoomId = `chat:${chat._id}`;
  const receiverRoom = `user:${receiverId}`;
  const senderRoom = `user:${senderId}`;

  const receiver = await User.findById(receiverId);
  const sender = await User.findById(senderId);


  // Check if receiver is active in the chat room
  const receiverUser = await User.findById(receiverId);
  const chatRoom = io.sockets.adapter.rooms.get(chatRoomId);
  const isReceiverInChat = receiverUser?.isOnline && chatRoom?.has(receiverUser.socketId);

  if (receiver && receiver.isOnline) {
    io.to(chatRoomId).emit('new_message', {
      ...message.toObject(),
      chat: chat._id,
      userId: receiverId,
    });
  }

  if (message.type === 'image' || message.type === 'text-image') {
    console.log('emitting new gallery message', message.type);
    io.to(`user:${receiverId}`).emit('new_gallery_message', {
      success: true,
      data: message,
    });
    io.to(`user:${senderId}`).emit('new_gallery_message', {
      success: true,
      data: message,
    });
  }

  // If receiver is actively in chat, mark message as read
  if (isReceiverInChat) {
    message.status = 'read';
    await message.save();

    if (sender && sender.isOnline) {
      io.to(chatRoomId).emit(`message_read_update`, {
        success: true,
        data: message,
        userId: senderId,
      });
    }
  }

  // Update chat list for both users
  const [receiverChats, senderChats] = await Promise.all([
    this.getUserChatList(receiverId, senderId),
    this.getUserChatList(senderId, receiverId),
  ]);

  io.to(receiverRoom).emit('chat_list_update', {
    success: true,
    data: receiverChats,
  });

  io.to(senderRoom).emit('chat_list_update', {
    success: true,
    data: senderChats,
  });
};

const User = require('../../models/userModel');
const OneToOneChat = require('../../models/chatModel/index');
const messageModel = require('../../models/messageModel');
const { getIO } = require('../../config/socket');

const getUserChatList = async (userId, otherId) => {
  const chats = await OneToOneChat.find({ participants: { $all: [userId, otherId] } })
    .populate('participants', 'name username profilePicture')
    .populate({
      path: 'lastMessage',
      populate: { path: 'sender', select: 'name username profilePicture' },
    })
    .sort({ lastMessage: -1 });

  const user = await User.findById(userId).select('friends');

  return await Promise.all(
    chats.map(async chat => {
      const unreadCount = await messageModel.countDocuments({
        chat: chat._id,
        receiver: userId,
        status: 'sent',
      });
      const chatWith = chat.participants.filter(p => p._id.toString() !== userId.toString());
      return {
        ...chat.toObject(),
        lastMessage: chat.lastMessage,
        unreadCount,
        isFriend: user?.friends.includes(chatWith[0]._id),
        chatWith,
      };
    })
  );
};

exports.emitNewMessage = async (message, chat, receiverId, senderId) => {
  const io = getIO();
  const messageId = message._id.toString();
  if (emittedMessages.has(messageId)) return;

  const chatRoomId = chat._id.toString();

  const receiverRoom = `user:${receiverId}`;
  const senderRoom = `user:${senderId}`;

  // Check if receiver is in the chat room
  const receiverUser = await User.findById(receiverId).select('socketId');
  const room = io.sockets.adapter.rooms.get(chatRoomId);
  const isReceiverInChat = receiverUser?.socketId && room?.has(receiverUser.socketId.toString());

  // Emit to receiver
  io.to(receiverRoom).emit('new_message', {
    message: message.toObject(),
    chatId: chat._id,
  });

  // Emit to sender
  io.to(senderRoom).emit('new_message', {
    message: message.toObject(),
    chatId: chat._id,
  });

  // If receiver is in the chat, mark as read and notify sender
  if (isReceiverInChat) {
    message.status = 'read';
    await message.save();

    io.to(senderRoom).emit('message_read_update', {
      messageId: message._id,
    });
  }

  emittedMessages.add(messageId);
  setTimeout(() => emittedMessages.delete(messageId), 60 * 1000);

  // Update chat list for receiver
  const receiverChats = await getUserChatList(receiverId, senderId);
  io.to(receiverRoom).emit('chat_list_update', {
    success: true,
    data: receiverChats,
  });

  // Update chat list for sender
  const senderChats = await getUserChatList(senderId, receiverId);
  io.to(senderRoom).emit('chat_list_update', {
    success: true,
    data: senderChats,
  });
};

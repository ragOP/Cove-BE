const { getIO } = require('../../config/socket');
const User = require('../../models/userModel');
const OneToOneChat = require('../../models/chatModel');
const messageModel = require('../../models/messageModel');

const emittedMessages = new Set();

exports.emitNewMessage = async (message, chat, receiverId, senderId) => {
  const messageId = message._id.toString();
  if (emittedMessages.has(messageId)) {
    console.log(`Message ${messageId} already emitted, skipping duplicate emission`);
    return;
  }

  const io = getIO();
  const receiver = await User.findById(receiverId).select('socketId');
  const sender = await User.findById(senderId).select('socketId');

  const isReceiverOnline = receiver && receiver.socketId;
  const chatRoomId = chat._id.toString();
  const room = io.sockets.adapter.rooms.get(`room_${chatRoomId}`);
  const isReceiverInChat = isReceiverOnline && room?.has(`room_${receiver._id.toString()}`);


  // Only emit to the receiver's socket
  if (receiver && receiver.socketId) {
    io.to(receiver.socketId).emit(`new_message_${receiver._id}`, {
      ...message.toObject(),
      chat: chat._id,
    });
  }

  // Only emit to the sender's socket
  if (sender && sender.socketId) {
    io.to(sender.socketId).emit(`new_message_${sender._id}`, {
      ...message.toObject(),
      chat: chat._id,
    });
  }

  if (isReceiverInChat) {
    message.status = 'read';
    await message.save();

    if (sender && sender.socketId) {
      io.to(sender.socketId).emit(`message_read_update_${sender._id}`, {
        success: true,
        data: message,
      });
    }
  }

  emittedMessages.add(messageId);

  // Update chat list for receiver
  if (receiver && receiver.socketId) {
    const receiverChats = await OneToOneChat.find({ participants: { $all: [receiverId, senderId] } })
      .populate('participants', 'name username profilePicture')
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'sender',
          select: 'name username profilePicture',
        },
      })
      .sort({
        lastMessage: -1,
      });

    const receiverChatResults = await Promise.all(
      receiverChats.map(async chat => {
        const unreadCount = await messageModel.countDocuments({
          chat: chat._id,
          receiver: receiverId,
          status: 'sent',
        });
        const otherParticipant = chat.participants.filter(
          p => p._id.toString() !== receiverId.toString()
        );
        const isFriend = await User.findById(receiverId).then(user =>
          user.friends.includes(otherParticipant[0]._id)
        );
        return {
          ...chat.toObject(),
          lastMessage: chat.lastMessage,
          unreadCount,
          isFriend,
          chatWith: otherParticipant,
        };
      })
    );

    io.to(receiver.socketId).emit(`chat_list_update_${receiver._id}`, {
      success: true,
      data: receiverChatResults,
    });
  }

  // Update chat list for sender
  if (sender && sender.socketId) {
    const senderChats = await OneToOneChat.find({ participants: { $all: [receiverId, senderId] } })
      .populate('participants', 'name username profilePicture')
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'sender',
          select: 'name username profilePicture',
        },
      })
      .sort({
        lastMessage: -1,
      });

    const senderChatResults = await Promise.all(
      senderChats.map(async chat => {
        const unreadCount = await messageModel.countDocuments({
          chat: chat._id,
          receiver: senderId,
          status: 'sent',
        });
        const otherParticipant = chat.participants.filter(
          p => p._id.toString() !== senderId.toString()
        );
        const isFriend = await User.findById(senderId).then(user =>
          user.friends.includes(otherParticipant[0]._id)
        );
        return {
          ...chat.toObject(),
          lastMessage: chat.lastMessage,
          unreadCount,
          isFriend,
          chatWith: otherParticipant,
        };
      })
    );

    io.to(sender.socketId).emit(`chat_list_update_${sender._id}`, {
      success: true,
      data: senderChatResults,
    });
  }

  setTimeout(() => {
    emittedMessages.delete(messageId);
  }, 60 * 1000);
};

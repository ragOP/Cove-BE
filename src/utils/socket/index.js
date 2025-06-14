const { getIO } = require('../../config/socket');
const User = require('../../models/userModel');
const OneToOneChat = require('../../models/chatModel');
const messageModel = require('../../models/messageModel');

const emittedMessages = new Set();

exports.emitNewMessage = async (message, chat, receiverId) => {
  const messageId = message._id.toString();
  if (emittedMessages.has(messageId)) {
    console.log(`Message ${messageId} already emitted, skipping duplicate emission`);
    return;
  }

  const io = getIO();
  const receiver = await User.findById(receiverId).select('socketId');
  if (receiver && receiver.socketId) {
    io.to(receiver.socketId).emit('new_message', {
      ...message.toObject(),
      chat: chat._id,
    });
    emittedMessages.add(messageId);
    const receiverChats = await OneToOneChat.find({ participants: receiverId })
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

    io.to(receiver.socketId).emit('chat_list_update', {
      success: true,
      data: receiverChatResults,
    });
  }

  const senderChats = await OneToOneChat.find({ participants: socket.user._id })
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
        receiver: socket.user._id,
        status: 'sent',
      });
      const otherParticipant = chat.participants.filter(
        p => p._id.toString() !== socket.user._id.toString()
      );
      const isFriend = await User.findById(socket.user._id).then(user =>
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

  socket.emit('chat_list_update', {
    success: true,
    data: senderChatResults,
  });
  setTimeout(() => {
    emittedMessages.delete(messageId);
  }, 60 * 1000);
};

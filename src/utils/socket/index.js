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
    setTimeout(() => {
      emittedMessages.delete(messageId);
    }, 60 * 1000);
  }
};

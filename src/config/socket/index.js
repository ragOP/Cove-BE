const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../../models/userModel');
const OneToOneChat = require('../../models/chatModel');
const messageModel = require('../../models/messageModel');

let io;

const initializeSocket = server => {
  io = socketIo(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      allowedHeaders: ['*'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    path: '/socket.io/',
    serveClient: false,
    connectTimeout: 45000,
    allowEIO3: true,
  });

  io.on('error', error => {
    console.log('=== Socket Server Error ===');
    console.log('Error:', error);
  });

  io.on('connection_error', err => {
    console.log('=== Socket Connection Error Event ===');
    console.log('Connection error:', err);
  });

  io.use(async (socket, next) => {
    try {
      const queryToken = socket.handshake.query.token;
      const token =
        socket.handshake.auth.token || socket.handshake.headers.authorization || queryToken;

      if (!token) {
        return next(new Error('Authentication error: Token not provided'));
      }

      const cleanToken = token.replace('Bearer ', '');

      try {
        const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) {
          throw new Error('Authentication error: User not found');
        }
        socket.user = user;
        next();
      } catch (jwtError) {
        throw jwtError;
      }
    } catch (error) {
      next(new Error(`Authentication error: ${error.message}`));
    }
  });

  io.on('connect', socket => {
    if (socket.user) return;
  });

  io.on('connection', socket => {
    socket.on('get_my_info', () => {
      socket.emit('user_info', {
        userId: socket.user._id,
        socketId: socket.id,
        isOnline: true,
      });
    });
    User.findByIdAndUpdate(socket.user._id, {
      isOnline: true,
      socketId: socket.id,
      lastSeen: new Date(),
    }).exec();

    socket.on('private_message', async data => {
      try {
        const { receiverId, content, type = 'text', mediaUrl, duration, fileSize } = data;

        const receiver = await User.findById(receiverId).select('socketId');

        if (receiver && receiver.socketId) {
          io.to(receiver.socketId).emit('new_message', {
            senderId: socket.user._id,
            content,
            type,
            mediaUrl,
            duration,
            fileSize,
            timestamp: new Date(),
          });
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
              const messages = await messageModel.find({ chat: chat._id }).sort({ createdAt: -1 });
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
                messages: messages.map(message => ({
                  ...message.toObject(),
                  content: message.content,
                  mediaUrl: message.mediaUrl,
                })),
                chatWith: otherParticipant,
              };
            })
          );

          io.to(receiver.socketId).emit('chat_list_update', {
            success: true,
            data: receiverChatResults
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
            const messages = await messageModel.find({ chat: chat._id }).sort({ createdAt: -1 });
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
              messages: messages.map(message => ({
                ...message.toObject(),
                content: message.content,
                mediaUrl: message.mediaUrl,
              })),
              chatWith: otherParticipant,
            };
          })
        );

        socket.emit('chat_list_update', {
          success: true,
          data: senderChatResults
        });
      } catch (error) {
        console.error('Error sending private message:', error);
      }
    });

    socket.on('recieve_message_onChatList', async (data) => {
      const { userId } = data;
      try {
        const chats = await OneToOneChat.find({ participants: userId })
        .populate('participants', 'name username profilePicture')
        .populate({
          path: 'lastMessage',
          populate: {
            path: 'sender',
            select: 'name username profilePicture',
          },
        })
        .skip(skip)
        .limit(limit)
        .sort({
          lastMessage: -1,
        });
    
      const chatResults = await Promise.all(
        chats.map(async chat => {
          const unreadCount = await messageModel.countDocuments({
            chat: chat._id,
            receiver: userId,
            status: 'sent',
          });
          const messages = await messageModel.find({ chat: chat._id }).sort({ createdAt: -1 });
          const otherParticipant = chat.participants.filter(
            p => p._id.toString() !== userId.toString()
          );
          const isFriend = await User.findById(userId).then(user =>
            user.friends.includes(otherParticipant[0]._id)
          );
          return {
            ...chat.toObject(),
            lastMessage: chat.lastMessage,
            unreadCount,
            isFriend,
            messages: messages.map(message => ({
              ...message.toObject(),
              content: message.content,
              mediaUrl: message.mediaUrl,
            })),
            chatWith: otherParticipant,
          };
        })
      );
      socket.emit('chat_list_update', {
        success: true,
        data: chatResults
      });
      }catch(error) {
        console.error('Error recieving message on chat list:', error);
        socket.emit('chat_list_update', {
          success: false,
          error: 'Error fetching chat list'
        });
      }
    })

    socket.on('typing_status', async data => {
      try {
        const { receiverId, isTyping } = data;
        const receiver = await User.findById(receiverId).select('socketId');

        if (receiver && receiver.socketId) {
          io.to(receiver.socketId).emit('typing_status_update', {
            senderId: socket.user._id,
            isTyping,
          });
        }
      } catch (error) {
        console.error('Error updating typing status:', error);
      }
    });

    socket.on('message_read', async data => {
      try {
        const { senderId, messageId } = data;
        const sender = await User.findById(senderId).select('socketId');

        if (sender && sender.socketId) {
          io.to(sender.socketId).emit('message_read_update', {
            messageId,
            readBy: socket.user._id,
          });
        }
      } catch (error) {
        console.error('Error updating read receipt:', error);
      }
    });

    socket.on('disconnect', () => {
      User.findByIdAndUpdate(socket.user._id, {
        isOnline: false,
        socketId: null,
        lastSeen: new Date(),
      }).exec();
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = {
  initializeSocket,
  getIO,
};

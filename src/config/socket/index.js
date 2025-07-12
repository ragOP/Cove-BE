const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../../models/userModel');
const OneToOneChat = require('../../models/chatModel/index');

let io;

const initializeSocket = server => {
  if (io) return io; // Prevent re-initialization

  io = socketIo(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['*'],
      credentials: true,
    },
    transports: ['websocket'],
    pingTimeout: 60000,
    pingInterval: 25000,
    path: '/socket.io/',
    serveClient: false,
    connectTimeout: 45000,
    allowEIO3: true,
  });

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization ||
        socket.handshake.query.token;
      if (!token) return next(new Error('Authentication error: Token not provided'));

      const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error('Authentication error: User not found'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error: ' + err.message));
    }
  });


  const emitUserStatusToFriends = async (userId) => {
    const user = await User.findById(userId).select('friends');
    for (const friendId of user.friends) {
      const chat = await OneToOneChat.findOne({
        participants: { $all: [userId, friendId] },
      });
      if (chat) {
        io.to(`chat:${chat._id}`).emit('get_user_info', {
          friendId: userId,
          isOnline: true,
          lastSeen: new Date(),
        });
      }
    }
  }

  io.on('connection', async socket => {
    const userId = socket.user._id.toString();
    const userRoom = `user:${userId}`;
    socket.join(userRoom);

    await User.findByIdAndUpdate(userId, {
      isOnline: true,
      socketId: socket.id,
      lastSeen: new Date(),
    });

    const user = await User.findById(userId).select('friends');
    await emitUserStatusToFriends(userId);

    // Chat room handling
    socket.on('join_chat', ({ conversationId }) => {
      if (conversationId) {
        const chatRoom = `chat:${conversationId}`;
        socket.join(chatRoom);
      }
    });

    socket.on('leave_chat', conversationId => {
      const chatRoom = `chat:${conversationId}`;
      socket.leave(chatRoom);
    });

    // Typing indicator
    socket.on('typing_status', ({ conversationId, isTyping }) => {
      io.to(`chat:${conversationId}`).emit('typing_status_update', {
        senderId: userId,
        isTyping,
      });
    });

    socket.on('disconnect', async () => {
      try {
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          socketId: null,
          lastSeen: new Date(),
        });

        await emitUserStatusToFriends(userId);
      } catch (err) {
        console.error('Socket disconnect error:', err);
      }
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

module.exports = {
  initializeSocket,
  getIO,
};

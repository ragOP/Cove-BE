const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../../models/userModel');

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

    if (user) {
      const uniqueFriendIds = [...new Set(user.friends.map(f => f.toString()))];

      for (const friendId of uniqueFriendIds) {
        // Emit to friend's room that this user is online
        io.to(`user:${friendId}`).emit('get_user_info', {
          friendId: userId,
          isOnline: true,
          lastSeen: new Date(),
        });

        // Emit back to current user if friend is already online
        const friend = await User.findById(friendId).select('isOnline lastSeen');
        if (friend?.isOnline) {
          io.to(userRoom).emit('get_user_info', {
            friendId,
            isOnline: true,
            lastSeen: friend.lastSeen,
          });
        }
      }
    }

    // Chat room handling
    socket.on('join_chat', ({ chatId }) => {
      if (chatId) {
        socket.join(chatId.toString());
      }
    });

    socket.on('leave_chat', chatId => {
      socket.leave(chatId.toString());
    });

    // Typing indicator
    socket.on('typing_status', ({ receiverId, isTyping }) => {
      io.to(`user:${receiverId}`).emit('typing_status_update', {
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

        if (user) {
          const uniqueFriendIds = [...new Set(user.friends.map(f => f.toString()))];

          for (const friendId of uniqueFriendIds) {
            io.to(`user:${friendId}`).emit('get_user_info', {
              friendId: userId,
              isOnline: false,
              lastSeen: new Date(),
            });
          }
        }
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

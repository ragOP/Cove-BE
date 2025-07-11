const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../../models/userModel');

let io;

const initializeSocket = server => {
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
    const token =
      socket.handshake.auth.token ||
      socket.handshake.headers.authorization ||
      socket.handshake.query.token;
    if (!token) return next(new Error('Authentication error: Token not provided'));

    try {
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
    socket.join(userRoom); // Join your own room

    // Update DB
    await User.findByIdAndUpdate(userId, {
      isOnline: true,
      socketId: socket.id,
      lastSeen: new Date(),
    });

    // Notify all friends
    const user = await User.findById(userId).select('friends');
    if (user) {
      for (const friendId of user.friends) {
        const fid = friendId.toString();
        socket.join(`user:${fid}`); // Join each friend’s room to receive updates

        // Notify each friend
        io.to(`user:${fid}`).emit('get_user_info', {
          friendId: userId,
          isOnline: true,
          lastSeen: new Date(),
        });

        // Check if friend is online (optional, can cache for perf)
        const friend = await User.findById(fid).select('isOnline lastSeen');
        if (friend?.isOnline) {
          // Notify current user that friend is already online
          io.to(userRoom).emit('get_user_info', {
            friendId: fid,
            isOnline: true,
            lastSeen: friend.lastSeen,
          });
        }
      }
    }

    // Join/Leave chat rooms
    socket.on('join_chat', ({ chatId }) => {
      if (chatId) socket.join(chatId.toString());
    });

    socket.on('leave_chat', chatId => {
      socket.leave(chatId.toString());
    });

    // Typing
    socket.on('typing_status', ({ receiverId, isTyping }) => {
      io.to(`user:${receiverId}`).emit('typing_status_update', {
        senderId: userId,
        isTyping,
      });
    });

    // Disconnect
    socket.on('disconnect', async () => {
      try {
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          socketId: null,
          lastSeen: new Date(),
        });

        if (user) {
          for (const friendId of user.friends) {
            const fid = friendId.toString();
            io.to(`user:${fid}`).emit('get_user_info', {
              friendId: userId,
              isOnline: false,
              lastSeen: new Date(),
            });
          }
        }
      } catch (error) {
        console.error('Disconnect error:', error);
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

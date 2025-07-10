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

  io.on('connection', async socket => {
    // Join user's personal room
    socket.join(socket.user._id.toString());

    // Update user's online status and socket ID
    await User.findByIdAndUpdate(socket.user._id, {
      isOnline: true,
      socketId: socket.id,
      lastSeen: new Date(),
    });

    // Notify friends about user's online status
    const user = await User.findById(socket.user._id).select('friends');
    if (user) {
      user.friends.forEach(friendId => {
        if (friendId.toString() === socket.user._id.toString()) {
          return;
        }
        io.to(friendId.toString()).emit(`get_user_info_${friendId}`, {
          userId: socket.user._id,
          lastSeen: new Date(),
          isOnline: true,
        });
      });
    }

    // Handle joining a chat room
    socket.on('join_chat', async data => {
      const { chatId, receiverId } = data;
      if (chatId) {
        socket.join(chatId.toString());
      }
      // Notify only the receiver about user's online status
      const user = await User.findById(socket.user._id).select('friends');
      if (user) {
        user.friends.forEach(friendId => {
          if (friendId.toString() === socket.user._id.toString()) {
            return;
          }
          io.to(friendId.toString()).emit(`get_user_info_${friendId}`, {
            userId: socket.user._id,
            lastSeen: new Date(),
            isOnline: true,
          });
        });
      }
    });

    // Handle leaving a chat room
    socket.on('leave_chat', async chatId => {
      socket.leave(chatId.toString());
    });

    // Handle typing status
    socket.on('typing_status', ({ receiverId, isTyping }) => {
      // Only emit typing status to the receiver
      if (receiverId) {
        const receiverSocket = io.sockets.adapter.rooms.get(receiverId.toString());
        console.log(receiverSocket, 'receiverSocket');
        if (receiverSocket) {
          io.to(receiverId.toString()).emit(`typing_status_update_${receiverId}`, {
            senderId: socket.user._id,
            isTyping,
          });
        }
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      try {
        await User.findByIdAndUpdate(socket.user._id, {
          isOnline: false,
          socketId: null,
          lastSeen: new Date(),
        });

        const user = await User.findById(socket.user._id).select('friends');
        if (user) {
          user.friends.forEach(friendId => {
            if (friendId.toString() === socket.user._id.toString()) {
              return;
            }
            io.to(friendId.toString()).emit(`get_user_info_${friendId}`, {
              userId: socket.user._id,
              lastSeen: new Date(),
              isOnline: false,
            });
          });
        }
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
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

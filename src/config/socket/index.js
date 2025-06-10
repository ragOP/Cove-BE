const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../../models/userModel');

let io;

const initializeSocket = (server) => {
  console.log('\n=== Socket.IO Initialization Start ===');
  console.log('JWT_SECRET present:', !!process.env.JWT_SECRET);
  console.log('Server instance present:', !!server);
  console.log('Initializing Socket.IO server...');
  
  io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["*"],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    path: '/socket.io/',
    serveClient: false,
    connectTimeout: 45000,
    allowEIO3: true
  });

  // Add detailed error logging
  io.engine.on('connection_error', (err) => {
    console.log('=== Socket Connection Error ===');
    console.log('Error code:', err.code);
    console.log('Error message:', err.message);
    console.log('Error context:', err.context);
    console.log('Request details:', {
      method: err.req?.method,
      url: err.req?.url,
      headers: err.req?.headers
    });
  });

  // Log when headers are being processed
  io.engine.on('initial_headers', (headers, req) => {
    console.log('=== Initial Headers Event ===');
    console.log('Initial headers:', headers);
    console.log('Request details:', {
      method: req.method,
      url: req.url,
      headers: req.headers
    });
  });

  // Add error event listener to catch any socket level errors
  io.on('error', (error) => {
    console.log('=== Socket Server Error ===');
    console.log('Error:', error);
  });

  io.engine.on('ready', () => {
    console.log('=== Socket.IO Server Ready ===');
    console.log('Socket.IO server is ready to accept connections');
  });

  // Add connection_error event listener
  io.on('connection_error', (err) => {
    console.log('=== Socket Connection Error Event ===');
    console.log('Connection error:', err);
  });

  console.log('=== Setting up authentication middleware ===');
  io.use(async (socket, next) => {
    console.log('\n=== Socket Authentication Start ===');
    console.log('Socket ID:', socket.id);
    
    try {
      // Extract token from query parameters first
      const queryToken = socket.handshake.query.token;
      console.log('Token from query:', queryToken ? 'Found' : 'Not found');
      
      const token = 
        socket.handshake.auth.token || 
        socket.handshake.headers.authorization ||
        queryToken;

      console.log('Token sources check:');
      console.log('- Auth token:', socket.handshake.auth.token ? 'Present' : 'Missing');
      console.log('- Header token:', socket.handshake.headers.authorization ? 'Present' : 'Missing');
      console.log('- Query token:', queryToken ? 'Present' : 'Missing');

      if (!token) {
        console.log('❌ No token provided in any location');
        throw new Error('Authentication error: Token not provided');
      }

      console.log('Token found, attempting verification...');
      
      // Remove 'Bearer ' if present
      const cleanToken = token.replace('Bearer ', '');
      
      try {
        const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
        console.log('✅ Token verified successfully');
        console.log('Decoded user ID:', decoded.id);
        
        const user = await User.findById(decoded.id);
        
        if (!user) {
          console.log('❌ User not found in database');
          throw new Error('Authentication error: User not found');
        }

        console.log('✅ User found in database:', user._id);
        socket.user = user;
        console.log('=== Socket Authentication End ===\n');
        next();
      } catch (jwtError) {
        console.log('❌ JWT verification failed:', jwtError.message);
        throw jwtError;
      }
    } catch (error) {
      console.log('❌ Auth error:', error.message);
      next(new Error(`Authentication error: ${error.message}`));
    }
  });

  console.log('=== Authentication middleware setup complete ===');

  // Log all connection events
  io.on('connect', (socket) => {
    console.log('=== Socket Connect Event ===');
    console.log('Client connected with socket ID:', socket.id);
    if (socket.user) {
      console.log('User data available in connect:', socket.user._id);
    } else {
      console.log('No user data available in connect event');
    }
  });

  io.on('connection', (socket) => {
    console.log('=== Socket Connection Event ===');
    console.log('Socket ID:', socket.id);
    if (socket.user) {
      console.log(`User connected: ${socket.user._id}`);
    } else {
      console.log('Warning: No user data available in connection event');
    }
    
    socket.on('test', (data) => {
      console.log('Received test event:', data);
      socket.emit('test_response', {
        message: 'Test successful!',
        receivedData: data,
        userId: socket.user._id
      });
    });

    // Echo event for testing
    socket.on('echo', (data) => {
      console.log('Echo event received:', data);
      socket.emit('echo_response', data);
    });

    // Get user info test
    socket.on('get_my_info', () => {
      socket.emit('user_info', {
        userId: socket.user._id,
        socketId: socket.id,
        isOnline: true
      });
    });

    // Update user's online status and socket ID
    User.findByIdAndUpdate(socket.user._id, {
      isOnline: true,
      socketId: socket.id,
      lastSeen: new Date()
    }).exec();

    // Handle private messages
    socket.on('private_message', async (data) => {
      try {
        const { receiverId, content, type = 'text', mediaUrl, duration, fileSize } = data;
        
        // Find receiver's socket ID
        const receiver = await User.findById(receiverId).select('socketId');
        
        if (receiver && receiver.socketId) {
          // Emit to receiver
          io.to(receiver.socketId).emit('new_message', {
            senderId: socket.user._id,
            content,
            type,
            mediaUrl,
            duration,
            fileSize,
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error('Error sending private message:', error);
      }
    });

    // Handle typing status
    socket.on('typing_status', async (data) => {
      try {
        const { receiverId, isTyping } = data;
        const receiver = await User.findById(receiverId).select('socketId');
        
        if (receiver && receiver.socketId) {
          io.to(receiver.socketId).emit('typing_status_update', {
            senderId: socket.user._id,
            isTyping
          });
        }
      } catch (error) {
        console.error('Error updating typing status:', error);
      }
    });

    // Handle read receipts
    socket.on('message_read', async (data) => {
      try {
        const { senderId, messageId } = data;
        const sender = await User.findById(senderId).select('socketId');
        
        if (sender && sender.socketId) {
          io.to(sender.socketId).emit('message_read_update', {
            messageId,
            readBy: socket.user._id
          });
        }
      } catch (error) {
        console.error('Error updating read receipt:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user._id}`);
      User.findByIdAndUpdate(socket.user._id, {
        isOnline: false,
        socketId: null,
        lastSeen: new Date()
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
  getIO
}; 
const OneToOneChat = require('../../models/chatModel/index');
const FriendRequest = require('../../models/requestModel/index');
const { uploadSingleFile } = require('../../functions/cloudniary');
const {
  updateUserProfile,
  checkUserExists,
  allMatchingSearch,
  findUserById,
  checkExistingRequest,
  createNewFriendRequest,
  createOneToOneChat,
  getOneToOneChatByParticipants,
  createMessageAndAddToChat,
  acceptFriendRequestById,
  addFriends,
  checkOneToOneChatExists,
  getPendingFriendRequests,
  getSentFriendRequests,
  getSuggestedUsersRepo,
} = require('../../repositories/users');
const User = require('../../models/userModel');
const { encrypt } = require('../../utils/encryption');
const { decrypt } = require('../../utils/encryption');
const messageModel = require('../../models/messageModel');
const { findPendingFriendRequestBySender } = require('../../repositories/users/index');
const { getIO } = require('../../config/socket');
const { emitNewMessage } = require('../../utils/socket');
const {
  sendFriendRequestNotification,
  sendFriendRequestAcceptanceNotification,
  sendMessageNotification,
} = require('../pushNotification');

exports.updateUserProfile = async (data, file, id) => {
  const filePath = file ? file.path : null;
  const imagUrl = filePath ? await uploadSingleFile(filePath, 'images') : null;
  const deviceInfo = data.deviceInfo ? JSON.parse(data.deviceInfo) : null;
  const dataToUpdate = {
    ...data,
    profilePicture: imagUrl,
    deviceInfo: deviceInfo,
  };
  const result = await updateUserProfile(dataToUpdate, id);
  if (result) {
    return {
      message: 'User profile updated successfully',
      data: result,
      statusCode: 200,
    };
  } else {
    return {
      message: 'Failed to update user profile',
      data: null,
      statusCode: 500,
    };
  }
};

exports.isUsernameAvailable = async username => {
  const user = await checkUserExists(username);
  if (user) {
    return {
      message: 'Username is already taken',
      data: null,
      statusCode: 409,
    };
  } else {
    return {
      message: 'Username is available',
      data: null,
      statusCode: 200,
    };
  }
};

exports.searchUser = async (query, currentUserId) => {
  const users = await allMatchingSearch(query, currentUserId);
  if (users.length > 0) {
    return {
      message: 'Users found',
      data: users,
      statusCode: 200,
    };
  } else {
    return {
      message: 'No users found',
      data: null,
      statusCode: 404,
    };
  }
};

exports.sendFriendRequest = async (senderId, receiverId) => {
  if (senderId === receiverId) {
    return {
      message: 'You cannot send a friend request to yourself',
      data: null,
      statusCode: 400,
    };
  }

  let sender = await findUserById(senderId);
  let receiver = await findUserById(receiverId);

  if (!sender || !receiver) {
    return {
      message: 'User not found',
      data: null,
      statusCode: 404,
    };
  }

  const isAlreadyFriend = sender.friends.includes(receiverId);
  if (isAlreadyFriend) {
    return {
      message: 'You are already friends with this user',
      data: null,
      statusCode: 409,
    };
  }

  const existingRequest = await checkExistingRequest(senderId, receiverId);

  if (existingRequest) {
    return {
      message: 'Friend request already pending',
      data: null,
      statusCode: 409,
    };
  }

  const request = await createNewFriendRequest(senderId, receiverId);

  const data = await FriendRequest.find({ receiver: receiverId, status: 'pending' }).populate('sender', 'name username profilePicture');
  const count = data.length;

  const io = getIO();
  receiver = await User.findById(receiverId).select('socketId');
  if (receiver && receiver.socketId) {
    io.to(receiver.socketId).emit('friend_request_received', {
      success: true,
      data: {
        count: count,
        data: data,
      },
    });
    io.to(receiver.socketId).emit('notification', {
      success: true,
      data: {
        type: 'friend_request_received',
        title: `${sender.name} has sent you a friend request`,
        data: {
          requestId: request._id,
        },
      },
    });
  }

  sender = await User.findById(senderId).select('name username profilePicture');
  const pushResultwithReq = await sendFriendRequestNotification(receiverId, sender);
  if (pushResultwithReq.success) {
    console.log(`Friend request notification sent to user ${receiverId}`);
  } else {
    console.log(
      `Failed to send friend request notification to user ${receiverId}:`,
      pushResultwithReq.message
    );
  }

  return {
    message: 'Friend request sent successfully',
    data: request._id,
  };
};

exports.acceptFriendRequest = async requestId => {
  const request = await findPendingFriendRequestBySender(requestId);

  if (!request || request.status !== 'pending') {
    return {
      message: 'Invalid or already processed request',
      data: null,
      statusCode: 400,
    };
  }

  await acceptFriendRequestById(request);
  await addFriends(request.sender, request.receiver);

  const existingChat = await checkOneToOneChatExists(request.sender, request.receiver);

  if (!existingChat) {
    await createOneToOneChat(request.sender, request.receiver);
  }

  let receiver = await User.findById(request.receiver).select('name username profilePicture');
  const pushResult = await sendFriendRequestAcceptanceNotification(request.sender, receiver);
  if (pushResult.success) {
    console.log(`Friend request acceptance notification sent to user ${request.sender}`);
  } else {
    console.log(
      `Failed to send friend request acceptance notification to user ${request.sender}:`,
      pushResult.message
    );
  }

  const sender = await User.findById(request.sender).select('socketId');
  const data = await FriendRequest.find({ sender: request.sender, status: 'pending' }).populate('receiver', 'name username profilePicture');
  const count = data.length;
  if (sender && sender.socketId) {
    const io = getIO();
    io.to(sender.socketId).emit('notification', {
      success: true,
      data: {
        type: 'friend_request_accepted',
        title: `${request.sender.name} has accepted your friend request`,
        data: {
          requestId: request._id,
        },
      },
    });
    io.to(sender && sender.socketId).emit('friend_request_received', {
      success: true,
      data: {
        count: count,
        data: data,
      },
    });
  }

  return {
    message: 'Friend request accepted successfully',
    data: request.sender,
    statusCode: 200,
  };
};

exports.getPendingFriendRequests = async userId => {
  const requests = await getPendingFriendRequests(userId);
  if (!requests || requests.length === 0) {
    return {
      message: 'No pending friend requests',
      data: null,
      statusCode: 404,
    };
  }
  return {
    message: 'Pending friend requests retrieved successfully',
    data: requests,
    statusCode: 200,
  };
};

exports.sendMessageService = async ({
  senderId,
  receiverId,
  content,
  type,
  mediaUrl,
  duration,
  fileSize,
}) => {
  let chat = await getOneToOneChatByParticipants(senderId, receiverId);

  let isFriends = await checkExistingRequest(senderId, receiverId);
  if (isFriends && isFriends.status === 'pending') {
    return {
      message: 'Your friend request is pending. Please accept it to send a message.',
      data: null,
      statusCode: 403,
    };
  }

  if (!chat) {
    await createNewFriendRequest(senderId, receiverId);
    chat = await createOneToOneChat(senderId, receiverId);

    const message = await createMessageAndAddToChat(chat, {
      senderId,
      receiverId,
      content,
      type,
      mediaUrl,
      duration,
      fileSize,
    });

    await emitNewMessage(message, chat, receiverId, senderId);

    const sender = await User.findById(senderId).select('name username profilePicture');
    const pushResultwithReq = await sendFriendRequestNotification(receiverId, sender);
    if (pushResultwithReq.success) {
      console.log(`Friend request notification sent to user ${receiverId}`);
    } else {
      console.log(
        `Failed to send friend request notification to user ${receiverId}:`,
        pushResultwithReq.message
      );
    }

    return {
      message: 'Follow request sent. Message sent with request.',
      data: message,
      statusCode: 202,
    };
  }

  const message = await createMessageAndAddToChat(chat, {
    senderId,
    receiverId,
    content,
    type,
    mediaUrl,
    duration,
    fileSize,
  });

  await emitNewMessage(message, chat, receiverId, senderId);

  const receiver = await User.findById(receiverId).select('socketId');
  const sender = await User.findById(senderId).select('name username profilePicture');
  if (receiver && !receiver.socketId) {
    const pushResult = await sendMessageNotification(receiverId, message, sender);
    if (pushResult.success) {
      console.log(`Message notification sent to user ${receiverId}`);
    } else {
      console.log(`Failed to send message notification to user ${receiverId}:`, pushResult.message);
    }
  }

  return {
    message: 'Message sent successfully',
    data: message,
    statusCode: 200,
  };
};

exports.getAllChatsForUser = async (userId, filters) => {
  const { page = 1, per_page = 50, search = '' } = filters;
  let query = { participants: userId };

  if (search) {
    const users = await User.find({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
      ],
      _id: { $ne: userId },
    }).select('_id');
    const userIds = users.map(u => u._id);
    query.participants = { $all: [userId], $in: userIds };
  }

  const skip = (parseInt(page) - 1) * parseInt(per_page);
  const limit = parseInt(per_page);

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

  return {
    message: 'Chats retrieved successfully',
    data: chatResults,
    statusCode: 200,
  };
};

exports.uploadFiles = async files => {
  const uploadedFiles = [];

  for (const file of files) {
    const fileType = file.mimetype.split('/')[0];
    let folder;

    switch (fileType) {
      case 'image':
        folder = 'images';
        break;
      case 'audio':
        folder = 'audio';
        break;
      case 'video':
        folder = 'video';
        break;
      case 'application':
        folder = file.mimetype.includes('pdf') ? 'documents' : 'archives';
        break;
      default:
        folder = 'documents';
    }

    const url = await uploadSingleFile(file.path, folder);

    uploadedFiles.push({
      originalName: file.originalname,
      fileName: file.filename,
      fileType: file.mimetype,
      fileSize: file.size,
      url: url,
    });
  }

  return {
    message: 'Files uploaded successfully',
    data: uploadedFiles,
    statusCode: 200,
  };
};

exports.getAllOneToOneChats = async (userId, receiverId) => {
  const chats = await OneToOneChat.find({
    participants: { $all: [userId, receiverId] },
    $expr: { $eq: [{ $size: '$participants' }, 2] },
  })
    .populate('participants', 'name username profilePicture')
    .populate({
      path: 'lastMessage',
      populate: {
        path: 'sender receiver',
        select: 'name username profilePicture',
      },
    })
    .populate({
      path: 'messages',
      populate: [
        {
          path: 'sender',
          select: 'name username profilePicture',
        },
        {
          path: 'receiver',
          select: 'name username profilePicture',
        },
      ],
    });

  const chatsWithFlags = chats.map(chat => {
    const chatObj = chat.toObject();
    chatObj.participants = chatObj.participants.map(p => ({
      ...p,
      isCurrentUser: p._id.toString() === userId.toString(),
    }));
    const receiver = chatObj.participants.find(p => p._id.toString() === receiverId.toString());
    chatObj.receiver = receiver;
    return chatObj;
  });

  return {
    message: 'One-to-one chats retrieved successfully',
    data: chatsWithFlags,
    statusCode: 200,
  };
};

exports.getMedia = async (userId, receiverId) => {
  const chat = await OneToOneChat.findOne({
    participants: { $all: [userId, receiverId] },
    $expr: { $eq: [{ $size: '$participants' }, 2] },
  });

  if (!chat) {
    return {
      message: 'Chat not found',
      data: null,
      statusCode: 404,
    };
  }

  const messages = await messageModel
    .find({
      chat: chat._id,
      type: { $in: ['image', 'video', 'audio', 'document', 'text-image'] },
    })
    .populate('sender', 'name username profilePicture')
    .populate('receiver', 'name username profilePicture');

  return {
    message: 'Media messages retrieved successfully',
    data: messages,
    statusCode: 200,
  };
};

exports.getAllFriends = async (userId, filters) => {
  const { page = 1, per_page = 50, search = '' } = filters;
  const skip = (parseInt(page) - 1) * parseInt(per_page);
  const limit = parseInt(per_page);

  const friends = await User.findById(userId).select('friends');

  const friendsQuery = await User.find({
    $or: [
      { username: { $regex: search, $options: 'i' } },
      { name: { $regex: search, $options: 'i' } },
    ],
    _id: { $in: friends.friends },
  })
    .select('name username profilePicture')
    .skip(skip)
    .limit(limit)
    .sort({
      name: 1,
    })
    .collation({ locale: 'en', strength: 2 });

  return {
    message: 'Friends retrieved successfully',
    data: friendsQuery,
    statusCode: 200,
  };
};

exports.readChat = async (userId, chatId) => {
  const chat = await OneToOneChat.findById(chatId);
  if (!chat) {
    return {
      message: 'Chat not found',
      data: null,
      statusCode: 404,
    };
  }

  const messages = await messageModel.find({ chat: chatId });
  const unreadMessages = messages.filter(
    message => message.receiver.toString() === userId.toString() && message.status === 'sent'
  );
  const readMessages = messages.filter(
    message => message.receiver.toString() === userId.toString() && message.status === 'read'
  );
  const unreadCount = unreadMessages.length;
  const readCount = readMessages.length;

  const result = await messageModel.updateMany(
    { chat: chatId, receiver: userId },
    { status: 'read' }
  );

  if (result) {
    const io = getIO();
    const otherParticipant = chat.participants.find(p => p.toString() !== userId.toString());
    const currentUser = await User.findById(userId).select('socketId friends');
    const sender = await User.findById(otherParticipant).select('socketId friends');

    const getChatList = async forUserId => {
      const chats = await OneToOneChat.find({ participants: forUserId })
        .populate('participants', 'name username profilePicture')
        .populate({
          path: 'lastMessage',
          populate: {
            path: 'sender',
            select: 'name username profilePicture',
          },
        })
        .sort({ lastMessage: -1 });
      return Promise.all(
        chats.map(async chat => {
          const unreadCount = await messageModel.countDocuments({
            chat: chat._id,
            receiver: forUserId,
            status: 'sent',
          });
          const otherParticipant = chat.participants.filter(
            p => p._id.toString() !== forUserId.toString()
          );
          const isFriend = await User.findById(forUserId).then(user =>
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
    };
    if (currentUser && currentUser.socketId) {
      const chatList = await getChatList(userId);
      io.to(currentUser.socketId).emit(`chat_list_update_${currentUser._id}`, {
        success: true,
        data: chatList,
      });
    }
    if (sender && sender.socketId) {
      const chatList = await getChatList(otherParticipant);
      io.to(sender.socketId).emit(`chat_list_update_${sender._id}`, {
        success: true,
        data: chatList,
      });
    }
    return {
      message: 'Chat read successfully',
      data: { unreadCount, readCount },
      statusCode: 200,
    };
  } else {
    return {
      message: 'Failed to read chat',
      data: null,
      statusCode: 500,
    };
  }
};

exports.getSentFriendRequests = async userId => {
  const requests = await getSentFriendRequests(userId);
  return {
    message: 'Sent friend requests retrieved successfully',
    data: requests,
    statusCode: 200,
  };
};

exports.getSuggestedUsers = async userId => {
  // For now, just return all users except the current user
  const users = await getSuggestedUsersRepo(userId);
  return {
    message: 'Suggested users fetched successfully',
    data: users,
    statusCode: 200,
  };
};

exports.updateFCMToken = async (userId, FCMToken) => {
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { FCMToken },
      { new: true, runValidators: true }
    );

    if (!user) {
      return {
        message: 'User not found',
        data: null,
        statusCode: 404,
      };
    }

    return {
      message: 'FCM token updated successfully',
      data: { userId: user._id },
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error updating FCM token:', error);
    return {
      message: 'Failed to update FCM token',
      data: null,
      statusCode: 500,
    };
  }
};

exports.getUserInfo = async userId => {
  const user = await User.findOne({_id: userId}).select('-password');
  if (!user) {
    return {
      message: 'User not found',
      data: null,
      statusCode: 404,
    };
  }
  return {
    message: 'User info retrieved successfully',
    data: user,
    statusCode: 200,
  };
};

exports.rejectFriendRequest = async (userId, requestId) => {
  const request = await FriendRequest.findById(requestId);
  if (!request) {
    return {
      message: 'Friend request not found',
      data: null,
      statusCode: 404,
    };
  }
  if (request.receiver.toString() !== userId.toString()) {
    return {
      message: 'You are not authorized to reject this friend request',
      data: null,
      statusCode: 403,
    };
  }
  const sender = request.sender;
  const receiver = request.receiver;
  const chat = await OneToOneChat.findOne({ participants: { $all: [sender, receiver] } });
  if (chat) {
    await OneToOneChat.findByIdAndDelete(chat._id);
    await messageModel.deleteMany({ chat: chat._id });
  }
  await FriendRequest.findByIdAndDelete(requestId);
  return {
    message: 'Friend request rejected successfully',
    data: null,
    statusCode: 200,
  };
};

exports.searchFriends = async (userId, search) => {
  const friends = await User.findById(userId).select('friends');
  const friendQuery = await User.find({
    $or: [
      {username: { $regex: search, $options: 'i' }},
      {name: { $regex: search, $options: 'i' }},
      {phoneNumber: { $regex: search, $options: 'i' }},
    ],
    _id: { $in: friends.friends },
  });
  return {
    message: 'Friends retrieved successfully',
    data: friendQuery,
    statusCode: 200,
  };
}
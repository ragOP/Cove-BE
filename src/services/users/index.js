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
} = require('../../repositories/users');
const User = require('../../models/userModel');
const { encrypt } = require('../../utils/encryption');
const { decrypt } = require('../../utils/encryption');
const messageModel = require('../../models/messageModel');
const { findPendingFriendRequestBySender } = require('../../repositories/users/index');

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

  const sender = await findUserById(senderId);
  const receiver = await findUserById(receiverId);

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
  // const encryptedContent = content ? encrypt(content) : null;
  // const encryptedMediaUrl = mediaUrl ? encrypt(mediaUrl) : null;
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

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

exports.searchUser = async query => {
  const users = await allMatchingSearch(query);
  if (users) {
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
  const encryptedContent = content ? encrypt(content) : null;
  const encryptedMediaUrl = mediaUrl ? encrypt(mediaUrl) : null;
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
      content: encryptedContent,
      type,
      mediaUrl: encryptedMediaUrl,
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
    content: encryptedContent,
    type,
    mediaUrl: encryptedMediaUrl,
    duration,
    fileSize,
  });

  return {
    message: 'Message sent successfully',
    data: message,
    statusCode: 200,
  };
};

exports.getAllChatsForUser = async userId => {
  const chats = await OneToOneChat.find({ participants: userId })
    .populate('participants', 'name username profilePicture')
    .populate({
      path: 'lastMessage',
      populate: {
        path: 'sender',
        select: 'name username profilePicture',
      },
    });

  console.log('Chats:', chats);

  const chatResults = await Promise.all(
    chats.map(async chat => {
      const unreadCount = await messageModel.countDocuments({
        chat: chat._id,
        receiver: userId,
        status: 'sent',
      });
      const messages = await messageModel.find({ chat: chat._id }).sort({ createdAt: -1 });
      const otherParticipant = chat.participants.find(p => p._id.toString() !== userId.toString());
      return {
        ...chat.toObject(),
        lastMessage: chat.lastMessage,
        unreadCount,
        messages: messages.map(message => ({
          ...message.toObject(),
          content: message.content ? decrypt(message.content) : null,
          mediaUrl: message.mediaUrl ? decrypt(message.mediaUrl) : null,
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

const {
  updateUserProfile,
  isUsernameAvailable,
  searchUser,
  addFriend,
  getAllChatsForUser,
  sendMessage,
  sendFriendRequest,
  acceptFriendRequest,
  getPendingFriendRequests,
  sendMessageService,
  uploadFile,
  uploadFiles,
  getAllOneToOneChats,
  getMedia,
  getAllFriends,
  readChat,
  getSentFriendRequests,
  getSuggestedUsers,
  getUserInfo,
  rejectFriendRequest,
  searchFriends,
} = require('../../services/users');
const ApiResponse = require('../../utils/apiResponse');
const { asyncHandler } = require('../../utils/asyncHandler');
const User = require('../../models/userModel');

exports.handleUserProfileUpdate = asyncHandler(async (req, res) => {
  const { id } = req.user;
  const result = await updateUserProfile(req.body, req.file, id);

  const { message, data, statusCode = 200 } = result;

  return res.status(200).json(new ApiResponse(statusCode, data, message));
});

exports.handleIsUsernameAvailable = asyncHandler(async (req, res) => {
  const { username } = req.query;

  const result = await isUsernameAvailable(username);

  const { message, data, statusCode = 200 } = result;

  return res.status(200).json(new ApiResponse(statusCode, data, message));
});

exports.handleUserSearch = asyncHandler(async (req, res) => {
  const { query } = req.query;
  const currentUserId = req.user._id;

  const result = await searchUser(query, currentUserId);

  const { message, data, statusCode = 200 } = result;

  return res.status(200).json(new ApiResponse(statusCode, data, message));
});

exports.handleSendFriendRequest = asyncHandler(async (req, res) => {
  const senderId = req.user.id;
  const { receiverId } = req.body;

  const result = await sendFriendRequest(senderId, receiverId);
  const { message, data, statusCode = 200 } = result;
  return res.status(200).json(new ApiResponse(statusCode, data, message));
});

exports.handleAcceptFriendRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;

  const result = await acceptFriendRequest(requestId);
  const { message, data, statusCode = 200 } = result;
  return res.status(200).json(new ApiResponse(statusCode, data, message));
});

exports.handleGetPendingFriendRequests = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const requests = await getPendingFriendRequests(userId);
  const { message, data, statusCode = 200 } = requests;

  return res.status(200).json(new ApiResponse(statusCode, data, message));
});

exports.handleSendMessage = asyncHandler(async (req, res) => {
  const { receiverId, content, type, mediaUrl, duration, fileSize } = req.body;

  const senderId = req.user.id;

  const result = await sendMessageService({
    senderId,
    receiverId,
    content,
    type,
    mediaUrl,
    duration,
    fileSize,
  });

  return res.status(200).json(new ApiResponse(result.statusCode, result.data, result.message));
});

exports.handleGetAllChats = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, per_page = 50, search = '' } = req.query;
  const filters = {
    search: search ? search.trim() : '',
    page: parseInt(page, 10),
    per_page: parseInt(per_page, 10),
  };

  const result = await getAllChatsForUser(userId, filters);

  return res.status(200).json(new ApiResponse(result.statusCode, result.data, result.message));
});

exports.handleUploadFiles = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json(new ApiResponse(400, null, 'No files were uploaded.'));
  }

  const result = await uploadFiles(req.files);
  const { message, data, statusCode = 200 } = result;

  return res.status(statusCode).json(new ApiResponse(statusCode, data, message));
});

exports.handleGetAllOneToOneChats = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const receiverId = req.params.id;

  const result = await getAllOneToOneChats(userId, receiverId);
  const { message, data, statusCode = 200 } = result;

  return res.status(statusCode).json(new ApiResponse(statusCode, data, message));
});

exports.handleGetMedia = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const receiverId = req.params.id;

  const result = await getMedia(userId, receiverId);

  const { message, data, statusCode = 200 } = result;

  return res.status(statusCode).json(new ApiResponse(statusCode, data, message));
});

exports.handleGetAllFriends = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { page = 1, per_page = 50, search = '' } = req.query;
  const filters = {
    search: search ? search.trim() : '',
    page: parseInt(page, 10),
    per_page: parseInt(per_page, 10),
  };

  const result = await getAllFriends(userId, filters);
  const { message, data, statusCode = 200 } = result;

  return res.status(statusCode).json(new ApiResponse(statusCode, data, message));
});

exports.handleReadChat = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const chatId = req.params.id;

  const result = await readChat(userId, chatId);
  const { message, data, statusCode = 200 } = result;

  return res.status(statusCode).json(new ApiResponse(statusCode, data, message));
});

exports.handleGetAllSentFriendRequests = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const requests = await getSentFriendRequests(userId);
  const { message, data, statusCode = 200 } = requests;
  return res.status(200).json(new ApiResponse(statusCode, data, message));
});

exports.checkPhoneNumbers = asyncHandler(async (req, res) => {
  let phoneNumbers = req.body.contacts;
  if (!Array.isArray(phoneNumbers)) {
    return res
      .status(400)
      .json({ success: false, message: 'Payload must be an array of phone numbers.' });
  }
  const coreNumbers = phoneNumbers.map(num => {
    num = num.toString().replace(/\s+/g, '');
    return num.startsWith('91') ? num.slice(2) : num;
  });
  const users = await User.find({ phoneNumber: { $in: coreNumbers } }).select('phoneNumber');
  const foundNumbers = new Set(users.map(u => u.phoneNumber));
  const result = {};

  phoneNumbers.forEach(num => {
    let core = num.toString().replace(/\s+/g, '');
    core = core.startsWith('91') ? core.slice(2) : core;
    result['91' + core] = foundNumbers.has(core);
  });
  const statusCode = 200;
  const message = 'Phone number check completed successfully.';
  return res.status(200).json(new ApiResponse(statusCode, result, message));
});

exports.handleGetSuggestedUsers = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const result = await getSuggestedUsers(userId);
  const { message, data, statusCode = 200 } = result;
  return res.status(statusCode).json(new ApiResponse(statusCode, data, message));
});

exports.handleGetUserInfo = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const result = await getUserInfo(userId);
  const { message, data, statusCode = 200 } = result;
  return res.status(statusCode).json(new ApiResponse(statusCode, data, message));
});

exports.handleRejectFriendRequest = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const result = await rejectFriendRequest(userId, id);
  const { message, data, statusCode = 200 } = result;
  return res.status(statusCode).json(new ApiResponse(statusCode, data, message));
});

exports.handleSearchFriends = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { search } = req.query;
  const result = await searchFriends(userId, search);
  const { message, data, statusCode = 200 } = result;
  return res.status(statusCode).json(new ApiResponse(statusCode, data, message));
});

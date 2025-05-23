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
  uploadFiles
} = require('../../services/users');
const ApiResponse = require('../../utils/apiResponse');
const { asyncHandler } = require('../../utils/asyncHandler');

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

  const result = await searchUser(query);

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

  console.log(requestId);

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

  const result = await sendMessageService({ senderId, receiverId, content, type, mediaUrl, duration, fileSize });

  return res.status(200).json(new ApiResponse(result.statusCode, result.data, result.message));
});

exports.handleGetAllChats = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const result = await getAllChatsForUser(userId);

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
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

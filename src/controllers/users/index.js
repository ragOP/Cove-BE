const { updateUserProfile, isUsernameAvailable, searchUser } = require('../../services/users');
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

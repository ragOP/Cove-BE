const { registerUser } = require('../../services/auth');
const ApiResponse = require('../../utils/apiResponse');
const { asyncHandler } = require('../../utils/asyncHandler');

exports.handleUserRegister = asyncHandler(async (req, res) => {
  const { phoneNumber, otp, FCMToken } = req.body;

  if (FCMToken === undefined || FCMToken === '' || FCMToken === null) {
    return res.status(400).json(new ApiResponse(400, null, 'FCM token is required'));
  }
  const result = await registerUser(phoneNumber, otp, FCMToken);

  const { message, data, statusCode = 200 } = result;

  return res.status(200).json(new ApiResponse(statusCode, data, message));
});

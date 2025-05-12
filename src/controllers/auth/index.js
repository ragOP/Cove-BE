const { registerUser } = require('../../services/auth');
const ApiResponse = require('../../utils/apiResponse');
const { asyncHandler } = require('../../utils/asyncHandler');

exports.handleUserRegister = asyncHandler(async (req, res) => {
  const { phoneNumber, otp } = req.body;

  const result = await registerUser(phoneNumber, otp);

  const { message, data, statusCode = 200 } = result;

  return res.status(200).json(new ApiResponse(statusCode, data, message));
});

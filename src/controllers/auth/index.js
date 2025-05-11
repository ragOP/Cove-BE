const { asyncHandler } = require('../../utils/asyncHandler');

exports.handleUserRegister = asyncHandler(async (req, res) => {
  const { mobileNumber, otp } = req.body;

  if (!mobileNumber || !otp) {
    return res.status(400).json({
      success: false,
      message: 'Mobile number and OTP are required',
    });
  }

  return res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      mobileNumber,
      otp,
    },
  });
});

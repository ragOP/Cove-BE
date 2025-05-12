const { checkUserExists, createUser } = require('../../repositories/auth');
const { OTP } = require('../../constants/otp/index');
const jwt = require('jsonwebtoken');

exports.registerUser = async (phoneNumber, otp) => {
  const isOtpValid = otp == OTP;
  if (!isOtpValid) {
    return {
      statusCode: 401,
      message: 'Invalid OTP',
      data: null,
    };
  }

  let user = await checkUserExists(phoneNumber);

  if (!user) {
    user = await createUser(phoneNumber);
    if (!user) {
      return {
        statusCode: 500,
        message: 'Failed to create user',
        data: null,
      };
    }
  }

  const token = jwt.sign({ id: user._id, role: 'user' }, process.env.JWT_SECRET);

  const statusCode = user.createdAt === user.updatedAt ? 201 : 200;

  return {
    statusCode,
    message: statusCode === 201 ? 'User registered successfully' : 'User logged in successfully',
    data: {
      user,
      token,
    },
  };
};

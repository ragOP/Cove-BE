const User = require('../../models/userModel');

exports.checkUserExists = async phoneNumber => {
  const user = await User.findOne({ phoneNumber });
  if (user) return user;
  return null;
};

exports.createUser = async (phoneNumber, FCMToken) => {
  const newUser = await User.create({
    phoneNumber,
    FCMToken,
  });
  return newUser;
};

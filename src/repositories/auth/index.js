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

exports.updateFCMToken = async (userId, FCMToken) => {
  const user = await User.findByIdAndUpdate(userId, { FCMToken }, { new: true });
  return user;
};
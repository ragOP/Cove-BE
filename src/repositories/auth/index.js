const User = require('../../models/userModel');

exports.checkUserExists = async phoneNumber => {
  const user = await User.findOne({ phoneNumber });
  if (user) return user;
  return null;
};

exports.createUser = async phoneNumber => {
  const newUser = await User.create({
    phoneNumber,
  });
  return newUser;
};

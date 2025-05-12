const bcrypt = require('bcrypt');
const User = require('../../models/userModel');

exports.updateUserProfile = async (data, id) => {
  const updateFields = {
    isProfileComplete: true,
  };

  if (data.name) updateFields.name = data.name;
  if (data.username) updateFields.username = data.username;
  if (data.email) updateFields.email = data.email;
  if (data.phoneNumber) updateFields.phoneNumber = data.phoneNumber;
  if (data.profilePicture) updateFields.profilePicture = data.profilePicture;
  if (data.deviceInfo) updateFields.deviceInfo = data.deviceInfo;
  if (data.about) updateFields.about = data.about;
  if (data.password) {
    const salt = await bcrypt.genSalt(10);
    updateFields.password = await bcrypt.hash(data.password, salt);
  }

  const user = await User.findByIdAndUpdate(id, updateFields, {
    new: true,
    runValidators: true,
  });

  return user;
};

exports.checkUserExists = async username => {
  console.log('checkUserExists', username);
  const user = await User.findOne({ username });
  console.log('checkUserExists', user);
  if (user) return user;
  return null;
};

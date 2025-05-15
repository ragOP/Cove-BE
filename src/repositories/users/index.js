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
  const user = await User.findOne({ username });
  if (user) return user;
  return null;
};

exports.allMatchingSearch = async query => {
  const users = await User.find({
    $or: [
      { username: { $regex: query, $options: 'i' } },                           
      { phoneNumber: { $regex: query, $options: 'i' } }
    ]
  }).select('-password -__v -createdAt -updatedAt');
  return users;
};

exports.findUserById = (id) => {
  return User.findById(id);
};

exports.addFriendToUser = async (userId, friendId) => {
  return User.findByIdAndUpdate(
    userId,
    { $addToSet: { friends: friendId } },
    { new: true }
  );
};
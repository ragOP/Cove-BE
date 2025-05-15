const bcrypt = require('bcrypt');
const User = require('../../models/userModel');
const FriendRequest = require('../../models/requestModel/index');
const OneToOneChat = require('../../models/chatModel/index');

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
      { phoneNumber: { $regex: query, $options: 'i' } },
    ],
  }).select('-password -__v -createdAt -updatedAt');
  return users;
};

exports.findUserById = id => {
  return User.findById(id);
};

exports.checkExistingRequest = async (userId, friendId) => {
  const existingRequest = await FriendRequest.findOne({
    $or: [
      { sender: userId, receiver: friendId },
      { sender: friendId, receiver: userId },
    ],
    status: 'pending',
  });
  return existingRequest;
};

exports.createNewFriendRequest = async (senderId, receiverId) => {
  const request = await FriendRequest.create({
    sender: senderId,
    receiver: receiverId,
    status: 'pending',
  });
  return request;
};

exports.getPendingFriendRequests = async userId => {
  const requests = await FriendRequest.find({
    receiver: userId,
    status: 'pending',
  }).populate('sender', 'name username profilePicture');
  return requests;
};

exports.findPendingFriendRequestBySender = async senderId => {
  return await FriendRequest.findOne({ sender: senderId, status: 'pending' });
};

exports.acceptFriendRequestById = async request => {
  request.status = 'accepted';
  return await request.save();
};

exports.addFriends = async (userId1, userId2) => {
  await User.findByIdAndUpdate(userId1, { $addToSet: { friends: userId2 } });
  await User.findByIdAndUpdate(userId2, { $addToSet: { friends: userId1 } });
};

exports.checkOneToOneChatExists = async (userId1, userId2) => {
  return await OneToOneChat.findOne({
    participants: { $all: [userId1, userId2] },
  });
};

exports.createOneToOneChat = async (userId1, userId2) => {
  return await OneToOneChat.create({
    participants: [userId1, userId2],
  });
};

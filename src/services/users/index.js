const { checkExact } = require('express-validator');
const { uploadSingleFile } = require('../../functions/cloudniary');
const { updateUserProfile, checkUserExists, allMatchingSearch } = require('../../repositories/users');

exports.updateUserProfile = async (data, file, id) => {
  const filePath = file ? file.path : null;
  const imagUrl = filePath ? await uploadSingleFile(filePath, 'images') : null;
  const deviceInfo = data.deviceInfo ? JSON.parse(data.deviceInfo) : null;
  const dataToUpdate = {
    ...data,
    profilePicture: imagUrl,
    deviceInfo: deviceInfo,
  };
  const result = await updateUserProfile(dataToUpdate, id);
  if (result) {
    return {
      message: 'User profile updated successfully',
      data: result,
      statusCode: 200,
    };
  } else {
    return {
      message: 'Failed to update user profile',
      data: null,
      statusCode: 500,
    };
  }
};

exports.isUsernameAvailable = async username => {
  const user = await checkUserExists(username);
  if (user) {
    return {
      message: 'Username is already taken',
      data: null,
      statusCode: 409,
    };
  } else {
    return {
      message: 'Username is available',
      data: null,
      statusCode: 200,
    };
  }
};

exports.searchUser = async query => {
  const users = await allMatchingSearch(query);
  if (users) {
    return {
      message: 'Users found',
      data: users,
      statusCode: 200,
    };
  } else {
    return {
      message: 'No users found',
      data: null,
      statusCode: 404,
    };
  }
};

const { uploadSingleFile } = require("../../functions/cloudniary");
const { updateUserProfile } = require("../../repositories/users");

exports.updateUserProfile = async (data, file, id) => {
  const filePath = file ? file.path : null;
  const imagUrl = filePath ? await uploadSingleFile(filePath, "images") : null;
  const deviceInfo = data.deviceInfo ? JSON.parse(data.deviceInfo) : null;
  const dataToUpdate = {
    ...data,
    profilePicture: imagUrl,
    deviceInfo: deviceInfo,
  };
  console.log("dataToUpdate", dataToUpdate);
    console.log("id", id);
  const result = await updateUserProfile(dataToUpdate, id);
  if (result) {
    return {
      message: "User profile updated successfully",
      data: result,
      statusCode: 200,
    };
  } else {
    return {
      message: "Failed to update user profile",
      data: null,
      statusCode: 500,
    };
  }
};

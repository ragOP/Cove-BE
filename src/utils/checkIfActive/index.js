exports.checkIfActive = lastMessageDate => {
  if (!lastMessageDate) return false;
  const currentDate = new Date();
  const timeDifference = currentDate - lastMessageDate;
  const daysDifference = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
  const isActive = daysDifference < 7;
  return isActive;
};

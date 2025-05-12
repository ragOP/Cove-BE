const jwt = require('jsonwebtoken');
const User = require('../../models/userModel');

const user = async (req, res, next) => {
  try {
    let token = '';
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(400).json({ message: 'You are not logged in. Please login to get access' });
    }

    const data = jwt.verify(token, process.env.JWT_SECRET);
    if (!data) {
      return res.status(400).json({ message: 'You are not logged in. Please login to get access' });
    }
    if (data.role !== 'user') {
      return res.status(400).json({ message: 'Only user will have access.' });
    }
    const user = await User.findById(data.id);
    if (!user) {
      return res.status(400).json({ message: 'You are not logged in. Please login to get access' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(400).json({ message: error });
  }
};

module.exports = {
  user,
};

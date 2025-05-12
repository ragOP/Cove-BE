const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const deviceInfoSchema = new mongoose.Schema({
  uniqueId: { type: String },
  type: { type: String, enum: ['ios', 'android', 'web'] },
  lastActive: { type: Date, default: Date.now },
  pushToken: { type: String },
});

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    username: {
      type: String,
      lowercase: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      select: false,
    },
    profilePicture: {
      type: String,
      default: '',
    },
    about: {
      type: String,
      default: 'Hey there! I am using the cove.',
      trim: true,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
    },
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    socketId: {
      type: String,
    },
    FCMToken: {
      type: String,
    },
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
    deviceInfo: deviceInfoSchema,
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (plainPassword) {
  return await bcrypt.compare(plainPassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;

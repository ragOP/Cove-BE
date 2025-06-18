const { body } = require('express-validator');

exports.validateMobileAndOTP = [
  body('phoneNumber')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\d{10}$/)
    .withMessage('Phone number must be exactly 10 digits'),

  body('otp')
    .notEmpty()
    .withMessage('OTP is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits'),
];

exports.validateUserProfileUpdate = [
  body('name').optional().isString().withMessage('Name must be a string'),

  body('username').optional().isAlphanumeric().withMessage('Username must be alphanumeric'),

  body('email').optional().isEmail().withMessage('Email must be valid'),

  body('about').optional().isString().withMessage('About must be a string'),

  body('profilePicture').optional().isURL().withMessage('Profile picture must be a valid URL'),

  body('deviceInfo.uniqueId').optional().isString(),

  body('deviceInfo.type')
    .optional()
    .isIn(['ios', 'android', 'web'])
    .withMessage('Device type must be ios, android, or web'),

  body('FCMToken').optional().isString(),
  body('deviceInfo.pushToken').optional().isString(),
];

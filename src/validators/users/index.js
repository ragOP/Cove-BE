const { query } = require('express-validator');
const { body } = require('express-validator');

exports.validateUsernameQuery = [
  query('username')
    .notEmpty()
    .withMessage('Username is required')
    .isAlphanumeric()
    .withMessage('Username must be alphanumeric')
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be between 3 and 20 characters'),
];

exports.validateUserSearch = [
  query('query')
    .trim()
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters long'),
];

exports.validateSendMessage = [
  body('receiverId')
    .notEmpty()
    .withMessage('Receiver ID is required')
    .isMongoId()
    .withMessage('Invalid receiver ID format'),

  body('content')
    .notEmpty()
    .withMessage('Message content is required')
    .isString()
    .withMessage('Message content must be a string'),

  body('type')
    .notEmpty()
    .withMessage('Message type is required')
    .isIn(['text', 'text-image', 'document', 'voiceNote', 'audio', 'video', 'image'])
    .withMessage('Invalid message type'),

  body('mediaUrl')
    .optional()
    .isURL()
    .withMessage('Media URL must be a valid URL'),

  body('duration')
    .optional()
    .isNumeric()
    .withMessage('Duration must be a number'),

  body('fileSize')
    .optional()
    .isNumeric()
    .withMessage('File size must be a number'),
];

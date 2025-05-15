const express = require('express');
const multer = require('multer');
const { handleUserProfileUpdate, handleIsUsernameAvailable, handleUserSearch } = require('../../controllers/users');
const { validateUserProfileUpdate } = require('../../validators/auth');
const { validateRequest } = require('../../middleware/validateRequest');
const { storage } = require('../../config/multer/index');
const { user } = require('../../middleware/protectedRoute');
const { validateUsernameQuery, validateUserSearch } = require('../../validators/users');
const router = express.Router();

const upload = multer({ storage: storage });

/**
 * @swagger
 * /api/user/update-profile:
 *   patch:
 *     summary: Update user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               username:
 *                 type: string
 *                 example: johndoe123
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: MyStrongPassword123
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *               about:
 *                 type: string
 *                 example: I love chatting on Cove!
 *               deviceInfo:
 *                 type: object
 *                 example: '{"uniqueId":"abc123xyz","type":"android","pushToken":"push-token-example"}'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: Profile updated successfully
 *                 data:
 *                   type: object
 *                   description: Updated user data
 */
router
  .route('/update-profile')
  .patch(
    user,
    validateUserProfileUpdate,
    upload.single('profilePicture'),
    validateRequest,
    handleUserProfileUpdate
  );

/**
 * @swagger
 * /api/user/is-username-available:
 *   get:
 *     summary: Check if username is available
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *           example: johndoe123
 *     responses:
 *       200:
 *         description: Username availability status
 */
router
  .route('/is-username-available')
  .get(user, validateUsernameQuery, validateRequest, handleIsUsernameAvailable);

/**
 * @swagger
 * /api/user/search:
 *   get:
 *     summary: Search for users
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *           example: johndoe
 *     responses:
 *       200:
 *         description: Search results
 */ 
router.route('/search').get(user, validateUserSearch, validateRequest, handleUserSearch);
module.exports = router;

const express = require('express');
const multer = require('multer');
const {
  handleUserProfileUpdate,
  handleIsUsernameAvailable,
  handleUserSearch,
  handleGetAllChats,
  handleSendMessage,
  handleSendFriendRequest,
  handleAcceptFriendRequest,
  handleGetPendingFriendRequests,
  handleUploadFiles,
  handleGetAllOneToOneChats,
  handleGetMedia,
  handleGetAllFriends,
  handleReadChat,
  handleGetAllSentFriendRequests,
  checkPhoneNumbers,
  handleGetSuggestedUsers,
  handleGetUserInfo,
  handleRejectFriendRequest,
  handleSearchFriends,
  handleMarkAsSensitive,
  handledeleteMutipleMessages,
  handleGetUserGallery,
  handleMarksAsUnsensitive
} = require('../../controllers/users');
const { validateUserProfileUpdate } = require('../../validators/auth');
const { validateRequest } = require('../../middleware/validateRequest');
const { storage } = require('../../config/multer/index');
const { user } = require('../../middleware/protectedRoute');
const {
  validateUsernameQuery,
  validateUserSearch,
  validateSendMessage,
} = require('../../validators/users');
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
  .get(validateUsernameQuery, validateRequest, handleIsUsernameAvailable);

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
/**
 * @swagger
 * /api/user/add-friend:
 *   post:
 *     summary: Send a friend request
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               receiverId:
 *                 type: string
 *                 example: 60d5f484f1c2b8b8a4e4e4e4
 *     responses:
 *       200:
 *         description: Friend request sent successfully
 */
router.route('/add-friend').post(user, handleSendFriendRequest);
/**
 * @swagger
 * /api/user/friend-requests/{requestId}/accept:
 *   patch:
 *     summary: Accept a friend request
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *           example: 60d5f484f1c2b8b8a4e4e4e4
 *     responses:
 *       200:
 *         description: Friend request accepted successfully
 */
router.patch('/friend-requests/:requestId/accept', user, handleAcceptFriendRequest);
/**
 * @swagger
 * /api/user/friend-requests/pending:
 *   get:
 *     summary: Get pending friend requests
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending friend requests
 */
router.get('/friend-requests/pending', user, handleGetPendingFriendRequests);
/**
 * @swagger
 * /api/user/friend-requests/sent:
 *   get:
 *     summary: Get all sent friend requests
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all sent friend requests
 */
router.get('/friend-requests/sent', user, handleGetAllSentFriendRequests);
/**
 * @swagger
 * /api/user/messages/send-message:
 *   post:
 *     summary: Create a message and add it to a one-to-one chat
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - senderId
 *               - receiverId
 *               - content
 *               - type
 *             properties:
 *               senderId:
 *                 type: string
 *                 description: ID of the sender
 *               receiverId:
 *                 type: string
 *                 description: ID of the receiver
 *               content:
 *                 type: string
 *                 description: Text content or media URL
 *               type:
 *                 type: string
 *                 enum: [text, text-image, document, voiceNote, audio, video]
 *                 description: Type of the message
 *               mediaUrl:
 *                 type: string
 *                 format: uri
 *                 description: Media URL (for media types)
 *               fileName:
 *                 type: string
 *                 description: File name (for documents)
 *               fileSize:
 *                 type: number
 *                 description: File size in bytes (for documents)
 *               duration:
 *                 type: number
 *                 description: Duration in seconds (for audio/video/voiceNote)
 *     responses:
 *       200:
 *         description: Message created and added to chat successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   description: Message ID
 *                 sender:
 *                   type: string
 *                 receiver:
 *                   type: string
 *                 content:
 *                   type: string
 *                 type:
 *                   type: string
 *                 mediaUrl:
 *                   type: string
 *                 fileName:
 *                   type: string
 *                 fileSize:
 *                   type: number
 *                 duration:
 *                   type: number
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Bad Request - Missing or invalid data
 *       500:
 *         description: Server Error
 */

router
  .route('/messages/send-message')
  .post(user, validateSendMessage, validateRequest, handleSendMessage);

/**
 * @swagger
 * /api/user/messages/get-all-chats:
 *   get:
 *     summary: Get all chats for a user
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all chats
 */

router.route('/messages/get-all-chats').get(user, handleGetAllChats);

/**
 * @swagger
 * /api/user/upload-files:
 *   post:
 *     summary: Upload multiple files
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Multiple files to upload (max 10 files, 100MB each)
 *     responses:
 *       200:
 *         description: Files uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       originalName:
 *                         type: string
 *                       fileName:
 *                         type: string
 *                       fileType:
 *                         type: string
 *                       fileSize:
 *                         type: number
 *                       url:
 *                         type: string
 *       400:
 *         description: Bad request - Invalid file type or size
 *       500:
 *         description: Server error
 */
router.route('/upload-files').post(user, upload.array('files', 10), handleUploadFiles);

/**
 * @swagger
 * /api/user/one-to-one-chat/{id}:
 *   get:
 *     summary: Get all one-to-one chats for a user
 *     tags: [One-to-One Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: 60d5f484f1c2b8b8a4e4e4e4
 *     responses:
 *       200:
 *         description: List of all one-to-one chats
 */

router.route('/one-to-one-chat/:id').get(user, handleGetAllOneToOneChats);

/**
 * @swagger
 * /api/user/one-to-one-chat/{id}/media:
 *   get:
 *     summary: Get media for a one-to-one chat
 *     tags: [One-to-One Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: 60d5f484f1c2b8b8a4e4e4e4
 *     responses:
 *       200:
 *         description: List of media for a one-to-one chat
 */

router.route('/one-to-one-chat/:id/media').get(user, handleGetMedia);

/**
 * @swagger
 * /api/user/get-all-friends:
 *   get:
 *     summary: Get all friends for a user
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *           example: johndoe
 *     responses:
 *       200:
 *         description: List of all friends
 */

router.route('/get-all-friends').get(user, handleGetAllFriends);

/**
 * @swagger
 * /api/user/read-chat/{id}:
 *   patch:
 *     summary: Read a chat
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: 60d5f484f1c2b8b8a4e4e4e4
 *     responses:
 *       200:
 *         description: Chat read successfully
 */

router.route('/read-chat/:id').patch(user, handleReadChat);

/**
 * @swagger
 * /api/user/check-phone-numbers:
 *   post:
 *     summary: Check if phone numbers exist in users
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: string
 *               example: "919876543211"
 *     responses:
 *       200:
 *         description: Phone number availability map
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 type: boolean
 */

router.post('/check-contacts', user, checkPhoneNumbers);

/**
 * @swagger
 * /api/user/suggested-users:
 *   get:
 *     summary: Get suggested users (currently returns all users as contacts)
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of suggested users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   username:
 *                     type: string
 *                   phoneNumber:
 *                     type: string
 *                   profilePicture:
 *                     type: string
 */
router.get('/suggested-users', user, handleGetSuggestedUsers);

/**
 * @swagger
 * /api/user/user-info/{id}:
 *   get:
 *     summary: Get user info
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters: 
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: 60d5f484f1c2b8b8a4e4e4e4
 *     responses:
 *       200:
 *         description: User info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/user-info/:id', user, handleGetUserInfo);

/**
 * @swagger
 * /api/user/reject-friend-request/{id}:
 *   delete:
 *     summary: Reject a friend request
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: 60d5f484f1c2b8b8a4e4e4e4
 *     responses:
 *       200:
 *         description: Friend request rejected successfully
 */
router.delete('/reject-friend-request/:id', user, handleRejectFriendRequest);

/**
 * @swagger
 * /api/user/search-friends:
 *   get:
 *     summary: Search for friends
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         required: true
 *         schema:
 *           type: string
 *           example: johndoe
 *     responses:
 *       200:
 *         description: List of friends
 */
router.get('/search-friends', user, handleSearchFriends);

/**
 * @swagger
 * /api/user/mark-as-sensitive:
 *   post:
 *     summary: Mark as sensitive
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   example: 60d5f484f1c2b8b8a4e4e4e4
 *     responses:
 *       200: 
 *         description: Users marked as sensitive successfully
 */
router.route('/mark-as-sensitive').post(user, handleMarkAsSensitive);

/**
 * @swagger
 * /api/user/delete-messages:
 *   post:
 *     summary: Delete multiple messages
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   example: 60d5f484f1c2b8b8a4e4e4e4
 *               conversationId:
 *                 type: string
 *                 example: 60d5f484f1c2b8b8a4e4e4e4
 *     responses:
 *       200:
 *         description: Messages deleted successfully
 */

router.route('/delete-messages').post(user, handledeleteMutipleMessages);

/**
 * @swagger
 * /api/user/get-user-gallery:
 *   get:
 *     summary: Get user gallery
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: number
 *           example: 1
 *       - in: query
 *         name: per_page
 *         required: false
 *         schema:
 *           type: number
 *           example: 10
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *           example: johndoe
 *     responses:
 *       200:
 *         description: User gallery retrieved successfully
 */

router.route('/get-user-gallery').get(user, handleGetUserGallery);

/**
 * @swagger
 * /api/user/marks-as-unsensitive:
 *   post:
 *     summary: Marks as unsensitive
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   example: 60d5f484f1c2b8b8a4e4e4e4
 *     responses:
 *       200:
 *         description: Users marked as unsensitive successfully
 */

router.route('/marks-as-unsensitive').post(user, handleMarksAsUnsensitive);

module.exports = router;

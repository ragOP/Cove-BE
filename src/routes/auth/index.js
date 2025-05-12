const express = require('express');
const { handleUserRegister } = require('../../controllers/auth');
const { validateMobileAndOTP } = require('../../validators/auth');
const { validateRequest } = require('../../middleware/validateRequest');
const router = express.Router();

/**
 * @swagger
 * /api/auth/user:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 example: '1234567890'
 *               otp:
 *                 type: string
 *                 example: '123456'
 *     responses:
 *       201:
 *         description: User registered successfully
 */
router.route('/user').post(validateMobileAndOTP, validateRequest, handleUserRegister);

module.exports = router;

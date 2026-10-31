const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticate = require('../middleware/authenticate');
const rateLimiters = require('../middleware/rateLimiters');

router.post('/register', rateLimiters.credential, authController.register);
router.post('/login', rateLimiters.credential, authController.login);
router.post('/verify-email', rateLimiters.otp, authController.verifyEmail);
router.post('/resend-verification', rateLimiters.otp, rateLimiters.perEmail, authController.resendVerification);
router.post('/forgot-password', rateLimiters.otp, rateLimiters.perEmail, authController.forgotPassword);
router.post('/verify-reset-otp', rateLimiters.otp, authController.verifyResetOtp);
router.post('/reset-password', rateLimiters.otp, authController.resetPassword);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.me);

module.exports = router;

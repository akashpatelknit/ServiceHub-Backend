import express from 'express';
import * as vendorAuthController from '../controllers/vendorAuthController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateRegistration, validateLogin, validateOTP, validateEmail } from '../middleware/validation.js';

const router = express.Router();

// ─────────────────────────────────────────────
// PUBLIC ROUTES (No authentication required)
// ─────────────────────────────────────────────

/**
 * @route   POST /api/auth/vendor/register
 * @desc    Register new vendor
 * @access  Public
 */
router.post('/register', validateRegistration, vendorAuthController.register);

/**
 * @route   POST /api/auth/vendor/verify-email
 * @desc    Verify email with OTP after registration
 * @access  Public
 */
router.post('/verify-email', validateOTP, vendorAuthController.verifyEmailOTP);

/**
 * @route   POST /api/auth/vendor/login
 * @desc    Login vendor (sends OTP to email)
 * @access  Public
 */
router.post('/login', validateLogin, vendorAuthController.login);

/**
 * @route   POST /api/auth/vendor/verify-login
 * @desc    Verify login OTP
 * @access  Public
 */
router.post('/verify-login', validateOTP, vendorAuthController.verifyLoginOTP);

/**
 * @route   POST /api/auth/vendor/resend-otp
 * @desc    Resend OTP to email
 * @access  Public
 */
router.post('/resend-otp', validateEmail, vendorAuthController.resendOTP);

/**
 * @route   POST /api/auth/vendor/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', vendorAuthController.refreshToken);

/**
 * @route   POST /api/auth/vendor/check-email
 * @desc    Check if email exists
 * @access  Public
 */
router.post('/check-email', validateEmail, vendorAuthController.checkEmail);

// ─────────────────────────────────────────────
// PROTECTED ROUTES (Authentication required)
// ─────────────────────────────────────────────

/**
 * @route   GET /api/auth/vendor/me
 * @desc    Get current vendor info
 * @access  Private
 */
router.get('/me', protect, vendorAuthController.getMe);

/**
 * @route   POST /api/auth/vendor/logout
 * @desc    Logout vendor
 * @access  Private
 */
router.post('/logout', protect, vendorAuthController.logout);

export default router;

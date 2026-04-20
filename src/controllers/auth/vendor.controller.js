import { User } from '../../models/auth/User.js';
import { vendorAuthService } from '../../services/auth/vendor.auth.service.js';

/**
 * @route   POST /api/auth/vendor/register
 * @desc    Register new vendor with email and password
 * @access  Public
 */
export const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: email, password, firstName, lastName',
      });
    }

    const result = await vendorAuthService.register({
      email,
      password,
      firstName,
      lastName,
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @route   POST /api/auth/vendor/verify-email
 * @desc    Verify email with OTP after registration
 * @access  Public
 */
export const verifyEmailOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required',
      });
    }

    const result = await vendorAuthService.verifyEmailOTP({ email, otp });

    // Set cookies
    res.cookie('accessToken', result.data.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refreshToken', result.data.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @route   POST /api/auth/vendor/login
 * @desc    Login with email and password, sends OTP
 * @access  Public
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const result = await vendorAuthService.login({ email, password });

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @route   POST /api/auth/vendor/verify-login
 * @desc    Verify login OTP
 * @access  Public
 */
export const verifyLoginOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required',
      });
    }

    const result = await vendorAuthService.verifyLoginOTP({ email, otp });

    // Set cookies
    res.cookie('accessToken', result.data.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refreshToken', result.data.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @route   POST /api/auth/vendor/resend-otp
 * @desc    Resend OTP
 * @access  Public
 */
export const resendOTP = async (req, res) => {
  try {
    const { email, purpose = 'LOGIN' } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const validPurposes = ['LOGIN', 'REGISTRATION', 'EMAIL_VERIFY'];
    if (!validPurposes.includes(purpose)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid purpose. Must be LOGIN, REGISTRATION, or EMAIL_VERIFY',
      });
    }

    const result = await vendorAuthService.resendOTP({ email, purpose });

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @route   POST /api/auth/vendor/refresh
 * @desc    Refresh access token
 * @access  Public
 */
export const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required',
      });
    }

    const result = await vendorAuthService.refreshToken({ refreshToken });

    // Set new access token cookie
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @route   POST /api/auth/vendor/logout
 * @desc    Logout vendor
 * @access  Private
 */
export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (refreshToken) {
      await vendorAuthService.logout({ refreshToken });
    }

    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @route   GET /api/auth/vendor/me
 * @desc    Get current vendor info
 * @access  Private
 */
export const getMe = async (req, res) => {
  try {
    const userId = req.user.userId; // From auth middleware

    const user = await User.findById(userId).select('-passwordHash');
    const profile = await Profile.findOne({ userId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user,
        profile,
        nextStep: vendorAuthService.determineNextStep(user, profile),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @route   POST /api/auth/vendor/check-email
 * @desc    Check if email is already registered
 * @access  Public
 */
export const checkEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    res.status(200).json({
      success: true,
      data: {
        exists: !!user,
        isEmailVerified: user?.isEmailVerified || false,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

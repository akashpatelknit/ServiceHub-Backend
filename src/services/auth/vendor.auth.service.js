import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Profile } from '../models/Profile.js';
import { Session } from '../models/Session.js';
import { VerificationToken } from '../models/VerificationToken.js';
import { AuthProvider } from '../models/AuthProvider.js';
import { otpService } from './otpService.js';
import { emailService } from './emailService.js';

class VendorAuthService {
  /**
   * Step 1: Register vendor with email and password
   */
  async register({ email, password, firstName, lastName }) {
    try {
      // Normalize email
      email = email.toLowerCase().trim();

      // Check if email already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error('Email already registered. Please login instead.');
      }

      // Validate password strength
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user
      const user = await User.create({
        email,
        passwordHash,
        userType: 'VENDOR',
        status: 'PENDING', // Will be ACTIVE after email verification
        isEmailVerified: false,
        isPhoneVerified: false,
      });

      // Create auth provider record
      await AuthProvider.create({
        userId: user._id,
        provider: 'LOCAL',
        providerUserId: email,
      });

      // Create empty profile
      const profile = await Profile.create({
        userId: user._id,
        type: 'VENDOR',
        firstName,
        lastName,
      });

      // Send OTP for email verification
      const otpResult = await otpService.sendOTP({
        userId: user._id,
        email: user.email,
        purpose: 'REGISTRATION',
      });

      console.log('✅ Vendor registered successfully:', user.email);

      return {
        success: true,
        message: 'Registration successful. Please verify your email with the OTP sent.',
        data: {
          userId: user._id,
          email: user.email,
          nextStep: 'VERIFY_EMAIL_OTP',
          ...(process.env.NODE_ENV === 'development' && { devOTP: otpResult.otp }),
        },
      };
    } catch (error) {
      console.error('❌ Registration failed:', error);
      throw error;
    }
  }

  /**
   * Step 2: Verify email with OTP (after registration)
   */
  async verifyEmailOTP({ email, otp }) {
    try {
      email = email.toLowerCase().trim();

      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error('User not found');
      }

      if (user.isEmailVerified) {
        throw new Error('Email is already verified');
      }

      // Verify OTP
      await otpService.verifyOTP({
        userId: user._id,
        otp,
        purpose: 'REGISTRATION',
      });

      // Mark email as verified and activate account
      user.isEmailVerified = true;
      user.emailVerifiedAt = new Date();
      user.status = 'ACTIVE';
      await user.save();

      // Generate tokens
      const tokens = await this.generateTokens(user);

      console.log('✅ Email verified for:', user.email);

      return {
        success: true,
        message: 'Email verified successfully. You can now login.',
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user: {
            id: user._id,
            email: user.email,
            userType: user.userType,
            isEmailVerified: user.isEmailVerified,
          },
          nextStep: 'COMPLETE_PROFILE',
        },
      };
    } catch (error) {
      console.error('❌ Email verification failed:', error);
      throw error;
    }
  }

  /**
   * Step 3: Login with email and password
   */
  async login({ email, password }) {
    try {
      email = email.toLowerCase().trim();

      // Find user with password
      const user = await User.findOne({ email }).select('+passwordHash');
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check if account is blocked
      if (user.status === 'BLOCKED' || user.status === 'SUSPENDED') {
        throw new Error('Your account has been blocked. Please contact support.');
      }

      // Check if account is locked
      if (user.isLocked) {
        const lockTime = Math.ceil((user.lockUntil - Date.now()) / (1000 * 60));
        throw new Error(`Account is locked. Try again in ${lockTime} minutes.`);
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        await user.incrementLoginAttempts();
        throw new Error('Invalid email or password');
      }

      // Reset login attempts on successful password verification
      await user.resetLoginAttempts();

      // Check if email is verified
      if (!user.isEmailVerified) {
        // Send OTP for verification
        const otpResult = await otpService.sendOTP({
          userId: user._id,
          email: user.email,
          purpose: 'EMAIL_VERIFY',
        });

        return {
          success: false,
          requiresVerification: true,
          message: 'Email not verified. OTP has been sent to your email.',
          data: {
            userId: user._id,
            email: user.email,
            nextStep: 'VERIFY_EMAIL_OTP',
            ...(process.env.NODE_ENV === 'development' && { devOTP: otpResult.otp }),
          },
        };
      }

      // Send login OTP
      const otpResult = await otpService.sendOTP({
        userId: user._id,
        email: user.email,
        purpose: 'LOGIN',
      });

      console.log('✅ Login OTP sent to:', user.email);

      return {
        success: true,
        requiresOTP: true,
        message: 'OTP sent to your email. Please verify to complete login.',
        data: {
          userId: user._id,
          email: user.email,
          nextStep: 'VERIFY_LOGIN_OTP',
          ...(process.env.NODE_ENV === 'development' && { devOTP: otpResult.otp }),
        },
      };
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    }
  }

  /**
   * Step 4: Verify login OTP
   */
  async verifyLoginOTP({ email, otp }) {
    try {
      email = email.toLowerCase().trim();

      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error('User not found');
      }

      // Verify OTP
      await otpService.verifyOTP({
        userId: user._id,
        otp,
        purpose: 'LOGIN',
      });

      // Update last login
      user.lastLoginAt = new Date();
      await user.save();

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Get profile with completion status
      const profile = await Profile.findOne({ userId: user._id });

      // Determine next step
      const nextStep = this.determineNextStep(user, profile);

      console.log('✅ Login successful for:', user.email);

      return {
        success: true,
        message: 'Login successful',
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user: {
            id: user._id,
            email: user.email,
            userType: user.userType,
            isEmailVerified: user.isEmailVerified,
            status: user.status,
          },
          profile: {
            completionPercentage: profile?.completionPercentage || 0,
            isVerified: profile?.isVerified || false,
          },
          nextStep,
        },
      };
    } catch (error) {
      console.error('❌ Login OTP verification failed:', error);
      throw error;
    }
  }

  /**
   * Resend OTP
   */
  async resendOTP({ email, purpose = 'LOGIN' }) {
    try {
      email = email.toLowerCase().trim();

      const user = await User.findOne({ email });
      if (!user) {
        throw new Error('User not found');
      }

      const otpResult = await otpService.resendOTP({
        userId: user._id,
        email: user.email,
        purpose,
      });

      return {
        success: true,
        message: 'OTP has been resent to your email',
        ...(process.env.NODE_ENV === 'development' && { devOTP: otpResult.otp }),
      };
    } catch (error) {
      console.error('❌ Resend OTP failed:', error);
      throw error;
    }
  }

  /**
   * Generate JWT tokens
   */
  async generateTokens(user) {
    // Access token (short-lived)
    const accessToken = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        userType: user.userType,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m' }
    );

    // Refresh token (long-lived)
    const refreshToken = jwt.sign(
      {
        userId: user._id,
        type: 'refresh',
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d' }
    );

    // Hash refresh token before storing
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Store session
    await Session.create({
      userId: user._id,
      refreshTokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    return { accessToken, refreshToken };
  }

  /**
   * Refresh access token
   */
  async refreshToken({ refreshToken }) {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

      // Hash the refresh token
      const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

      // Find session
      const session = await Session.findOne({
        userId: decoded.userId,
        refreshTokenHash,
        isRevoked: false,
      });

      if (!session) {
        throw new Error('Invalid refresh token');
      }

      if (session.expiresAt < Date.now()) {
        await session.deleteOne();
        throw new Error('Refresh token expired');
      }

      // Get user
      const user = await User.findById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate new access token
      const accessToken = jwt.sign(
        {
          userId: user._id,
          email: user.email,
          userType: user.userType,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m' }
      );

      return {
        success: true,
        accessToken,
      };
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Logout
   */
  async logout({ refreshToken }) {
    try {
      const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

      // Revoke session
      await Session.updateOne({ refreshTokenHash }, { isRevoked: true });

      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      console.error('❌ Logout failed:', error);
      throw error;
    }
  }

  /**
   * Determine next step in vendor journey
   */
  determineNextStep(user, profile) {
    // Check email verification
    if (!user.isEmailVerified) {
      return 'VERIFY_EMAIL';
    }

    // Check profile completion
    if (!profile || profile.completionPercentage < 100) {
      return 'COMPLETE_PROFILE';
    }

    // Profile is complete - can now proceed to KYC
    return 'PROCEED_TO_KYC';
  }
}

export const vendorAuthService = new VendorAuthService();

import crypto from 'crypto';
import { VerificationToken } from '../models/VerificationToken.js';
import { emailService } from './emailService.js';

class OTPService {
  generateOTP() {
    // Generate random 6-digit number
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    return otp;
  }

  hashOTP(otp) {
    return crypto.createHash('sha256').update(otp.toString()).digest('hex');
  }

  async sendOTP({ userId, email, purpose = 'LOGIN' }) {
    try {
      // Check rate limit: Max 3 OTPs per 15 minutes
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      const recentOTPs = await VerificationToken.countDocuments({
        userId,
        type: 'EMAIL_OTP',
        createdAt: { $gte: fifteenMinutesAgo },
      });

      if (recentOTPs >= 3) {
        throw new Error('Too many OTP requests. Please try again after 15 minutes.');
      }

      // Generate OTP
      const otp = this.generateOTP();
      const otpHash = this.hashOTP(otp);

      // Delete any existing OTPs for this user and purpose
      await VerificationToken.deleteMany({
        userId,
        type: 'EMAIL_OTP',
        purpose,
      });

      // Store OTP in database
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await VerificationToken.create({
        userId,
        type: 'EMAIL_OTP',
        tokenHash: otpHash,
        expiresAt,
        purpose,
        isUsed: false,
        attempts: 0,
      });

      // Send OTP via email
      await emailService.sendOTP({
        email,
        otp,
        purpose,
      });

      console.log(`✅ OTP sent to ${email} for ${purpose}`);

      // In development, return OTP for testing
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔧 [DEV] OTP: ${otp}`);
        return { success: true, otp }; // Only in dev!
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send OTP:', error);
      throw error;
    }
  }

  async verifyOTP({ userId, otp, purpose = 'LOGIN' }) {
    try {
      const otpHash = this.hashOTP(otp);

      // Find the OTP token
      const token = await VerificationToken.findOne({
        userId,
        type: 'EMAIL_OTP',
        purpose,
        isUsed: false,
      }).select('+tokenHash');

      if (!token) {
        throw new Error('OTP not found or already used');
      }

      // Check if expired
      if (token.isExpired()) {
        await token.deleteOne();
        throw new Error('OTP has expired. Please request a new one.');
      }

      // Check attempt limit
      if (!token.canAttempt()) {
        await token.deleteOne();
        throw new Error('Too many failed attempts. Please request a new OTP.');
      }

      // Verify OTP
      if (token.tokenHash !== otpHash) {
        await token.incrementAttempts();
        throw new Error(`Invalid OTP. ${5 - token.attempts - 1} attempts remaining.`);
      }

      // Mark as used
      await token.markAsUsed();

      console.log(`✅ OTP verified for user ${userId}`);

      return { success: true };
    } catch (error) {
      console.error('❌ OTP verification failed:', error);
      throw error;
    }
  }

  async resendOTP({ userId, email, purpose = 'LOGIN' }) {
    try {
      // Check if last OTP was sent less than 1 minute ago
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      const recentOTP = await VerificationToken.findOne({
        userId,
        type: 'EMAIL_OTP',
        purpose,
        createdAt: { $gte: oneMinuteAgo },
      });

      if (recentOTP) {
        throw new Error('Please wait 1 minute before requesting a new OTP.');
      }

      // Send new OTP
      return await this.sendOTP({ userId, email, purpose });
    } catch (error) {
      console.error('❌ Failed to resend OTP:', error);
      throw error;
    }
  }

  async checkOTPStatus({ userId, purpose = 'LOGIN' }) {
    try {
      const token = await VerificationToken.findOne({
        userId,
        type: 'EMAIL_OTP',
        purpose,
        isUsed: false,
      });

      if (!token) {
        return {
          exists: false,
          message: 'No active OTP found',
        };
      }

      if (token.isExpired()) {
        await token.deleteOne();
        return {
          exists: false,
          message: 'OTP has expired',
        };
      }

      const secondsRemaining = Math.floor((token.expiresAt - Date.now()) / 1000);

      return {
        exists: true,
        expiresAt: token.expiresAt,
        secondsRemaining,
        attemptsRemaining: 5 - token.attempts,
      };
    } catch (error) {
      console.error('❌ Failed to check OTP status:', error);
      throw error;
    }
  }

  async cleanupExpiredOTPs() {
    try {
      const result = await VerificationToken.deleteMany({
        type: 'EMAIL_OTP',
        expiresAt: { $lt: new Date() },
      });

      console.log(`🧹 Cleaned up ${result.deletedCount} expired OTPs`);
      return result.deletedCount;
    } catch (error) {
      console.error('❌ Failed to cleanup OTPs:', error);
      throw error;
    }
  }

  async cleanupUsedOTPs() {
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const result = await VerificationToken.deleteMany({
        type: 'EMAIL_OTP',
        isUsed: true,
        usedAt: { $lt: yesterday },
      });

      console.log(`🧹 Cleaned up ${result.deletedCount} used OTPs`);
      return result.deletedCount;
    } catch (error) {
      console.error('❌ Failed to cleanup used OTPs:', error);
      throw error;
    }
  }
}

export const otpService = new OTPService();

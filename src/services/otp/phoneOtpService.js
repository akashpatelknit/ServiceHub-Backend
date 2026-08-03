import axios from 'axios';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import NodeCache from 'node-cache';
import { ApiError } from '../../utils/index.js';
import { ERROR_MESSAGES, HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import { SMSService } from '../sms/smsService.js';

const smsService = new SMSService();

class OTPService {
  constructor() {
    // Singleton pattern - prevent multiple instances
    if (OTPService.instance) {
      console.log('🔄 Returning existing OTP Service singleton instance');
      return OTPService.instance;
    }

    console.log('🏗️ Creating NEW OTPService singleton instance');

    this.otpCache = new NodeCache({
      stdTTL: 300, // 5 minutes
      checkperiod: 60,
      useClones: false,
    });

    this.otpConfig = {
      length: 6,
    };

    // Add cache event listeners for debugging
    this.otpCache.on('set', (key, value) => {
      console.log(`📝 Cache SET - Key: ${key}, Value exists: ${!!value}`);
    });

    this.otpCache.on('get', (key, value) => {
      console.log(`📖 Cache GET - Key: ${key}, Found: ${!!value}`);
    });

    this.otpCache.on('del', (key, value) => {
      console.log(`🗑️ Cache DELETE - Key: ${key}`);
    });

    this.otpCache.on('expired', (key, value) => {
      console.log(`⏰ Cache EXPIRED - Key: ${key}`);
    });

    // Store the singleton instance
    OTPService.instance = this;
  }

  generateOTP(length = 6) {
    const digits = '0123456789';
    let otp = '';

    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, digits.length);
      otp += digits[randomIndex];
    }

    return otp;
  }

  validatePhoneNumber(phoneNumber) {
    console.log('🔍 === PHONE VALIDATION START ===');
    console.log('📱 Input phone number:', JSON.stringify(phoneNumber));
    console.log('📱 Type:', typeof phoneNumber);
    console.log('📱 Length:', phoneNumber?.length);

    const cleanNumber = phoneNumber.replace(/[^\d]/g, '');
    console.log('🧹 Cleaned number:', JSON.stringify(cleanNumber));
    console.log('🧹 Cleaned length:', cleanNumber.length);

    const indianMobileRegex = /^[6-9]\d{9}$/;
    const isValid = indianMobileRegex.test(cleanNumber);

    console.log('✅ Is valid format:', isValid);
    console.log('🔍 === PHONE VALIDATION END ===');

    if (!isValid) {
      throw new ApiError(HTTP_STATUS.CLIENT_ERROR.UNAUTHORIZED, ERROR_MESSAGES.VALIDATION.INVALID_PHONE);
    }

    return cleanNumber;
  }

  // Debug method to inspect cache
  debugCache() {
    console.log('\n🔍 === CACHE DEBUG START ===');
    console.log('🆔 OTP Service Instance:', this.constructor.name);
    console.log('🆔 Is Singleton?', this === OTPService.instance);

    const otpKeys = this.otpCache.keys();
    console.log('🗝️ All OTP cache keys:', otpKeys);
    console.log('📊 Total keys count:', otpKeys.length);

    if (otpKeys.length === 0) {
      console.log('❌ Cache is empty!');
    } else {
      otpKeys.forEach((key) => {
        const data = this.otpCache.get(key);
        const now = Date.now();
        console.log(`\n📝 === KEY: ${key} ===`);
        console.log('   Data exists:', !!data);
        if (data) {
          console.log('   Purpose:', data.purpose);
          console.log('   Created:', new Date(data.createdAt).toISOString());
          console.log('   Expires:', new Date(data.expiresAt).toISOString());
          console.log('   Is Expired:', now > data.expiresAt);
          console.log('   Time Left:', Math.ceil((data.expiresAt - now) / 1000), 'seconds');
          console.log('   Hash (first 8):', data.hashedOTP?.substring(0, 8) + '...');
        }
      });
    }

    console.log('🔍 === CACHE DEBUG END ===\n');
  }

  async sendOTP(phoneNumber, purpose = 'verification') {
    try {
      console.log('\n📤 === SEND OTP START ===');
      console.log('🆔 Service Instance Check:', this.constructor.name);
      console.log('🆔 Is Singleton?', this === OTPService.instance);
      console.log('📱 Raw input phone:', JSON.stringify(phoneNumber));
      console.log('🎯 Purpose:', purpose);

      const cleanPhoneNumber = this.validatePhoneNumber(phoneNumber);
      console.log('✅ Validated clean number:', cleanPhoneNumber);

      // Debug cache before checking existing OTP
      this.debugCache();

      // SIMPLIFIED: Remove existing OTP check and rate limiting
      // Just delete any existing OTP for this number to allow fresh sends
      const existingOTP = this.otpCache.get(cleanPhoneNumber);
      if (existingOTP) {
        console.log('🗑️ Removing existing OTP to allow fresh send');
        this.otpCache.del(cleanPhoneNumber);
      }

      const otp = this.generateOTP(this.otpConfig.length);
      const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

      console.log('🔐 Generated OTP:', otp);
      console.log('🔐 Hashed OTP (first 8):', hashedOTP.substring(0, 8) + '...');

      const message = `Your ServiceHub OTP is ${otp}. Use this code to verify your number. Do not share it with anyone.`;

      console.log('📨 Sending SMS to:', cleanPhoneNumber);
      const smsResult = await smsService.sendSMS(cleanPhoneNumber, message);
      console.log('📨 SMS sent, message ID:', smsResult.messageId);

      const otpData = {
        hashedOTP,
        purpose,
        createdAt: Date.now(),
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
        messageId: smsResult.messageId,
      };

      console.log('💾 === STORING OTP DATA ===');
      console.log('💾 Key:', JSON.stringify(cleanPhoneNumber));
      console.log('💾 Data structure:', {
        hashedOTP: otpData.hashedOTP.substring(0, 8) + '...',
        purpose: otpData.purpose,
        createdAt: new Date(otpData.createdAt).toISOString(),
        expiresAt: new Date(otpData.expiresAt).toISOString(),
        messageId: otpData.messageId,
      });

      // Store the data
      const setResult = this.otpCache.set(cleanPhoneNumber, otpData);
      console.log('💾 Cache set result:', setResult);

      // Immediately verify it was stored
      const verifyStored = this.otpCache.get(cleanPhoneNumber);
      console.log('✅ Immediate verification - Data stored:', !!verifyStored);

      if (!verifyStored) {
        console.error('❌ CRITICAL: Data was not stored in cache!');
        throw new Error('Failed to store OTP in cache');
      }

      // Debug cache after storing
      this.debugCache();

      console.log('📤 === SEND OTP SUCCESS ===');

      return {
        success: true,
        message: 'OTP sent successfully',
        phoneNumber: cleanPhoneNumber,
        expiresIn: 300,
        messageId: smsResult.messageId,
      };
    } catch (error) {
      console.error('❌ Send OTP error:', error);
      throw error;
    }
  }

  async verifyOTP(phoneNumber, providedOTP, purpose = 'verification') {
    try {
      console.log('\n🔍 === VERIFY OTP START ===');
      console.log('🆔 Service Instance Check:', this.constructor.name);
      console.log('🆔 Is Singleton?', this === OTPService.instance);
      console.log('📱 Raw input phone:', JSON.stringify(phoneNumber));
      console.log('🔐 Provided OTP:', JSON.stringify(providedOTP));
      console.log('🎯 Purpose:', purpose);

      const cleanPhoneNumber = this.validatePhoneNumber(phoneNumber);
      console.log('✅ Validated clean number:', cleanPhoneNumber);

      // Debug cache before retrieval
      this.debugCache();

      console.log('🔍 Attempting to get OTP data for key:', JSON.stringify(cleanPhoneNumber));
      const otpData = this.otpCache.get(cleanPhoneNumber);

      console.log('📝 === OTP DATA RETRIEVAL RESULT ===');
      console.log('📝 Data found:', !!otpData);
      console.log('📝 Data type:', typeof otpData);

      if (otpData) {
        console.log('📝 Data contents:', {
          hashedOTP: otpData.hashedOTP?.substring(0, 8) + '...',
          purpose: otpData.purpose,
          createdAt: new Date(otpData.createdAt).toISOString(),
          expiresAt: new Date(otpData.expiresAt).toISOString(),
          messageId: otpData.messageId,
        });
      }

      if (!otpData) {
        console.log('❌ No OTP data found in cache');

        // Additional debugging - check if there are any keys at all
        const allKeys = this.otpCache.keys();
        console.log('🔍 All cache keys for comparison:', allKeys);

        // Check for similar keys (in case of encoding issues)
        const similarKeys = allKeys.filter(
          (key) =>
            key.includes(cleanPhoneNumber) || cleanPhoneNumber.includes(key) || key.endsWith(cleanPhoneNumber.slice(-4))
        );
        console.log('🔗 Similar keys found:', similarKeys);

        return {
          success: false,
          error: 'OTP not found or expired. Please request a new OTP.',
          errorCode: 'OTP_EXPIRED',
        };
      }

      const now = Date.now();
      console.log('⏰ Time check - Now:', now, 'Expires:', otpData.expiresAt);
      console.log('⏰ Is expired:', now > otpData.expiresAt);

      if (now > otpData.expiresAt) {
        console.log('⏰ OTP has expired, deleting from cache');
        this.otpCache.del(cleanPhoneNumber);
        return {
          success: false,
          error: 'OTP has expired. Please request a new OTP.',
          errorCode: 'OTP_EXPIRED',
        };
      }

      console.log('🎯 Purpose check - Expected:', purpose, 'Actual:', otpData.purpose);
      if (otpData.purpose !== purpose) {
        return {
          success: false,
          error: 'Invalid OTP purpose.',
          errorCode: 'INVALID_PURPOSE',
        };
      }

      // SIMPLIFIED: Remove attempts check - allow unlimited verification attempts

      const hashedProvidedOTP = crypto.createHash('sha256').update(providedOTP.toString()).digest('hex');

      console.log('🔐 === HASH COMPARISON ===');
      console.log('🔐 Provided OTP:', providedOTP);
      console.log('🔐 Provided OTP type:', typeof providedOTP);
      console.log('🔐 Provided OTP string:', providedOTP.toString());
      console.log('🔐 Hashed provided (first 8):', hashedProvidedOTP.substring(0, 8) + '...');
      console.log('🔐 Stored hash (first 8):', otpData.hashedOTP.substring(0, 8) + '...');
      console.log('🔐 Full hashes match:', otpData.hashedOTP === hashedProvidedOTP);

      if (otpData.hashedOTP === hashedProvidedOTP) {
        console.log('✅ OTP verification successful!');
        this.otpCache.del(cleanPhoneNumber);

        return {
          success: true,
          message: 'OTP verified successfully',
          phoneNumber: cleanPhoneNumber,
          purpose,
        };
      } else {
        console.log('❌ OTP verification failed');
        // SIMPLIFIED: Don't increment attempts, just return error
        return {
          success: false,
          error: 'Invalid OTP. Please try again.',
          errorCode: 'INVALID_OTP',
        };
      }
    } catch (error) {
      console.error('❌ Verify OTP error:', error);
      throw error;
    } finally {
      console.log('🔍 === VERIFY OTP END ===\n');
    }
  }

  // Additional utility methods for debugging and management
  clearOTP(phoneNumber) {
    const cleanPhoneNumber = this.validatePhoneNumber(phoneNumber);
    return this.otpCache.del(cleanPhoneNumber);
  }

  clearAllOTPs() {
    this.otpCache.flushAll();
    console.log('🗑️ All OTPs cleared from cache');
  }

  getOTPInfo(phoneNumber) {
    const cleanPhoneNumber = this.validatePhoneNumber(phoneNumber);
    const otpData = this.otpCache.get(cleanPhoneNumber);

    if (!otpData) {
      return null;
    }

    return {
      exists: true,
      purpose: otpData.purpose,
      createdAt: new Date(otpData.createdAt).toISOString(),
      expiresAt: new Date(otpData.expiresAt).toISOString(),
      isExpired: Date.now() > otpData.expiresAt,
      timeRemaining: Math.max(0, Math.ceil((otpData.expiresAt - Date.now()) / 1000)),
    };
  }
}

// Create and export a singleton instance
const otpService = new OTPService();

// SIMPLIFIED: Rate limiters are bypassed but kept for compatibility
const createOTPRateLimit = () => {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000, // Very high limit to effectively disable
    message: {
      error: 'Rate limit exceeded (disabled in simplified mode)',
      errorCode: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req, res) => {
      const ip = normalizeIP(req);
      const phoneNumber = req.body.phoneNumber || req.query.phoneNumber || '';
      return `otp-send-${ip}-${phoneNumber}`;
    },
    skip: () => true, // Skip all rate limiting
  });
};

const createVerifyRateLimit = () => {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000, // Very high limit to effectively disable
    message: {
      error: 'Rate limit exceeded (disabled in simplified mode)',
      errorCode: 'RATE_LIMIT_EXCEEDED',
    },
    keyGenerator: (req, res) => {
      const ip = normalizeIP(req);
      const phoneNumber = req.body.phoneNumber || '';
      return `otp-verify-${ip}-${phoneNumber}`;
    },
    skip: () => true, // Skip all rate limiting
  });
};

const normalizeIP = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  const realIP = req.headers['x-real-ip'];
  const ip = forwarded
    ? forwarded.split(',')[0].trim()
    : realIP || req.connection.remoteAddress || req.socket.remoteAddress || req.ip;

  if (ip && ip.includes('::ffff:')) {
    return ip.replace('::ffff:', '');
  }

  return ip || 'unknown';
};

export default otpService;
export { otpService, OTPService, createOTPRateLimit, createVerifyRateLimit };

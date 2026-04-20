import bcrypt from 'bcryptjs';
import crypto from 'crypto';

import { User } from '../../models/auth/User.js';
import { VerificationToken } from '../../models/auth/VerificationToken.js';

class PasswordService {
  static async hashPassword(password) {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  }

  static async comparePassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  }

  static generateResetToken() {
    /*
    What is "hex"?
    ----------------
    - "hex" (hexadecimal) is a base-16 encoding format.
    - It uses characters: 0-9 and a-f.
    - Each byte becomes two hex characters.
    - So 32 random bytes become a 64-character string.
    - It is URL-safe and easy to store or send in emails.
  */
    const token = crypto.randomBytes(32).toString('hex');

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    /*
    What is SHA-256?
    ----------------
    - SHA-256 stands for Secure Hash Algorithm (256-bit).
    - It converts any input into a fixed 256-bit (32-byte) hash.
    - Output is always the same size regardless of input length.
    - It is one-way: original value cannot be derived back.
    - Used widely in passwords, tokens, blockchain, etc.

    Why hash the reset token?
    --------------------------
    - We send the plain token to the user via email.
    - But store only the hashed token in DB.
    - If DB leaks, attackers cannot use reset tokens.
    - During verification, we hash incoming token and compare.
  */
    return { token, hashedToken };
  }

  /**
   * Generate reset token and send to user via email/SMS
   */
  static async createResetRequest({ userId }) {
    const { token, hashedToken } = this.generateResetToken();

    // Remove existing token (one active token at a time)
    await VerificationToken.deleteMany({ user: userId });

    await VerificationToken.create({
      user: userId,
      token: hashedToken,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
    });

    return token; // return plain token (send via email/SMS)
  }

  static async verifyResetToken({ userId, token }) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const resetToken = await VerificationToken.findOne({
      user: userId,
      token: hashedToken,
      expiresAt: { $gt: Date.now() },
    });

    if (!resetToken) {
      throw new Error('Invalid or expired reset token');
    }

    return true;
  }

  /**
   * Reset password using token
   */
  static async resetPassword({ userId, token, newPassword }) {
    await this.verifyResetToken({ userId, token });

    const hashedPassword = await this.hashPassword(newPassword);

    await User.findByIdAndUpdate(userId, {
      password: hashedPassword,
      passwordChangedAt: new Date(),
    });

    // Delete token after successful reset
    await VerificationToken.deleteMany({ user: userId });

    return true;
  }

  /**
   * Change password (logged-in user)
   */
  static async changePassword({ userId, currentPassword, newPassword }) {
    const user = await User.findById(userId).select('+password');

    if (!user) {
      throw new Error('User not found');
    }

    const isMatch = await this.comparePassword(currentPassword, user.password);

    if (!isMatch) {
      throw new Error('Current password is incorrect');
    }

    user.password = await this.hashPassword(newPassword);
    user.passwordChangedAt = new Date();
    await user.save();

    return true;
  }
}

const passwordService = new PasswordService();

export default passwordService;

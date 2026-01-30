class PasswordService {
  static async hashPassword(password) {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  }

  static async comparePassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  }

  static generateResetToken() {
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    return { token, hashedToken };
  }

  static async createResetRequest({ userId }) {
    const { token, hashedToken } = this.generateResetToken();

    // Remove existing token (one active token at a time)
    await Token.deleteMany({ user: userId });

    await Token.create({
      user: userId,
      token: hashedToken,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
    });

    return token; // return plain token (send via email/SMS)
  }

  /**
   * Verify reset token
   */
  static async verifyResetToken({ userId, token }) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const resetToken = await Token.findOne({
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
    await Token.deleteMany({ user: userId });

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

module.exports = PasswordService;

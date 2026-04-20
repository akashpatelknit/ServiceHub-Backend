import mongoose from 'mongoose';

const verificationTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        'EMAIL_VERIFY', // Email verification on signup
        'RESET_PASSWORD', // Password reset
        'EMAIL_OTP', // OTP sent via email (for login/2FA)
        'PHONE_OTP', // OTP sent via SMS
        'TWO_FA', // 2FA token
      ],
      required: true,
      index: true,
    },

    tokenHash: {
      type: String,
      required: true,
      select: false,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    usedAt: { type: Date },
    isUsed: { type: Boolean, default: false },

    attempts: {
      type: Number,
      default: 0,
      max: 5, // Max 5 verification attempts
    },

    ipAddress: { type: String },
    userAgent: { type: String },

    purpose: {
      type: String,
      enum: ['LOGIN', 'REGISTRATION', 'PASSWORD_RESET', 'EMAIL_VERIFY', 'TRANSACTION'],
    },
  },
  {
    timestamps: true,
  }
);

verificationTokenSchema.index({ userId: 1, type: 1 });
verificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired tokens
verificationTokenSchema.index({ isUsed: 1, expiresAt: 1 });

// ── Methods ────────────────────────────────────
verificationTokenSchema.methods.isExpired = function () {
  return this.expiresAt < Date.now();
};

verificationTokenSchema.methods.canAttempt = function () {
  return this.attempts < 5 && !this.isExpired() && !this.isUsed;
};

verificationTokenSchema.methods.incrementAttempts = async function () {
  this.attempts += 1;
  await this.save();
};

verificationTokenSchema.methods.markAsUsed = async function () {
  this.isUsed = true;
  this.usedAt = new Date();
  await this.save();
};

// ── Statics: Cleanup old tokens ───────────────
verificationTokenSchema.statics.cleanupExpired = async function () {
  return this.deleteMany({
    expiresAt: { $lt: Date.now() },
  });
};

verificationTokenSchema.statics.cleanupUsed = async function () {
  // Delete used tokens older than 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return this.deleteMany({
    isUsed: true,
    usedAt: { $lt: sevenDaysAgo },
  });
};

export const VerificationToken = mongoose.model('VerificationToken', verificationTokenSchema);

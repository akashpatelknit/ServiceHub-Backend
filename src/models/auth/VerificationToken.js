import mongoose from 'mongoose';

const verificationTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    type: {
      type: String,
      enum: ['EMAIL_VERIFY', 'RESET_PASSWORD', 'LOGIN_OTP', 'TWO_FA'],
      required: true,
    },

    tokenHash: {
      type: String,
      required: true,
      select: false,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    usedAt: { type: Date },
  },
  { timestamps: true }
);

verificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const VerificationToken = mongoose.model('VerificationToken', verificationTokenSchema);

import mongoose from 'mongoose';

const authProviderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    provider: {
      type: String,
      enum: ['LOCAL', 'GOOGLE', 'GITHUB', 'APPLE'],
      required: true,
    },

    providerUserId: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

authProviderSchema.index({ userId: 1, provider: 1 }, { unique: true });

authProviderSchema.index({ provider: 1, providerUserId: 1 }, { unique: true });

export const AuthProvider = mongoose.model('AuthProvider', authProviderSchema);

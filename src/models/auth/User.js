import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },

    phone: {
      type: String,
      sparse: true, // Allow null but unique if set
      unique: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: function () {
        return this.authProvider === 'LOCAL';
      },
      select: false,
    },

    passwordChangedAt: { type: Date },

    userType: {
      type: String,
      enum: ['CUSTOMER', 'VENDOR', 'ADMIN'],
      required: true,
      index: true,
    },

    // Account Status
    status: {
      type: String,
      enum: ['ACTIVE', 'PENDING', 'BLOCKED', 'SUSPENDED'], // ✅ ADD: SUSPENDED
      default: 'PENDING',
      index: true,
    },

    isEmailVerified: { type: Boolean, default: false },
    emailVerifiedAt: { type: Date },
    isPhoneVerified: { type: Boolean, default: false },
    phoneVerifiedAt: { type: Date },

    lastLoginAt: { type: Date },
    lastLoginIP: { type: String },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },

    isDeleted: { type: Boolean, default: false }, // Soft delete
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userSchema.index({ email: 1, userType: 1 });
userSchema.index({ status: 1, userType: 1 });
userSchema.index({ isDeleted: 1 });

// A virtual field in Mongoose is a computed property that is not stored in MongoDB.
// It is calculated dynamically using schema  data when accessed.
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.methods.incrementLoginAttempts = async function () {
  // If lock has expired, reset attempts
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 };
  }

  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = async function () {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

export const User = mongoose.model('User', userSchema);

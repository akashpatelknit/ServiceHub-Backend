import mongoose from 'mongoose';

const profileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    type: {
      type: String,
      enum: ['CUSTOMER', 'VENDOR', 'ADMIN'],
      required: true,
      index: true,
    },

    firstName: {
      type: String,
      trim: true,
      required: function () {
        return this.type === 'VENDOR';
      },
    },

    lastName: {
      type: String,
      trim: true,
      required: function () {
        return this.type === 'VENDOR';
      },
    },

    dateOfBirth: {
      type: Date,
      required: function () {
        return this.type === 'VENDOR';
      },
    },

    profilePicture: { type: String },
    bio: { type: String, maxLength: 500 },

    // ── Address ────────────────────────────────
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      pinCode: {
        type: String,
        match: [/^\d{6}$/, 'PIN code must be 6 digits'],
      },
      country: { type: String, default: 'India' },
    },

    // ── Contact ────────────────────────────────
    alternatePhone: { type: String },
    whatsappNumber: { type: String },

    // ── Social Links ───────────────────────────
    socialLinks: {
      website: { type: String },
      linkedin: { type: String },
      twitter: { type: String },
      instagram: { type: String },
    },

    // ── Preferences ────────────────────────────
    language: {
      type: String,
      enum: ['en', 'hi', 'ta', 'te', 'kn', 'ml'],
      default: 'en',
    },

    timezone: { type: String, default: 'Asia/Kolkata' },

    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
    },

    // ── Verification & Approval ────────────────
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    }, // Overall verification status

    approvedByAdmin: {
      type: Boolean,
      default: false,
      index: true,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    approvedAt: { type: Date },

    completionPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    lastCompletedStep: {
      type: String,
      enum: ['BASIC_INFO', 'BUSINESS_INFO', 'ADDRESS', 'DOCUMENTS', 'COMPLETE'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ────────────────────────────────────
profileSchema.index({ type: 1, isVerified: 1 });
profileSchema.index({ type: 1, approvedByAdmin: 1 });
profileSchema.index({ completionPercentage: 1 });

// ── Virtual: Full Name ─────────────────────────
profileSchema.virtual('fullName').get(function () {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.firstName || this.companyName || 'User';
});

// ── Methods: Calculate Completion ──────────────
profileSchema.methods.calculateCompletion = function () {
  if (this.type !== 'VENDOR') {
    // For customers, simpler requirements
    const fields = ['firstName', 'lastName'];
    const filled = fields.filter((f) => this[f]).length;
    this.completionPercentage = Math.round((filled / fields.length) * 100);
    return this.completionPercentage;
  }

  // For vendors, more fields required
  const requiredFields = [
    'firstName',
    'lastName',
    'dateOfBirth',
    'companyName',
    'gstNumber',
    'panNumber',
    'address.street',
    'address.city',
    'address.state',
    'address.pinCode',
  ];

  let filledCount = 0;

  requiredFields.forEach((field) => {
    const keys = field.split('.');
    let value = this;

    for (const key of keys) {
      value = value?.[key];
    }

    if (value) filledCount++;
  });

  this.completionPercentage = Math.round((filledCount / requiredFields.length) * 100);
  return this.completionPercentage;
};

profileSchema.methods.getMissingFields = function () {
  if (this.type !== 'VENDOR') {
    const required = ['firstName', 'lastName'];
    return required.filter((f) => !this[f]);
  }

  const required = [
    { field: 'firstName', label: 'First Name' },
    { field: 'lastName', label: 'Last Name' },
    { field: 'dateOfBirth', label: 'Date of Birth' },
    { field: 'companyName', label: 'Company Name' },
    { field: 'gstNumber', label: 'GST Number' },
    { field: 'panNumber', label: 'PAN Number' },
    { field: 'address.street', label: 'Street Address' },
    { field: 'address.city', label: 'City' },
    { field: 'address.state', label: 'State' },
    { field: 'address.pinCode', label: 'PIN Code' },
  ];

  return required.filter(({ field }) => {
    const keys = field.split('.');
    let value = this;
    for (const key of keys) {
      value = value?.[key];
    }
    return !value;
  });
};

// ── Pre-save Hook: Auto-calculate completion ───
profileSchema.pre('save', function (next) {
  if (this.isModified()) {
    this.calculateCompletion();
  }
  next();
});

export const Profile = mongoose.model('Profile', profileSchema);

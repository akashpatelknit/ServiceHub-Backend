export function withReferral(schema, selfRef) {
  schema.add({
    referralCode: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      uppercase: true,
      validate: {
        validator: (v) => !v || /^[A-Z0-9]{6,10}$/.test(v),
        message: 'Referral code must be 6-10 uppercase alphanumeric characters',
      },
    },
    referredBy: {
      type: 'ObjectId',
      ref: selfRef,
    },
    referredUsers: [
      {
        type: 'ObjectId',
        ref: selfRef,
      },
    ],
    referralReward: {
      type: Number,
      default: 0,
      min: [0, 'Referral reward cannot be negative'],
    },
  });
}

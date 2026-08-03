import mongoose from 'mongoose';
import { PLATFORMS, ACTOR_MODELS } from '../constants/enums.js';

const deviceTokenSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'ownerModel',
      index: true,
    },
    ownerModel: {
      type: String,
      required: true,
      enum: ACTOR_MODELS,
    },

    token: {
      type: String,
      required: [true, 'FCM token is required'],
      trim: true,
    },
    deviceId: {
      type: String,
      trim: true,
    },
    deviceName: {
      type: String,
      trim: true,
    },
    platform: {
      type: String,
      enum: PLATFORMS,
    },

    isActive: { type: Boolean, default: true, index: true },
    lastUsed: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

deviceTokenSchema.index({ owner: 1, token: 1 }, { unique: true });
deviceTokenSchema.index({ owner: 1, isActive: 1 });

deviceTokenSchema.statics.deactivateOthers = function (ownerId, ownerModel, currentToken) {
  return this.updateMany({ owner: ownerId, ownerModel, token: { $ne: currentToken } }, { $set: { isActive: false } });
};

export const DeviceToken = mongoose.model('DeviceToken', deviceTokenSchema);

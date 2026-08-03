import { Schema } from 'mongoose';

// Structured image reference shared by every catalog level. `key` is the R2 object key
// (needed to delete/replace the object later), `url` is the public URL served to
// clients — never store a bare link with no handle back to the underlying object.
export const imageSchema = new Schema(
  {
    key: {
      type: String,
      required: [true, 'Image key is required'],
      trim: true,
    },
    url: {
      type: String,
      required: [true, 'Image url is required'],
      trim: true,
    },
  },
  { _id: false }
);

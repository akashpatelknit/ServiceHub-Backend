import { z } from 'zod';
import { ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_SIZE_BYTES, CATALOG_MEDIA_FOLDERS } from '../constants/catalog.constants.js';

export const presignedUploadUrlSchema = {
  body: z.object({
    entity: z.enum(Object.keys(CATALOG_MEDIA_FOLDERS)),
    fileType: z.enum(ALLOWED_IMAGE_MIME_TYPES),
    fileSize: z
      .number()
      .positive()
      .max(MAX_IMAGE_SIZE_BYTES, `File exceeds max size of ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB`),
  }),
};

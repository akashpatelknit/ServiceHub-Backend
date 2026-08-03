import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';
import r2Client from '../../../config/r2Config.js';
import config from '../../../config/config.js';
import { ApiError } from '../../../utils/index.js';
import { CATALOG_MEDIA_FOLDERS, ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_SIZE_BYTES } from '../constants/catalog.constants.js';

const PRESIGN_EXPIRY_SECONDS = 60;

export const MediaService = {
  // Admin calls this to get a short-lived URL to PUT the file straight to R2 from the
  // client — the file itself never passes through this server. The returned `key`/`url`
  // pair is what gets stored on the catalog document once the upload completes.
  async generatePresignedUploadUrl({ entity, fileType, fileSize }) {
    const folder = CATALOG_MEDIA_FOLDERS[entity];
    if (!folder) {
      throw new ApiError(400, `Invalid entity type: ${entity}`);
    }

    if (!ALLOWED_IMAGE_MIME_TYPES.includes(fileType)) {
      throw new ApiError(400, `Invalid file type. Allowed: ${ALLOWED_IMAGE_MIME_TYPES.join(', ')}`);
    }

    if (fileSize > MAX_IMAGE_SIZE_BYTES) {
      throw new ApiError(400, `File exceeds max size of ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB`);
    }

    const extension = fileType.split('/')[1];
    const key = `service-catalog/${folder}/${uuid()}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: config.R2_BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: PRESIGN_EXPIRY_SECONDS });
    const url = `${config.R2_PUBLIC_URL}/${key}`;

    return { uploadUrl, key, url, expiresIn: PRESIGN_EXPIRY_SECONDS };
  },
};

import { PutObjectCommand } from '@aws-sdk/client-s3';
import config from '../../config/config.js';
import r2Client from '../../config/r2Config.js';

// Server-side upload of an already-generated buffer (e.g. a PDF invoice) straight to
// R2. Distinct from KycService.generateDocumentUploadUrl, which only presigns a URL
// for the *client* to PUT to directly — this one is for content the server itself
// produces and needs to persist.
export const uploadBufferToR2 = async ({ key, buffer, contentType }) => {
  const command = new PutObjectCommand({
    Bucket: config.R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await r2Client.send(command);

  return { key, url: `${config.R2_PUBLIC_URL}/${key}` };
};

import { S3Client } from '@aws-sdk/client-s3';
import config from './config.js';

// Cloudflare R2 exposes an S3-compatible API, so the same @aws-sdk/client-s3 client
// works against it — only the endpoint/region differ from real AWS S3.
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: config.R2_ACCESS_KEY_ID,
    secretAccessKey: config.R2_SECRET_ACCESS_KEY,
  },
});

export default r2Client;

// One-off CLI script to configure CORS on the R2 bucket so browser-based apps
// (service-hub-vendor-web) can PUT documents directly to presigned upload URLs.
// The existing Expo vendor app never needed this — React Native's fetch() isn't
// subject to browser CORS preflight, only actual browsers are — so this bucket's
// CORS policy was simply never set up until a browser client needed it.
//
// Usage:
//   node scripts/setR2Cors.mjs
//   node scripts/setR2Cors.mjs --origin https://vendor.servicehub.example.com   (repeatable, adds to the dev-port defaults)

import { GetBucketCorsCommand, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import config from '../src/config/config.js';
import r2Client from '../src/config/r2Config.js';

const DEFAULT_DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];

function parseExtraOrigins() {
  const origins = [];
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--origin' && args[i + 1]) origins.push(args[i + 1]);
  }
  return origins;
}

async function main() {
  const allowedOrigins = [...DEFAULT_DEV_ORIGINS, ...parseExtraOrigins()];

  console.log(`Bucket: ${config.R2_BUCKET_NAME}`);
  let preexistingRules = [];
  try {
    const existing = await r2Client.send(new GetBucketCorsCommand({ Bucket: config.R2_BUCKET_NAME }));
    preexistingRules = existing.CORSRules ?? [];
    console.log('Existing CORS rules (preserved below, not replaced):', JSON.stringify(preexistingRules, null, 2));
  } catch (error) {
    if (error.name === 'NoSuchCORSConfiguration') {
      console.log('No existing CORS configuration (expected — first time this is being set).');
    } else {
      throw error;
    }
  }

  // PutBucketCors REPLACES the whole configuration, it doesn't merge — so any
  // pre-existing rule (set out-of-band, e.g. via the Cloudflare dashboard) must be
  // carried forward explicitly here, or this call would silently delete it. Rerunning
  // this script is idempotent: it replaces only the rule it previously added (matched
  // by AllowedMethods, our rule's fingerprint) rather than appending a duplicate.
  const newRule = {
    AllowedOrigins: allowedOrigins,
    AllowedMethods: ['PUT', 'GET', 'HEAD'],
    AllowedHeaders: ['*'],
    ExposeHeaders: ['ETag'],
    MaxAgeSeconds: 3600,
  };
  const isOurPreviousRule = (rule) =>
    JSON.stringify([...rule.AllowedMethods].sort()) === JSON.stringify([...newRule.AllowedMethods].sort()) &&
    rule.AllowedHeaders?.includes('*');
  const corsRules = [...preexistingRules.filter((rule) => !isOurPreviousRule(rule)), newRule];

  await r2Client.send(
    new PutBucketCorsCommand({
      Bucket: config.R2_BUCKET_NAME,
      CORSConfiguration: { CORSRules: corsRules },
    }),
  );

  console.log('Applied CORS rules:', JSON.stringify(corsRules, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to set R2 bucket CORS:', error);
    process.exit(1);
  });

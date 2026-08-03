import dotenvFlow from 'dotenv-flow';

dotenvFlow.config();

export default {
  // General
  ENV: process.env.ENV,
  PORT: process.env.PORT,
  SERVER_URL: process.env.SERVER_URL,
  NODE_ENV: process.env.NODE_ENV,

  // Frontend
  FRONTEND_URL: process.env.FRONTEND_URL,

  // Email Service
  EMAIL_API_KEY: process.env.EMAIL_API_KEY,
  EMAIL_APP_PASSWORD: process.env.EMAIL_APP_PASSWORD,
  SENDER_EMAIL: process.env.SENDER_EMAIL,

  // Database
  DATABASE_URL: process.env.DATABASE_URL,

  // Redis (auth token blacklist)
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  // Access Token — fed straight into jwt.sign's `expiresIn` (accepts "15m" or a number of seconds)
  ACCESS_TOKEN: {
    SECRET: process.env.ACCESS_TOKEN_SECRET,
    EXPIRY: process.env.ACCESS_TOKEN_EXPIRY || '15m',
  },

  // Refresh Token
  REFRESH_TOKEN: {
    SECRET: process.env.REFRESH_TOKEN_SECRET,
    EXPIRY: process.env.REFRESH_TOKEN_EXPIRY || '7d',
  },

  ACCOUNT_SID: process.env.ACCOUNT_SID,
  AUTH_TOKEN: process.env.AUTH_TOKEN,
  TWILIO_NUMBER: process.env.TWILIO_NUMBER,

  GOOGLE_MAP_API_KEY: process.env.GOOGLE_MAP_API_KEY,

  // razorpay
  RAZORPAY_SECRET: process.env.RAZORPAY_SECRET,
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,

  // Firebase
  FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,

  // Firebase Admin SDK
  FIREBASE_PRIVATE_KEY_ID: process.env.FIREBASE_PRIVATE_KEY_ID,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_CLIENT_ID: process.env.FIREBASE_CLIENT_ID,
  FIREBASE_AUTH_URI: process.env.FIREBASE_AUTH_URI,
  FIREBASE_TOKEN_URI: process.env.FIREBASE_TOKEN_URI,
  FIREBASE_AUTH_PROVIDER_X509_CERT_URL: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  FIREBASE_CLIENT_X509_CERT_URL: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  FIREBASE_UNIVERSE_DOMAIN: process.env.FIREBASE_UNIVERSE_DOMAIN,

  // Messages
  SMS_BASE_URL: process.env.SMS_BASE_URL,
  SMS_USER: process.env.SMS_USER,
  SMS_PASSWORD: process.env.SMS_PASSWORD,
  SMS_SENDER_ID: process.env.SMS_SENDER_ID,
  SMS_CHANNEL: process.env.SMS_CHANNEL,
  SMS_ROUTE: process.env.SMS_ROUTE,

  // AWS
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
  AWS_CLOUDFRONT_URL: process.env.AWS_CLOUDFRONT_URL,
  AWS_REGION: process.env.AWS_REGION,

  // Cloudflare R2 (service-catalog media — presigned direct uploads)
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
  R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
};

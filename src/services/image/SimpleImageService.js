import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import crypto from 'crypto';
import path from 'path';
import config from '../../config/config.js';

// Whitelisted so a client can't inject an arbitrary S3 key prefix via the `folder` field.
const ALLOWED_UPLOAD_FOLDERS = ['products', 'kyc-documents'];

const bucketName = config.AWS_S3_BUCKET_NAME;
const region = config.AWS_REGION;
const accessKeyId = config.AWS_ACCESS_KEY_ID;
const secretAccessKey = config.AWS_SECRET_ACCESS_KEY;

const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

class SimpleImageService {
  constructor() {
    this.productConfig = {
      sizes: [{ quality: 90, suffix: 'original' }],
      folder: 'products',
      allowedFormats: ['jpeg', 'jpg', 'png', 'webp'],
      maxFileSize: 10 * 1024 * 1024, // 10MB
    };
  }

  generateFileName(originalName, suffix = '') {
    const timestamp = Date.now();
    const random = crypto.randomBytes(6).toString('hex');
    const ext = path.extname(originalName).toLowerCase();
    const name = path.basename(originalName, ext).replace(/[^a-zA-Z0-9]/g, '');

    return suffix ? `${name}_${timestamp}_${random}_${suffix}${ext}` : `${name}_${timestamp}_${random}${ext}`;
  }

  async optimizeImage(buffer, sizeConfig) {
    try {
      let image = sharp(buffer);

      // Check if image has alpha channel (transparency)
      const metadata = await image.metadata();
      const hasAlpha = metadata.hasAlpha;

      // No resizing - keep original dimensions

      // Use PNG for images with transparency, JPEG for others
      let optimizedBuffer;
      let contentType;

      if (hasAlpha) {
        // Use PNG to preserve transparency
        optimizedBuffer = await image
          .png({
            quality: sizeConfig.quality,
            compressionLevel: 9,
          })
          .toBuffer();
        contentType = 'image/png';
      } else {
        // Use JPEG for images without transparency
        optimizedBuffer = await image
          .jpeg({
            quality: sizeConfig.quality,
            progressive: true,
          })
          .toBuffer();
        contentType = 'image/jpeg';
      }

      return { buffer: optimizedBuffer, contentType };
    } catch (error) {
      throw new Error(`Image optimization failed: ${error.message}`);
    }
  }

  async uploadToS3(imageBuffer, fileName, contentType) {
    const uploadParams = {
      Bucket: bucketName,
      Body: imageBuffer,
      Key: fileName,
      ContentType: contentType,
      CacheControl: 'max-age=31536000', // 1 year cache
    };

    try {
      await s3Client.send(new PutObjectCommand(uploadParams));
      const imageUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${fileName}`;

      return {
        url: imageUrl,
        key: fileName,
      };
    } catch (error) {
      throw new Error(`S3 upload failed: ${error.message}`);
    }
  }

  extractUrls(response) {
    return response.successful.flatMap((item) => item);
  }

  async processImage(file, folder = this.productConfig.folder) {
    const urls = [];

    try {
      for (const sizeConfig of this.productConfig.sizes) {
        const { buffer: optimizedBuffer, contentType } = await this.optimizeImage(file.buffer, sizeConfig);

        // Adjust file extension based on content type
        const ext = contentType === 'image/png' ? '.png' : '.jpg';
        const originalExt = path.extname(file.originalname);
        const fileNameWithoutExt = file.originalname.replace(originalExt, '');
        const fileNameForGeneration = fileNameWithoutExt + ext;

        const fileName = `${folder}/${sizeConfig.suffix}/${this.generateFileName(
          fileNameForGeneration,
          sizeConfig.suffix
        )}`;

        const uploadResult = await this.uploadToS3(optimizedBuffer, fileName, contentType);
        urls.push(uploadResult.url);
      }

      return urls;
    } catch (error) {
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  async processMultipleImages(files) {
    const results = [];

    for (const file of files) {
      try {
        const imageResults = await this.processImage(file);
        console.log(imageResults);
        results.push(imageResults);
      } catch (error) {
        results.push({
          originalName: file.originalname,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  async processAndUploadImages(file, folder = this.productConfig.folder) {
    if (!file || !file.buffer) {
      throw new Error('Invalid file provided');
    }

    if (file.size > this.productConfig.maxFileSize) {
      throw new Error(`File size exceeds limit of ${this.productConfig.maxFileSize / (1024 * 1024)}MB`);
    }

    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (!this.productConfig.allowedFormats.includes(ext)) {
      throw new Error(`Invalid file format. Allowed: ${this.productConfig.allowedFormats.join(', ')}`);
    }

    return await this.processImage(file, folder);
  }

  async batchUploadImages(files, folder = this.productConfig.folder) {
    if (!files || files.length === 0) {
      throw new Error('No files provided');
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const imageResults = await this.processAndUploadImages(files[i], folder);
        console.log(imageResults);
        results.push(imageResults[0]);
      } catch (error) {
        errors.push({
          index: i,
          originalName: files[i].originalname,
          error: error.message,
        });
      }
    }

    return {
      successful: results,
      failed: errors,
      totalProcessed: files.length,
      successCount: results.length,
      errorCount: errors.length,
    };
  }

  async uploadSingleImage(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
        });
      }

      const folder = ALLOWED_UPLOAD_FOLDERS.includes(req.body?.folder) ? req.body.folder : this.productConfig.folder;
      const results = await this.processAndUploadImages(req.file, folder);

      res.status(200).json({
        success: true,
        message: 'Image uploaded successfully',
        data: {
          originalName: req.file.originalname,
          url: results[0],
        },
      });
    } catch (error) {
      console.error('Image upload error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload image',
        details: error.message,
      });
    }
  }

  async uploadMultipleImages(req, res, next) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No files uploaded',
        });
      }

      const folder = ALLOWED_UPLOAD_FOLDERS.includes(req.body?.folder) ? req.body.folder : this.productConfig.folder;
      const results = await this.batchUploadImages(req.files, folder);

      res.status(200).json({
        success: true,
        message: `Processed ${results.totalProcessed} images`,
        data: {
          urls: this.extractUrls(results),
        },
      });
    } catch (error) {
      console.error('Multiple image upload error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload images',
        details: error.message,
      });
    }
  }

  async processAndUploadSingleImage(file, folder = this.productConfig.folder) {
    const urls = [];

    for (const sizeConfig of this.productConfig.sizes) {
      const { buffer: optimizedBuffer, contentType } = await this.optimizeImage(file.buffer, sizeConfig);

      // Adjust file extension based on content type
      const ext = contentType === 'image/png' ? '.png' : '.jpg';
      const originalExt = path.extname(file.originalname);
      const fileNameWithoutExt = file.originalname.replace(originalExt, '');
      const fileNameForGeneration = fileNameWithoutExt + ext;

      const fileName = `${folder}/${sizeConfig.suffix}/${this.generateFileName(
        fileNameForGeneration,
        sizeConfig.suffix
      )}`;

      const imageUrl = await this.uploadToS3(optimizedBuffer, fileName, contentType);
      urls.push(imageUrl);
    }

    return urls;
  }

  async processAndUploadMultipleImages(files, folder = this.productConfig.folder) {
    if (!files || files.length === 0) {
      throw new Error('No files provided');
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const urls = await this.processAndUploadSingleImage(files[i], folder);
        results.push(urls[0]);
      } catch (error) {
        errors.push({
          index: i,
          originalName: files[i].originalname,
          error: error.message,
        });
      }
    }

    return {
      successful: results,
      failed: errors,
      totalProcessed: files.length,
      successCount: results.length,
      errorCount: errors.length,
    };
  }
}

const simpleImageService = new SimpleImageService();

export default simpleImageService;

export const uploadSingleImage = simpleImageService.uploadSingleImage.bind(simpleImageService);
export const uploadMultipleImages = simpleImageService.uploadMultipleImages.bind(simpleImageService);

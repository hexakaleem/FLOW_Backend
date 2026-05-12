import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config';

if (config.cloudinary.url && config.cloudinary.url !== '') {
  cloudinary.config({
    url: config.cloudinary.url,
    secure: true,
  });
}

interface UploadOptions {
  folder: string;
  publicId?: string;
}

interface UploadResult {
  url: string;
  publicId: string;
}

export function uploadToCloudinary(
  fileBuffer: Buffer,
  options: UploadOptions,
): Promise<UploadResult> {
  if (!config.cloudinary.url) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_URL in .env');
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        public_id: options.publicId,
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        if (!result) {
          reject(new Error('Cloudinary upload returned no result'));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      },
    );

    uploadStream.end(fileBuffer);
  });
}

export function generateSignedUrl(publicId: string, ttlSeconds = 3600): string {
  return cloudinary.url(publicId, {
    secure: true,
    sign_url: true,
    expires_at: Math.floor(Date.now() / 1000) + ttlSeconds,
  });
}
